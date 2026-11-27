"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { normalisePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { saved?: boolean; failed?: boolean; errors?: Partial<Record<"whatsapp" | "years" | "url", true>> };

const SOCIALS = ["facebook", "youtube", "telegram"] as const;

export async function saveSiteSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireRole("teacher", await getLocale());
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const errors: SettingsState["errors"] = {};

  const whatsappRaw = get("whatsapp");
  const whatsapp = whatsappRaw ? normalisePhone(whatsappRaw) : null;
  if (whatsapp && !whatsapp.ok) errors.whatsapp = true;

  const yearsRaw = get("years");
  const years = yearsRaw === "" ? null : Number(yearsRaw);
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) errors.years = true;

  const socials: Record<string, string> = {};
  for (const key of SOCIALS) {
    const v = get(key);
    if (!v) continue;
    if (!/^https:\/\/\S+$/.test(v)) errors.url = true;
    else socials[key] = v;
  }
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      teacher_name: get("teacher_name").slice(0, 120),
      teacher_title: get("teacher_title").slice(0, 60),
      platform_name_ar: get("platform_name_ar").slice(0, 80),
      platform_name_en: get("platform_name_en").slice(0, 80),
      bio_ar: get("bio_ar").slice(0, 2000),
      bio_en: get("bio_en").slice(0, 2000),
      years_experience: years,
      whatsapp_e164: whatsapp?.ok ? whatsapp.e164 : null,
      socials,
    })
    .eq("id", true);
  if (error) return { failed: true };
  revalidatePath("/[locale]", "layout");
  return { saved: true };
}

export async function addAllowlistEmail(formData: FormData) {
  await requireRole("teacher", await getLocale());
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return;
  const supabase = await createClient();
  await supabase.from("teacher_allowlist").upsert({ email: email.data });
  revalidatePath("/[locale]/t/settings", "page");
}

export async function removeAllowlistEmail(formData: FormData) {
  await requireRole("teacher", await getLocale());
  const supabase = await createClient();
  await supabase.from("teacher_allowlist").delete().eq("email", String(formData.get("email") ?? ""));
  revalidatePath("/[locale]/t/settings", "page");
}
