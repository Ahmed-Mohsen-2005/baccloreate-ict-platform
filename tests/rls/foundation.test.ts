import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, count, createTestDb } from "./db";

// Fixture people. Student A and A2 are siblings (parent PA). Student B has parent PB.
// PX is a parent with no linked children. T is the teacher.
const U = {
  teacher: "00000000-0000-0000-0000-0000000000a1",
  studentA: "00000000-0000-0000-0000-0000000000b1",
  studentA2: "00000000-0000-0000-0000-0000000000b2",
  studentB: "00000000-0000-0000-0000-0000000000b3",
  parentA: "00000000-0000-0000-0000-0000000000c1",
  parentB: "00000000-0000-0000-0000-0000000000c2",
  parentX: "00000000-0000-0000-0000-0000000000c3",
  stranger: "00000000-0000-0000-0000-0000000000d1",
} as const;

const S = {
  A: "10000000-0000-0000-0000-000000000001",
  A2: "10000000-0000-0000-0000-000000000002",
  B: "10000000-0000-0000-0000-000000000003",
} as const;
const P = {
  A: "20000000-0000-0000-0000-000000000001",
  B: "20000000-0000-0000-0000-000000000002",
  X: "20000000-0000-0000-0000-000000000003",
} as const;
const G = {
  one: "30000000-0000-0000-0000-000000000001",
  two: "30000000-0000-0000-0000-000000000002",
} as const;

let db: PGlite;

async function fixtures(d: PGlite) {
  await d.exec(`
    insert into auth.users (id) values
      ('${U.teacher}'), ('${U.studentA}'), ('${U.studentA2}'), ('${U.studentB}'),
      ('${U.parentA}'), ('${U.parentB}'), ('${U.parentX}'), ('${U.stranger}');
    insert into public.profiles (user_id, role) values
      ('${U.teacher}', 'teacher'), ('${U.studentA}', 'student'), ('${U.studentA2}', 'student'),
      ('${U.studentB}', 'student'), ('${U.parentA}', 'parent'), ('${U.parentB}', 'parent'), ('${U.parentX}', 'parent');
    insert into public.groups (id, name, grade_level_id, edition, venue)
      select '${G.one}', 'Group one', id, 'en', 'offline' from public.grade_levels where code = 'g11';
    insert into public.groups (id, name, grade_level_id, edition, venue)
      select '${G.two}', 'Group two', id, 'en', 'online' from public.grade_levels where code = 'g11';
    insert into public.students (id, display_name, grade_level_id, group_id, venue)
      select '${S.A}', 'Student A', id, '${G.one}', 'offline' from public.grade_levels where code = 'g11';
    insert into public.students (id, display_name, grade_level_id, group_id, venue)
      select '${S.A2}', 'Student A2', id, '${G.one}', 'offline' from public.grade_levels where code = 'g11';
    insert into public.students (id, display_name, grade_level_id, group_id, venue)
      select '${S.B}', 'Student B', id, '${G.two}', 'online' from public.grade_levels where code = 'g11';
    insert into public.parents (id, phone_e164) values
      ('${P.A}', '+201000000001'), ('${P.B}', '+201000000002'), ('${P.X}', '+201000000003');
    insert into public.guardianships (parent_id, student_id) values
      ('${P.A}', '${S.A}'), ('${P.A}', '${S.A2}'), ('${P.B}', '${S.B}');
    insert into public.account_links (user_id, subject_type, subject_id, method) values
      ('${U.studentA}', 'student', '${S.A}', 'code'),
      ('${U.studentA2}', 'student', '${S.A2}', 'code'),
      ('${U.studentB}', 'student', '${S.B}', 'code'),
      ('${U.parentA}', 'parent', '${P.A}', 'code'),
      ('${U.parentB}', 'parent', '${P.B}', 'code'),
      ('${U.parentX}', 'parent', '${P.X}', 'code');
    insert into public.consents (student_id, parent_id, kind, policy_version, method) values
      ('${S.A}', '${P.A}', 'guardian_data', '2026-11-26', 'import_attested'),
      ('${S.B}', '${P.B}', 'guardian_data', '2026-11-26', 'import_attested');
    insert into public.access_codes (subject_type, subject_id, code_hmac) values
      ('student', '${S.A}', 'hmac-a'), ('student', '${S.B}', 'hmac-b');
    insert into public.join_requests (student_name, grade_level_id, venue, parent_phone, consent_given_at, consent_version)
      select 'Applicant', id, 'online', '+201000000009', now(), '2026-11-26' from public.grade_levels where code = 'g10';
    insert into public.messages (template, recipient_phone) values ('codes', '+201000000001');
  `);
}

