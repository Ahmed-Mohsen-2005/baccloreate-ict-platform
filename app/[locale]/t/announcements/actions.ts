"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { zonedToUtc } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementState = { saved?: boolean; error?: "fields" | "failed" };

const uuid = z.uuid();

/** "group:<id>", "grade:<id>", "all_students" or "all_parents" (one select keeps the form simple on a phone). */
function parseAudience(raw: string) {
  if (raw === "all_students" || raw === "all_parents") return { audience: raw, group_id: null, grade_level_id: null } as const;
  const [kind, id] = raw.split(":");
  if (kind === "group" && uuid.safeParse(id).success) return { audience: "group", group_id: id!, grade_level_id: null } as const;
  if (kind === "grade" && uuid.safeParse(id).success) return { audience: "grade", group_id: null, grade_level_id: id! } as const;
  return null;
}

/** datetime-local value ("2026-11-28T16:00") read as Cairo time. */
function parseWhen(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  return zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), "Africa/Cairo");
}

export async function createAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const viewer = await requireRole("teacher", await getLocale());
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const target = parseAudience(String(formData.get("audience") ?? ""));
  const whenRaw = String(formData.get("publish_at") ?? "").trim();
  const when = whenRaw ? parseWhen(whenRaw) : new Date();
  if (!target || !when || title.length === 0 || title.length > 120 || body.length === 0 || body.length > 2000) return { error: "fields" };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...target, title, body, publish_at: when.toISOString(), created_by: viewer.userId });
  if (error) return { error: "failed" };
  revalidatePath("/[locale]", "layout");
  return { saved: true };
}

export async function deleteAnnouncement(formData: FormData) {
  await requireRole("teacher", await getLocale());
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", uuid.parse(formData.get("id")));
  revalidatePath("/[locale]", "layout");
}
