import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, count, createTestDb } from "./db";

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const U = { teacher: id(1), a: id(2), b: id(3), c: id(4), parentA: id(5), parentX: id(6) };
const S = { a: id(12), b: id(13), c: id(14) };
const P = { a: id(15), x: id(16) };
const G = { one: id(21), two: id(22), g10: id(23) };
const SESSION = { one: id(31), two: id(32) };
const M = { open: id(41), future: id(42), groupTwo: id(43), g10Only: id(44), arOnly: id(45), note: id(46) };

const user = (userId: string) => ({ kind: "user", userId }) as const;
let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into auth.users (id) values ('${U.teacher}'),('${U.a}'),('${U.b}'),('${U.c}'),('${U.parentA}'),('${U.parentX}');
    insert into public.profiles (user_id, role) values
      ('${U.teacher}','teacher'),('${U.a}','student'),('${U.b}','student'),('${U.c}','student'),('${U.parentA}','parent'),('${U.parentX}','parent');
    insert into public.groups (id, name, grade_level_id, edition, venue)
      select '${G.one}','One', id,'en','online' from public.grade_levels where code='g11';
    insert into public.groups (id, name, grade_level_id, edition, venue)
      select '${G.two}','Two', id,'en','offline' from public.grade_levels where code='g11';
    insert into public.groups (id, name, grade_level_id, edition, venue)
      select '${G.g10}','Ten', id,'en','offline' from public.grade_levels where code='g10';
    insert into public.students (id, display_name, grade_level_id, group_id, venue, edition)
      select '${S.a}','A', id,'${G.one}','online','en' from public.grade_levels where code='g11';
    insert into public.students (id, display_name, grade_level_id, group_id, venue, edition)
      select '${S.b}','B', id,'${G.two}','offline','en' from public.grade_levels where code='g11';
    insert into public.students (id, display_name, grade_level_id, group_id, venue, edition)
      select '${S.c}','C', id,'${G.g10}','offline','en' from public.grade_levels where code='g10';
    insert into public.parents (id, phone_e164) values ('${P.a}','+201000000011'),('${P.x}','+201000000012');
    insert into public.guardianships (parent_id, student_id) values ('${P.a}','${S.a}');
    insert into public.account_links (user_id, subject_type, subject_id, method) values
      ('${U.a}','student','${S.a}','code'),('${U.b}','student','${S.b}','code'),('${U.c}','student','${S.c}','code'),
      ('${U.parentA}','parent','${P.a}','code'),('${U.parentX}','parent','${P.x}','code');

    -- Sessions: group one is running now with an open code; group two has its own code.
    insert into public.class_sessions (id, group_id, starts_at, ends_at, checkin_code, checkin_expires_at) values
      ('${SESSION.one}','${G.one}', now() - interval '5 minutes', now() + interval '85 minutes', '1111', now() + interval '10 minutes'),
      ('${SESSION.two}','${G.two}', now() - interval '5 minutes', now() + interval '85 minutes', '2222', now() + interval '10 minutes');

    -- Materials (all Grade 11 unless noted).
    insert into public.materials (id, title, kind, url, body, grade_level_id, edition, release_at)
      select '${M.open}','Open','link','https://example.com/a',null,id,null,null from public.grade_levels where code='g11';
    insert into public.materials (id, title, kind, url, body, grade_level_id, edition, release_at)
      select '${M.future}','Future','link','https://example.com/b',null,id,null, now() + interval '1 day' from public.grade_levels where code='g11';
    insert into public.materials (id, title, kind, url, body, grade_level_id, edition, release_at)
      select '${M.groupTwo}','Group two only','link','https://example.com/c',null,id,null,null from public.grade_levels where code='g11';
    insert into public.material_groups (material_id, group_id) values ('${M.groupTwo}','${G.two}');
    insert into public.materials (id, title, kind, url, body, grade_level_id, edition, release_at)
      select '${M.g10Only}','Grade 10','link','https://example.com/d',null,id,null,null from public.grade_levels where code='g10';
    insert into public.materials (id, title, kind, url, body, grade_level_id, edition, release_at)
      select '${M.arOnly}','Arabic edition','link','https://example.com/e',null,id,'ar',null from public.grade_levels where code='g11';
    insert into public.materials (id, title, kind, url, body, grade_level_id, edition, release_at)
      select '${M.note}','Note','note',null,'hello',id,null,null from public.grade_levels where code='g11';

    -- Announcements.
    insert into public.announcements (audience, group_id, grade_level_id, title, body, publish_at)
      select 'all_students', null, null, 'To all students', 'x', now() - interval '1 hour';
    insert into public.announcements (audience, group_id, grade_level_id, title, body, publish_at)
      select 'all_parents', null, null, 'To all parents', 'x', now() - interval '1 hour';
    insert into public.announcements (audience, group_id, grade_level_id, title, body, publish_at)
      select 'group', '${G.one}', null, 'Group one', 'x', now() - interval '1 hour';
    insert into public.announcements (audience, group_id, grade_level_id, title, body, publish_at)
      select 'grade', null, id, 'Grade 11', 'x', now() - interval '1 hour' from public.grade_levels where code='g11';
    insert into public.announcements (audience, group_id, grade_level_id, title, body, publish_at)
      select 'all_students', null, null, 'Scheduled', 'x', now() + interval '1 day';
  `);
});

afterAll(async () => {
  await db.close();
});

const titles = async () => (await db.query<{ title: string }>("select title from public.announcements order by title")).rows.map((r) => r.title);
const materialTitles = async () => (await db.query<{ title: string }>("select title from public.materials order by title")).rows.map((r) => r.title);

describe("RLS is on for every M2 table", () => {
  it("is enabled and forced", async () => {
    const res = await db.query<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)`);
    expect(res.rows).toEqual([]);
  });
});

