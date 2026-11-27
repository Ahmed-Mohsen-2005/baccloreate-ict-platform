import type { SiteSettingsRow } from "@/lib/db/types";

type BrandSettings = Pick<SiteSettingsRow, "platform_name_ar" | "platform_name_en" | "teacher_title"> | null | undefined;

/**
 * The platform's display name in the reader's language: the name set in Settings (Arabic or English,
 * falling back to the other), then the legacy teacher title, then the default site title.
 */
export function platformName(settings: BrandSettings, locale: string, fallback: string): string {
  const ar = settings?.platform_name_ar?.trim();
  const en = settings?.platform_name_en?.trim();
  const preferred = locale === "ar" ? ar || en : en || ar;
  return preferred || settings?.teacher_title?.trim() || fallback;
}

export function hasPlatformName(settings: BrandSettings): boolean {
  return Boolean(settings?.platform_name_ar?.trim() || settings?.platform_name_en?.trim() || settings?.teacher_title?.trim());
}
