import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createTestDb } from "./db";

const root = join(import.meta.dirname, "..", "..");
const migration = "20261128000007_topics.sql";
const T = "00000000-0000-0000-0000-0000000000a1";
const S = "00000000-0000-0000-0000-0000000000b1";
const GRADE = "10000000-0000-0000-0000-000000000001";
const UNIT = "20000000-0000-0000-0000-000000000001";
const LESSON = "30000000-0000-0000-0000-000000000001";
const NEXT_LESSON = "30000000-0000-0000-0000-000000000002";
const user = (userId: string) => ({ kind: "user", userId }) as const;
let db: PGlite;

beforeAll(async () => {
  db = await createTestDb({ seed: false, stopBefore: migration });
  await db.exec(`
    insert into public.grade_levels (id, code, number, title_ar, title_en, editions)
    values ('${GRADE}', 'g11', 11, 'الصف الثاني الثانوي', 'Grade 11', array['ar','en']::public.edition[]);
    insert into public.units (id, grade_level_id, code, title_en, domain)
    values ('${UNIT}', '${GRADE}', '1', 'Unit one', 'programming');
    insert into public.lessons (id, unit_id, code, title_en, position)
    values ('${LESSON}', '${UNIT}', '1-1', 'Existing lesson', 1);
  `);
  await db.exec(readFileSync(join(root, "supabase", "migrations", migration), "utf8"));
  await db.exec(`
    insert into auth.users (id) values ('${T}'), ('${S}');
    insert into public.profiles (user_id, role) values ('${T}', 'teacher'), ('${S}', 'student');
  `);
});

afterAll(async () => {
  await db.close();
});

describe("lesson topics migration", () => {
  it("backfills one bilingual default topic for lessons that already existed", async () => {
    const rows = await db.query<{ title_ar: string | null; title_en: string }>(
      "select title_ar, title_en from public.topics where lesson_id = $1",
      [LESSON],
    );
    expect(rows.rows).toEqual([{ title_ar: "عام", title_en: "General" }]);
  });

  it("creates a default topic automatically for a new lesson", async () => {
    await db.query("insert into public.lessons (id, unit_id, code, title_en) values ($1, $2, '1-2', 'New lesson')", [
      NEXT_LESSON,
      UNIT,
    ]);
    const rows = await db.query<{ title_ar: string | null; title_en: string }>(
      "select title_ar, title_en from public.topics where lesson_id = $1",
      [NEXT_LESSON],
    );
    expect(rows.rows).toEqual([{ title_ar: "عام", title_en: "General" }]);
  });

  it("allows teachers to manage topics while students can only read them", async () => {
    const topicId = (await db.query<{ id: string }>("select id from public.topics where lesson_id = $1", [LESSON])).rows[0]!.id;
    await as(db, user(S), async () => {
      expect((await db.query("select id from public.topics where id = $1", [topicId])).rows).toHaveLength(1);
      await expect(
        db.query("insert into public.topics (lesson_id, title_en) values ($1, 'Student topic')", [LESSON]),
      ).rejects.toThrow();
      await db.query("update public.topics set title_en = 'Student edit' where id = $1", [topicId]);
      expect((await db.query<{ title_en: string }>("select title_en from public.topics where id = $1", [topicId])).rows[0]?.title_en).toBe("General");
      await db.query("delete from public.topics where id = $1", [topicId]);
      expect((await db.query("select id from public.topics where id = $1", [topicId])).rows).toHaveLength(1);
    });
    await as(db, user(T), async () => {
      await db.query("update public.topics set title_en = 'Foundations' where id = $1", [topicId]);
      expect((await db.query<{ title_en: string }>("select title_en from public.topics where id = $1", [topicId])).rows[0]?.title_en).toBe("Foundations");
    });
  });
});
