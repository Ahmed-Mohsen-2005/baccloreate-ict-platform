import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, count, createTestDb } from "./db";

const TEACHER = "00000000-0000-0000-0000-0000000000a1";
const STUDENT_USER = "00000000-0000-0000-0000-0000000000b1";
const PARENT_USER = "00000000-0000-0000-0000-0000000000c1";
const teacher = { kind: "user", userId: TEACHER } as const;
const studentUser = { kind: "user", userId: STUDENT_USER } as const;
const parentUser = { kind: "user", userId: PARENT_USER } as const;

let db: PGlite;

const rows = [
  // Two siblings sharing one parent phone, and one other family.
  { external_id: "S-001", display_name: "Sibling One", grade_code: "g11", edition: "en", venue: "offline", gender: "m",
    phone_e164: "+201011111111", google_email: "one@gmail.com", parent_phone_e164: "+201099999991", parent_email: "fam1@gmail.com" },
  { external_id: "S-002", display_name: "Sibling Two", grade_code: "g10", edition: "en", venue: "online", gender: "f",
    phone_e164: "", google_email: "", parent_phone_e164: "+201099999991", parent_email: "" },
  { external_id: "S-003", display_name: "Other Family", grade_code: "g11", edition: "ar", venue: "online", gender: "f",
    phone_e164: "", google_email: "", parent_phone_e164: "+201099999992", parent_email: "" },
];

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into auth.users (id) values ('${TEACHER}'), ('${STUDENT_USER}'), ('${PARENT_USER}');
    insert into public.profiles (user_id, role) values ('${TEACHER}', 'teacher'), ('${STUDENT_USER}', 'student'), ('${PARENT_USER}', 'parent');
  `);
});

afterAll(async () => {
  await db.close();
});

describe("import_students", () => {
  it("is refused for non-teachers", async () => {
    await as(db, studentUser, async () => {
      await expect(db.query("select public.import_students($1, true)", [JSON.stringify(rows)])).rejects.toThrow(/only the teacher/);
    });
  });

  it("refuses an import without attested consent", async () => {
    await as(db, teacher, async () => {
      await expect(db.query("select public.import_students($1, false)", [JSON.stringify(rows)])).rejects.toThrow(/attested/);
    });
  });

  it("creates students, links siblings to one parent and records consent", async () => {
    const res = await as(db, teacher, () =>
      db.query<{ r: { created: number; updated: number; parents_created: number } }>("select public.import_students($1, true) as r", [
        JSON.stringify(rows),
      ]),
    );
    expect(res.rows[0]?.r).toEqual({ created: 3, updated: 0, parents_created: 2 });
    expect(await count(db, "select * from public.parents")).toBe(2);
    expect(
      await count(
        db,
        `select * from public.guardianships g join public.parents p on p.id = g.parent_id where p.phone_e164 = '+201099999991'`,
      ),
    ).toBe(2);
    expect(await count(db, "select * from public.consents where method = 'import_attested'")).toBe(3);
  });

  it("updates on re-import instead of duplicating", async () => {
    const changed = rows.map((r) => (r.external_id === "S-001" ? { ...r, display_name: "Sibling One Renamed" } : r));
    const res = await as(db, teacher, () =>
      db.query<{ r: { created: number; updated: number } }>("select public.import_students($1, true) as r", [JSON.stringify(changed)]),
    );
    expect(res.rows[0]?.r).toMatchObject({ created: 0, updated: 3, parents_created: 0 });
    expect(await count(db, "select * from public.students")).toBe(3);
    expect(await count(db, "select * from public.students where display_name = 'Sibling One Renamed'")).toBe(1);
    expect(await count(db, "select * from public.consents")).toBe(3);
  });
});

describe("issue_access_code", () => {
  it("keeps exactly one active code per person and audits without the hash", async () => {
    const sid = (await db.query<{ id: string }>("select id from public.students where external_id = 'S-001'")).rows[0]!.id;
    await as(db, teacher, async () => {
      await db.query("select public.issue_access_code('student', $1, 'h1')", [sid]);
      await db.query("select public.issue_access_code('student', $1, 'h2')", [sid]);
    });
    expect(await count(db, "select * from public.access_codes where subject_id = $1 and revoked_at is null", [sid])).toBe(1);
    expect(await count(db, "select * from public.access_codes where code_hmac = 'h1' and revoked_at is not null")).toBe(1);
    expect(await count(db, "select * from public.audit_log where entity = 'access_codes' and (after ? 'code_hmac')")).toBe(0);
  });

  it("is refused for non-teachers", async () => {
    const sid = (await db.query<{ id: string }>("select id from public.students limit 1")).rows[0]!.id;
    await as(db, studentUser, async () => {
      await expect(db.query("select public.issue_access_code('student', $1, 'x')", [sid])).rejects.toThrow(/only the teacher/);
    });
  });
});

describe("approve_join_request", () => {
  it("creates the student with the sign-up consent timestamp", async () => {
    const req = await db.query<{ id: string }>(`
      insert into public.join_requests (student_name, grade_level_id, venue, parent_phone, consent_given_at, consent_version)
      select 'New Applicant', id, 'online', '+201099999993', '2026-11-20T10:00:00Z', '2026-11-26' from public.grade_levels where code = 'g10'
      returning id`);
    const id = req.rows[0]!.id;
    await as(db, teacher, () => db.query("select public.approve_join_request($1, null)", [id]));
    expect(await count(db, "select * from public.join_requests where id = $1 and status = 'approved'", [id])).toBe(1);
    const consent = await db.query<{ method: string; given_at: Date }>(
      `select c.method, c.given_at from public.consents c join public.students s on s.id = c.student_id where s.display_name = 'New Applicant'`,
    );
    expect(consent.rows[0]?.method).toBe("signup_checkbox");
    expect(new Date(consent.rows[0]!.given_at).toISOString()).toBe("2026-11-20T10:00:00.000Z");
  });

  it("cannot approve the same request twice", async () => {
    const id = (await db.query<{ id: string }>("select id from public.join_requests where status = 'approved' limit 1")).rows[0]!.id;
    await as(db, teacher, async () => {
      await expect(db.query("select public.approve_join_request($1, null)", [id])).rejects.toThrow(/already decided/);
    });
  });
});

describe("confirm_consent", () => {
  it("lets a parent confirm only for their own child", async () => {
    const fam1 = (await db.query<{ id: string }>("select id from public.parents where phone_e164 = '+201099999991'")).rows[0]!.id;
    await db.query("insert into public.account_links (user_id, subject_type, subject_id, method) values ($1, 'parent', $2, 'code')", [
      PARENT_USER,
      fam1,
    ]);
    const own = (await db.query<{ id: string }>("select id from public.students where external_id = 'S-002'")).rows[0]!.id;
    const other = (await db.query<{ id: string }>("select id from public.students where external_id = 'S-003'")).rows[0]!.id;
    await as(db, parentUser, async () => {
      await db.query("select public.confirm_consent($1)", [own]);
      await expect(db.query("select public.confirm_consent($1)", [other])).rejects.toThrow(/not your child/);
    });
    expect(await count(db, "select * from public.consents where student_id = $1 and method = 'parent_portal'", [own])).toBe(1);
  });
});

describe("reorder", () => {
  it("lets only the teacher reorder curriculum rows", async () => {
    const ids = (await db.query<{ id: string }>(
      `select l.id from public.lessons l join public.units u on u.id = l.unit_id
       join public.grade_levels g on g.id = u.grade_level_id where g.code = 'g11' and u.code = '2' order by l.position desc`,
    )).rows.map((r) => r.id);
    await as(db, studentUser, async () => {
      await expect(db.query("select public.reorder('lessons', $1)", [ids])).rejects.toThrow(/only the teacher/);
    });
    await as(db, teacher, () => db.query("select public.reorder('lessons', $1)", [ids]));
    const codes = (await db.query<{ code: string }>(
      `select l.code from public.lessons l join public.units u on u.id = l.unit_id
       join public.grade_levels g on g.id = u.grade_level_id where g.code = 'g11' and u.code = '2' order by l.position`,
    )).rows.map((r) => r.code);
    expect(codes).toEqual(["2-3", "2-2", "2-1"]);
  });

  it("rejects tables outside the curriculum", async () => {
    await as(db, teacher, async () => {
      await expect(db.query("select public.reorder('students', $1)", [[]])).rejects.toThrow(/cannot reorder/);
    });
  });
});
