import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageTitle } from "@/components/ui";
import { getCurriculum } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.import");
  const supabase = await createClient();
  const [{ data: groups }, curriculum] = await Promise.all([
    supabase.from("groups").select("id, name, grade_level_id, venue").is("archived_at", null).order("name"),
    getCurriculum(),
  ]);
  const gradeCode = new Map(curriculum.map((g) => [g.id, g.code]));
  const gradeLabels = Object.fromEntries(curriculum.map((g) => [g.code, locale === "ar" ? g.title_ar : g.title_en]));

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
      <ImportWizard
        gradeLabels={gradeLabels}
        groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name, venue: g.venue, grade_code: gradeCode.get(g.grade_level_id) ?? "" }))}
      />
    </>
  );
}
