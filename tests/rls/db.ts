import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");

/** Boots an in-memory Postgres with the Supabase shim, all migrations and the curriculum seed. */
export async function createTestDb(options: { seed?: boolean } = {}): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(readFileSync(join(root, "tests", "rls", "supabase-shim.sql"), "utf8"));
  const migrationsDir = join(root, "supabase", "migrations");
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  if (options.seed !== false) {
    await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
  }
  return db;
}

export type Actor =
  | { kind: "anon" }
  | { kind: "user"; userId: string }
  | { kind: "service" };

/** Runs `fn` with the given Postgres role and JWT subject, then resets to superuser. */
export async function as<T>(db: PGlite, actor: Actor, fn: () => Promise<T>): Promise<T> {
  const role = actor.kind === "anon" ? "anon" : actor.kind === "service" ? "service_role" : "authenticated";
  const claims = actor.kind === "user" ? JSON.stringify({ sub: actor.userId, role }) : JSON.stringify({ role });
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

export async function count(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const res = await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`, params);
  return res.rows[0]?.n ?? 0;
}
