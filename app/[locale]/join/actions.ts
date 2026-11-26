"use server";

import { headers } from "next/headers";
import { normalisePhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

export type JoinField = "name" | "grade" | "venue" | "parentPhone" | "studentPhone" | "email" | "consent";
export type JoinState = { ok?: boolean; errors?: Partial<Record<JoinField, true>>; rateLimited?: boolean; failed?: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitJoinRequest(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const errors: Partial<Record<JoinField, true>> = {};

  const name = get("name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) errors.name = true;
  const gradeId = get("grade");
  if (!/^[0-9a-f-]{36}$/.test(gradeId)) errors.grade = true;
  const venue = get("venue");
  if (venue !== "online" && venue !== "offline") errors.venue = true;
  const gender = get("gender");

  const parentPhone = normalisePhone(get("parentPhone"));
  if (!parentPhone.ok) errors.parentPhone = true;
  const studentPhoneRaw = get("studentPhone");
  const studentPhone = studentPhoneRaw ? normalisePhone(studentPhoneRaw) : null;
  if (studentPhone && !studentPhone.ok) errors.studentPhone = true;

  const studentEmail = get("studentEmail").toLowerCase();
  const parentEmail = get("parentEmail").toLowerCase();
  if ((studentEmail && !EMAIL.test(studentEmail)) || (parentEmail && !EMAIL.test(parentEmail))) errors.email = true;
  if (formData.get("consent") !== "on") errors.consent = true;

  if (Object.keys(errors).length > 0) return { errors };

  const admin = createAdminClient();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await admin.rpc("hit_rate_limit", { p_key: `join:${ip}`, p_window_seconds: 3600, p_max: 5 });
  if (allowed === false) return { rateLimited: true };

  const { data: settings } = await admin.from("site_settings").select("consent_policy_version").maybeSingle();
  const { error } = await admin.from("join_requests").insert({
    student_name: name,
    grade_level_id: gradeId,
    venue: venue as "online" | "offline",
    gender: gender === "m" || gender === "f" ? gender : null,
    student_phone: studentPhone?.ok ? studentPhone.e164 : null,
    student_email: studentEmail || null,
    parent_phone: parentPhone.ok ? parentPhone.e164 : "",
    parent_email: parentEmail || null,
    consent_given_at: new Date().toISOString(),
    consent_version: settings?.consent_policy_version ?? "unknown",
  });
  if (error) return { failed: true };
  return { ok: true };
}