const user = (userId: string) => ({ kind: "user", userId }) as const;

beforeAll(async () => {
  db = await createTestDb();
  await fixtures(db);
});

afterAll(async () => {
  await db.close();
});

describe("every table is protected", () => {
  it("has RLS enabled and forced on every public table", async () => {
    const res = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    expect(res.rows.length).toBeGreaterThan(10);
    const unprotected = res.rows.filter((r) => !r.relrowsecurity || !r.relforcerowsecurity).map((r) => r.relname);
    expect(unprotected).toEqual([]);
  });
});

describe("anonymous visitor", () => {
  const anon = { kind: "anon" } as const;

  it("can read the public curriculum and site settings", async () => {
    await as(db, anon, async () => {
      expect(await count(db, "select * from public.lessons")).toBe(23 + 62); // Grade 11 has 23 lessons, Grade 10 has 62
      expect(await count(db, "select * from public.site_settings")).toBe(1);
    });
  });

  it("cannot read any personal data", async () => {
    await as(db, anon, async () => {
      for (const table of ["students", "parents", "guardianships", "consents", "groups", "account_links", "join_requests", "messages", "profiles", "audit_log"]) {
        expect(await count(db, `select * from public.${table}`), table).toBe(0);
      }
    });
  });

  it("cannot read access codes or rate limits at all", async () => {
    await as(db, anon, async () => {
      await expect(db.query("select * from public.access_codes")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.rate_limits")).rejects.toThrow(/permission denied/);
    });
  });

  it("cannot write a join request directly (the server route does it)", async () => {
    await as(db, anon, async () => {
      await expect(
        db.query(`insert into public.join_requests (student_name, grade_level_id, venue, parent_phone, consent_given_at, consent_version)
                  select 'x', id, 'online', '+201000000008', now(), 'v' from public.grade_levels limit 1`),
      ).rejects.toThrow(/row-level security/);
    });
  });
});

describe("student", () => {
  it("sees only their own student row", async () => {
    await as(db, user(U.studentA), async () => {
      const rows = await db.query<{ id: string }>("select id from public.students");
      expect(rows.rows.map((r) => r.id)).toEqual([S.A]);
    });
  });

  it("cannot read a sibling or another student by id", async () => {
    await as(db, user(U.studentA), async () => {
      expect(await count(db, "select * from public.students where id = $1", [S.B])).toBe(0);
      expect(await count(db, "select * from public.students where id = $1", [S.A2])).toBe(0);
    });
  });

  it("sees only their own group", async () => {
    await as(db, user(U.studentB), async () => {
      const rows = await db.query<{ id: string }>("select id from public.groups");
      expect(rows.rows.map((r) => r.id)).toEqual([G.two]);
    });
  });

  it("cannot read parents, codes, consents of others, messages or join requests", async () => {
    await as(db, user(U.studentA), async () => {
      expect(await count(db, "select * from public.parents")).toBe(0);
      expect(await count(db, "select * from public.access_codes")).toBe(0);
      expect(await count(db, "select * from public.consents where student_id = $1", [S.B])).toBe(0);
      expect(await count(db, "select * from public.messages")).toBe(0);
      expect(await count(db, "select * from public.join_requests")).toBe(0);
      expect(await count(db, "select * from public.audit_log")).toBe(0);
    });
  });

  it("cannot change their own role, but can change their theme", async () => {
    await as(db, user(U.studentA), async () => {
      await expect(db.query("update public.profiles set role = 'teacher' where user_id = $1", [U.studentA])).rejects.toThrow(
        /permission denied/,
      );
      const res = await db.query("update public.profiles set theme = 'dark' where user_id = $1", [U.studentA]);
      expect(res.affectedRows).toBe(1);
    });
  });

  it("cannot edit their own student record or another profile", async () => {
    await as(db, user(U.studentA), async () => {
      const r1 = await db.query("update public.students set display_name = 'hacked' where id = $1", [S.A]);
      expect(r1.affectedRows).toBe(0);
      const r2 = await db.query("update public.profiles set theme = 'dark' where user_id = $1", [U.studentB]);
      expect(r2.affectedRows).toBe(0);
    });
  });

  it("cannot insert students or link themselves to someone else", async () => {
    await as(db, user(U.studentA), async () => {
      await expect(
        db.query(`insert into public.students (display_name, grade_level_id, venue) select 'x', id, 'online' from public.grade_levels limit 1`),
      ).rejects.toThrow(/row-level security/);
      await expect(
        db.query("insert into public.account_links (user_id, subject_type, subject_id, method) values ($1, 'student', $2, 'code')", [
          U.stranger,
          S.B,
        ]),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("loses access when archived", async () => {
    await db.query("update public.students set status = 'archived' where id = $1", [S.A2]);
    await as(db, user(U.studentA2), async () => {
      expect(await count(db, "select * from public.students")).toBe(0);
    });
    await db.query("update public.students set status = 'active' where id = $1", [S.A2]);
  });
});

describe("parent", () => {
  it("sees all of their children (siblings) and no one else", async () => {
    await as(db, user(U.parentA), async () => {
      const rows = await db.query<{ id: string }>("select id from public.students order by id");
      expect(rows.rows.map((r) => r.id)).toEqual([S.A, S.A2]);
    });
  });

  it("sees only their own parent row", async () => {
    await as(db, user(U.parentA), async () => {
      const rows = await db.query<{ id: string }>("select id from public.parents");
      expect(rows.rows.map((r) => r.id)).toEqual([P.A]);
    });
  });

  it("cannot read another family's student, consents or guardianships", async () => {
    await as(db, user(U.parentA), async () => {
      expect(await count(db, "select * from public.students where id = $1", [S.B])).toBe(0);
      expect(await count(db, "select * from public.consents where student_id = $1", [S.B])).toBe(0);
      expect(await count(db, "select * from public.guardianships where parent_id = $1", [P.B])).toBe(0);
    });
  });

  it("with no linked children sees no students", async () => {
    await as(db, user(U.parentX), async () => {
      expect(await count(db, "select * from public.students")).toBe(0);
      expect(await count(db, "select * from public.groups")).toBe(0);
    });
  });
});

describe("signed-in user with no role link", () => {
  it("sees no personal data", async () => {
    await as(db, user(U.stranger), async () => {
      for (const table of ["students", "parents", "guardianships", "consents", "groups", "profiles"]) {
        expect(await count(db, `select * from public.${table}`), table).toBe(0);
      }
    });
  });
});

describe("teacher", () => {
  it("reads every student, parent and join request", async () => {
    await as(db, user(U.teacher), async () => {
      expect(await count(db, "select * from public.students")).toBe(3);
      expect(await count(db, "select * from public.parents")).toBe(3);
      expect(await count(db, "select * from public.join_requests")).toBe(1);
      expect(await count(db, "select * from public.access_codes")).toBe(2);
    });
  });

  it("can edit the curriculum", async () => {
    await as(db, user(U.teacher), async () => {
      const res = await db.query("update public.lessons set position = position where code = '2-1'");
      expect(res.affectedRows).toBe(2); // 2-1 exists in both grades
    });
  });

  it("can read the audit log but cannot alter or delete it", async () => {
    await db.query("update public.access_codes set revoked_at = now() where code_hmac = 'hmac-a'");
    await as(db, user(U.teacher), async () => {
      expect(await count(db, "select * from public.audit_log where entity = 'access_codes'")).toBeGreaterThan(0);
      await expect(db.query("delete from public.audit_log")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("audit log never stores code hashes", () => {
  it("strips code_hmac from before/after", async () => {
    const res = await db.query<{ n: number }>(
      `select count(*)::int as n from public.audit_log where entity = 'access_codes' and (before ? 'code_hmac' or after ? 'code_hmac')`,
    );
    expect(res.rows[0]?.n).toBe(0);
  });
});

describe("rate limiting", () => {
  it("is not callable by signed-in users", async () => {
    await as(db, user(U.studentA), async () => {
      await expect(db.query("select app.hit_rate_limit('x', 60, 5)")).rejects.toThrow(/permission denied/);
    });
  });

  it("blocks after the limit for the service role", async () => {
    await as(db, { kind: "service" }, async () => {
      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        const r = await db.query<{ ok: boolean }>("select app.hit_rate_limit('login:1.2.3.4', 600, 3) as ok");
        results.push(r.rows[0]?.ok ?? false);
      }
      expect(results).toEqual([true, true, true, false]);
    });
  });
});
