"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { generateCode, hmacCode } from "@/lib/codes";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { buildWaLink, codesMessage } from "@/lib/whatsapp";

export type PrepareResult =
  | { ok: true; link: string; children: { name: string; code: string }[]; parentCode: string }
  | { ok: false };

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Issues a fresh code (retrying on the rare HMAC collision) and returns the plaintext once. */
async function issue(supabase: Supabase, subjectType: "student" | "parent", subjectId: string): Promise<string | null> {
  const pepper = serverEnv().CODE_PEPPER;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { error } = await supabase.rpc("issue_access_code", {
      p_subject_type: subjectType,
      p_subject_id: subjectId,
      p_code_hmac: hmacCode(code, pepper),
    });
    if (!error) return code;
    if (error.code !== "23505") return null; // only retry unique-violation collisions
  }
  return null;
}

/**
 * Creates new codes for every child in the family and the parent, builds the Arabic
 * WhatsApp message and records the send in the outbox (without the codes).
 * Plaintext codes exist only in this response.
 */
export async function prepareFamilyCodes(parentId: string): Promise<PrepareResult> {
  const locale = await getLocale();
  await requireRole("teacher", locale);
  const id = z.uuid().safeParse(parentId);
  if (!id.success) return { ok: false };

  const supabase = await createClient();
  const [{ data: parent }, { data: links }, { data: settings }] = await Promise.all([
    supabase.from("parents").select("id, phone_e164").eq("id", id.data).is("deleted_at", null).maybeSingle(),
    supabase.from("guardianships").select("student_id").eq("parent_id", id.data),
    supabase.from("site_settings").select("teacher_title").maybeSingle(),
  ]);
  if (!parent) return { ok: false };

  const { data: students } = await supabase
    .from("students")
    .select("id, display_name, gender")
    .in("id", (links ?? []).map((l) => l.student_id))
    .eq("status", "active")
    .is("deleted_at", null)
    .order("display_name");
  if (!students?.length) return { ok: false };

  const children: { name: string; gender: "m" | "f" | null; code: string }[] = [];
  for (const s of students) {
    const code = await issue(supabase, "student", s.id);
    if (!code) return { ok: false };
    children.push({ name: s.display_name, gender: s.gender, code });
  }
  const parentCode = await issue(supabase, "parent", parent.id);
  if (!parentCode) return { ok: false };

  const loginUrl = `${serverEnv().NEXT_PUBLIC_SITE_URL}${locale === "en" ? "/en" : ""}/login`;
  const text = codesMessage({ teacherTitle: settings?.teacher_title ?? "", children, parentCode, loginUrl });

  await supabase.from("messages").insert({
    template: "codes",
    recipient_parent_id: parent.id,
    recipient_phone: parent.phone_e164,
    payload: { student_ids: students.map((s) => s.id) },
    status: "opened",
  });
  revalidatePath("/[locale]/t", "layout");

  return {
    ok: true,
    link: buildWaLink(parent.phone_e164, text),
    children: children.map(({ name, code }) => ({ name, code })),
    parentCode,
  };
}
