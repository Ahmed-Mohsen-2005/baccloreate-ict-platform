"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { ImportFileError, parseSpreadsheet } from "@/lib/import/parse";
import { validateImport, type ImportRow, type ValidationResult } from "@/lib/import/validate";
import { createClient } from "@/lib/supabase/server";

export type CheckState =
  | { status: "idle" }
  | { status: "fileError"; code: ImportFileError["code"] }
  | { status: "checked"; result: ValidationResult };

/** Step 1: parse and validate in memory. Nothing is stored; the file is discarded after the response. */
export async function checkImportFile(_prev: CheckState, formData: FormData): Promise<CheckState> {
  await requireRole("teacher", await getLocale());
  const file = formData.get("file");
  if (!(file instanceof File)) return { status: "fileError", code: "empty" };
  const defaultEdition = formData.get("defaultEdition") === "ar" ? "ar" : "en";

  let sheet;
  try {
    sheet = await parseSpreadsheet(file);
  } catch (e) {
    if (e instanceof ImportFileError) return { status: "fileError", code: e.code };
    return { status: "fileError", code: "unreadable" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("students").select("google_email, external_id").not("google_email", "is", null);
  const existingGoogleEmails = new Map((existing ?? []).map((s) => [s.google_email as string, s.external_id]));

  return { status: "checked", result: validateImport(sheet.headers, sheet.records, { defaultEdition, existingGoogleEmails }) };
}

const E164 = /^\+[1-9][0-9]{7,14}$/;
const rowSchema = z
  .object({
    external_id: z.string().trim().min(1).max(64),
    display_name: z.string().trim().min(1).max(120),
    grade_code: z.enum(["g10", "g11"]),
    edition: z.enum(["ar", "en"]),
    venue: z.enum(["online", "offline"]),
    gender: z.enum(["m", "f"]).nullable(),
    phone_e164: z.string().regex(E164).nullable(),
    google_email: z.email().nullable(),
    parent_phone_e164: z.string().regex(E164),
    parent_email: z.email().nullable(),
    group_id: z.uuid().nullable(),
  })
  .transform((r) => ({ ...r, edition: r.grade_code === "g10" ? ("en" as const) : r.edition }));

export type CommitResult = { ok: true; created: number; updated: number; parents: number } | { ok: false };

/** Step 2: re-validate the reviewed rows on the server and save them in one transaction. */
export async function commitImport(rows: ImportRow[], attested: boolean): Promise<CommitResult> {
  await requireRole("teacher", await getLocale());
  const parsed = z.array(rowSchema).min(1).max(2000).safeParse(rows);
  if (!parsed.success || !attested) return { ok: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_students", { p_rows: parsed.data, p_attested: true });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { ok: false };
  const counts = data as { created?: number; updated?: number; parents_created?: number };

  revalidatePath("/[locale]/t", "layout");
  return { ok: true, created: counts.created ?? 0, updated: counts.updated ?? 0, parents: counts.parents_created ?? 0 };
}
