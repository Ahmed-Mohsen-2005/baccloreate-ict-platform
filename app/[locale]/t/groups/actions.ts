"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/viewer";
import { isScheduleSlot, type ScheduleSlot } from "@/lib/db/domain";
import { createClient } from "@/lib/supabase/server";

export type GroupFormState = { errors?: Partial<Record<"name" | "meetUrl" | "schedule", true>>; failed?: boolean };

const MEET = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i;

function parseGroup(formData: FormData) {
  const errors: GroupFormState["errors"] = {};
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 80) errors.name = true;
  const venue = formData.get("venue") === "online" ? "online" : "offline";
  const meet = String(formData.get("meet_url") ?? "").trim();
  if (meet && !MEET.test(meet)) errors.meetUrl = true;

  let schedule: ScheduleSlot[] = [];
  try {
    const raw: unknown = JSON.parse(String(formData.get("schedule") ?? "[]"));
    if (!Array.isArray(raw) || !raw.every(isScheduleSlot)) errors.schedule = true;
    else schedule = raw;
  } catch {
    errors.schedule = true;
  }

  return {
    errors,
    data: {
      name,
      venue,
      meet_url: venue === "online" && meet ? meet : null,
      schedule,
    } as const,
  };
}

export async function createGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const locale = await getLocale();
  await requireRole("teacher", locale);
  const { errors, data } = parseGroup(formData);
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const gradeId = z.uuid().parse(formData.get("grade_level_id"));
  const { data: grade } = await supabase.from("grade_levels").select("editions").eq("id", gradeId).single();
  const requested = formData.get("edition") === "ar" ? "ar" : "en";
  const edition = grade?.editions.includes(requested) ? requested : "en";

  const { error } = await supabase.from("groups").insert({ ...data, grade_level_id: gradeId, edition });
  if (error) return { failed: true };
  revalidatePath("/[locale]/t/groups", "page");
  redirect({ href: "/t/groups", locale });
  return {};
}

export async function updateGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const locale = await getLocale();
  await requireRole("teacher", locale);
  const id = z.uuid().parse(formData.get("id"));
  const { errors, data } = parseGroup(formData);
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("grade_level_id").eq("id", id).single();
  const { data: grade } = await supabase.from("grade_levels").select("editions").eq("id", group?.grade_level_id ?? "").single();
  const requested = formData.get("edition") === "ar" ? "ar" : "en";
  const edition = grade?.editions.includes(requested) ? requested : "en";

  const { error } = await supabase.from("groups").update({ ...data, edition }).eq("id", id);
  if (error) return { failed: true };
  revalidatePath("/[locale]/t/groups", "page");
  redirect({ href: "/t/groups", locale });
  return {};
}

export async function archiveGroup(formData: FormData) {
  const locale = await getLocale();
  await requireRole("teacher", locale);
  const supabase = await createClient();
  await supabase.from("groups").update({ archived_at: new Date().toISOString() }).eq("id", z.uuid().parse(formData.get("id")));
  revalidatePath("/[locale]/t/groups", "page");
  redirect({ href: "/t/groups", locale });
}