describe("class sessions", () => {
  it("students see only their own group's sessions", async () => {
    await as(db, user(U.a), async () => {
      const rows = await db.query<{ id: string }>("select id from public.class_sessions");
      expect(rows.rows.map((r) => r.id)).toEqual([SESSION.one]);
    });
  });

  it("a parent sees their child's group sessions, an unrelated parent sees none", async () => {
    await as(db, user(U.parentA), async () => expect(await count(db, "select * from public.class_sessions")).toBe(1));
    await as(db, user(U.parentX), async () => expect(await count(db, "select * from public.class_sessions")).toBe(0));
  });

  it("students cannot create or edit sessions (so they cannot read the check-in code of other groups either)", async () => {
    await as(db, user(U.a), async () => {
      await expect(
        db.query("insert into public.class_sessions (group_id, starts_at, ends_at) values ($1, now(), now() + interval '1 hour')", [G.one]),
      ).rejects.toThrow(/row-level security/);
      const r = await db.query("update public.class_sessions set checkin_code = '9999'");
      expect(r.affectedRows).toBe(0);
    });
  });
});

describe("check-in", () => {
  it("marks present with the right code and is idempotent", async () => {
    await as(db, user(U.a), async () => {
      await db.query("select public.check_in('1111')");
      await db.query("select public.check_in('1111')");
    });
    const rows = await db.query<{ status: string; method: string }>("select status, method from public.attendance where student_id = $1", [S.a]);
    expect(rows.rows).toEqual([{ status: "present", method: "code" }]);
  });

  it("rejects a wrong code", async () => {
    await as(db, user(U.b), async () => {
      await expect(db.query("select public.check_in('0000')")).rejects.toThrow(/invalid or expired/);
    });
  });

  it("rejects another group's code", async () => {
    await as(db, user(U.b), async () => {
      await expect(db.query("select public.check_in('1111')")).rejects.toThrow(/invalid or expired/);
    });
  });

  it("rejects an expired code", async () => {
    await db.query("update public.class_sessions set checkin_expires_at = now() - interval '1 minute' where id = $1", [SESSION.two]);
    await as(db, user(U.b), async () => {
      await expect(db.query("select public.check_in('2222')")).rejects.toThrow(/invalid or expired/);
    });
    await db.query("update public.class_sessions set checkin_expires_at = now() + interval '10 minutes' where id = $1", [SESSION.two]);
  });

  it("marks late after 15 minutes", async () => {
    await db.query("update public.class_sessions set starts_at = now() - interval '20 minutes' where id = $1", [SESSION.two]);
    await as(db, user(U.b), async () => db.query("select public.check_in('2222')"));
    const r = await db.query<{ status: string }>("select status from public.attendance where student_id = $1", [S.b]);
    expect(r.rows[0]?.status).toBe("late");
  });

  it("never overwrites a mark the teacher made", async () => {
    await db.query("delete from public.attendance where student_id = $1", [S.a]);
    await db.query("insert into public.attendance (session_id, student_id, status, method) values ($1,$2,'absent','tap')", [SESSION.one, S.a]);
    await as(db, user(U.a), async () => db.query("select public.check_in('1111')"));
    const r = await db.query<{ status: string; method: string }>("select status, method from public.attendance where student_id = $1", [S.a]);
    expect(r.rows).toEqual([{ status: "absent", method: "tap" }]);
  });

  it("is refused for parents, the teacher and anonymous visitors", async () => {
    await as(db, user(U.parentA), async () => {
      await expect(db.query("select public.check_in('1111')")).rejects.toThrow(/only students/);
    });
    await as(db, user(U.teacher), async () => {
      await expect(db.query("select public.check_in('1111')")).rejects.toThrow(/only students/);
    });
    await as(db, { kind: "anon" }, async () => {
      await expect(db.query("select public.check_in('1111')")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("attendance visibility", () => {
  it("a student sees only their own marks", async () => {
    await as(db, user(U.a), async () => {
      const r = await db.query<{ student_id: string }>("select student_id from public.attendance");
      expect(r.rows.every((x) => x.student_id === S.a)).toBe(true);
    });
    await as(db, user(U.b), async () => {
      expect(await count(db, "select * from public.attendance where student_id = $1", [S.a])).toBe(0);
    });
  });

  it("a parent sees their child's marks and an unrelated parent sees none", async () => {
    await as(db, user(U.parentA), async () => expect(await count(db, "select * from public.attendance where student_id = $1", [S.a])).toBe(1));
    await as(db, user(U.parentX), async () => expect(await count(db, "select * from public.attendance")).toBe(0));
  });

  it("students cannot write attendance directly", async () => {
    await as(db, user(U.c), async () => {
      await expect(
        db.query("insert into public.attendance (session_id, student_id, status, method) values ($1,$2,'present','tap')", [SESSION.one, S.c]),
      ).rejects.toThrow(/row-level security/);
    });
  });
});

describe("announcements", () => {
  it("a student gets all-students, their group and their grade, and not scheduled ones", async () => {
    await as(db, user(U.a), async () => expect(await titles()).toEqual(["Grade 11", "Group one", "To all students"]));
  });

  it("a student in another group and grade only gets what targets them", async () => {
    await as(db, user(U.b), async () => expect(await titles()).toEqual(["Grade 11", "To all students"]));
    await as(db, user(U.c), async () => expect(await titles()).toEqual(["To all students"]));
  });

  it("a parent gets the parents' announcements plus those for their child's group and grade, never the students-only one", async () => {
    await as(db, user(U.parentA), async () => expect(await titles()).toEqual(["Grade 11", "Group one", "To all parents"]));
  });

  it("an unrelated parent gets only the parents' announcement", async () => {
    await as(db, user(U.parentX), async () => expect(await titles()).toEqual(["To all parents"]));
  });

  it("anonymous visitors see none; the teacher sees all", async () => {
    await as(db, { kind: "anon" }, async () => expect(await count(db, "select * from public.announcements")).toBe(0));
    await as(db, user(U.teacher), async () => expect(await count(db, "select * from public.announcements")).toBe(5));
  });
});

describe("materials", () => {
  it("a Grade 11 group-one English student sees only what is open to them", async () => {
    await as(db, user(U.a), async () => expect(await materialTitles()).toEqual(["Note", "Open"]));
  });

  it("group-restricted material shows only to that group", async () => {
    await as(db, user(U.b), async () => expect(await materialTitles()).toEqual(["Group two only", "Note", "Open"]));
  });

  it("future releases and other grades stay hidden", async () => {
    await as(db, user(U.a), async () => {
      expect(await count(db, "select * from public.materials where title in ('Future','Grade 10')")).toBe(0);
    });
    await as(db, user(U.c), async () => expect(await materialTitles()).toEqual(["Grade 10"]));
  });

  it("edition-specific material is hidden from the other edition", async () => {
    await as(db, user(U.a), async () => expect(await count(db, "select * from public.materials where title = 'Arabic edition'")).toBe(0));
    await db.query("update public.students set edition = 'ar' where id = $1", [S.a]);
    await as(db, user(U.a), async () => expect(await count(db, "select * from public.materials where title = 'Arabic edition'")).toBe(1));
    await db.query("update public.students set edition = 'en' where id = $1", [S.a]);
  });

  it("parents, anonymous visitors and students cannot read or write material rows they should not", async () => {
    await as(db, user(U.parentA), async () => expect(await count(db, "select * from public.materials")).toBe(0));
    await as(db, { kind: "anon" }, async () => expect(await count(db, "select * from public.materials")).toBe(0));
    await as(db, user(U.a), async () => {
      await expect(
        db.query("insert into public.materials (title, kind, url, grade_level_id) select 'x','link','https://x.y', id from public.grade_levels limit 1"),
      ).rejects.toThrow(/row-level security/);
      expect(await count(db, "select * from public.material_groups")).toBe(0);
    });
  });

  it("the teacher sees everything", async () => {
    await as(db, user(U.teacher), async () => expect(await count(db, "select * from public.materials")).toBe(6));
  });
});

describe("table constraints", () => {
  it("rejects a pdf without a storage key and a link that is not https", async () => {
    await expect(
      db.query("insert into public.materials (title, kind, grade_level_id) select 'x','pdf', id from public.grade_levels limit 1"),
    ).rejects.toThrow();
    await expect(
      db.query("insert into public.materials (title, kind, url, grade_level_id) select 'x','link','http://insecure.test', id from public.grade_levels limit 1"),
    ).rejects.toThrow();
  });
});
