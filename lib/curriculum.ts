import "server-only";
import { cache } from "react";
import type { GradeLevelRow, LessonRow, SiteSettingsRow, UnitRow } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export type CurriculumLesson = LessonRow;
export type CurriculumUnit = UnitRow & { lessons: CurriculumLesson[] };
export type CurriculumGrade = GradeLevelRow & { units: CurriculumUnit[] };

/** The whole curriculum tree, ordered. Public data (RLS allows anon reads). */
export const getCurriculum = cache(async (): Promise<CurriculumGrade[]> => {
  const supabase = await createClient();
  const [grades, units, lessons] = await Promise.all([
    supabase.from("grade_levels").select("*").order("position"),
    supabase.from("units").select("*").order("position"),
    supabase.from("lessons").select("*").order("position"),
  ]);
  if (grades.error || units.error || lessons.error) throw new Error("Could not load the curriculum");

  const lessonsByUnit = new Map<string, CurriculumLesson[]>();
  for (const lesson of lessons.data) {
    lessonsByUnit.set(lesson.unit_id, [...(lessonsByUnit.get(lesson.unit_id) ?? []), lesson]);
  }
  return grades.data.map((grade) => ({
    ...grade,
    units: units.data
      .filter((u) => u.grade_level_id === grade.id)
      .map((u) => ({ ...u, lessons: lessonsByUnit.get(u.id) ?? [] })),
  }));
});

/** Title in the reader's language, falling back to English (Grade 10 is English only). */
export function localTitle(row: { title_ar: string | null; title_en: string }, locale: string): { text: string; lang: "ar" | "en" } {
  if (locale === "ar" && row.title_ar) return { text: row.title_ar, lang: "ar" };
  return { text: row.title_en, lang: "en" };
}

export const getSiteSettings = cache(async (): Promise<SiteSettingsRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").maybeSingle();
  return data;
});
