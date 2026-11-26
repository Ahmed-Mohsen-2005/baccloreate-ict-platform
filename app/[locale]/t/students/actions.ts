"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { normalisePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export type StudentFormState = {
  saved?: boolean;
  failed?: boolean;
  errors?: Partial<Record<"name" | "phone" | "email" | "emailTaken", true>>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function updateStudent(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  await requireRole("teacher", await getLocale());
  const id = z.uuid().parse(formData.get("id"));
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const errors: StudentFormState["errors"] = {};

  const name = get("display_name").replace(/\s+/g, " ");
  if (!name || name.length > 120) errors.name = true;
  const rawPhone = get("phone");
  const phone = rawPhone ? normalisePhone(rawPhone) : null;
  if (phone && !phone.ok) errors.phone = true;
  const email = get("google_email").toLowerCase();
  if (email && !EMAIL.test(email)) errors.email = true;
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { data: current } = await supabase.from("students").select("grade_level_id").eq("id", id).single();
  const { data: grade } = await supabase.from("grade_levels").select("editions").eq("id", current?.grade_level_id ?? "").single();
  const requestedEdition = get("edition") === "ar" ? "ar" : "en";
  const groupId = get("group_id");
  const gender = get("gender");
  const status = get("status");

  const { error } = await supabase
    .from("students")
    .update({
      display_name: name,
      group_id: groupId ? z.uuid().parse(groupId) : null,
      edition: grade?.editions.includes(requestedEdition) ? requestedEdition : "en",
      venue: get("venue") === "online" ? "online" : "offline",
      gender: gender === "m" || gender === "f" ? gender : null,
      phone_e164: phone?.ok ? phone.e164 : null,
      google_email: email || null,
      status: status === "archived" ? "archived" : "active",
    })
    .eq("id", id);

  if (error?.code === "23505") return { errors: { emailTaken: true } };
  if (error) return { failed: true };
  revalidatePath("/[locale]/t/students", "layout");
  return { saved: true };
}
