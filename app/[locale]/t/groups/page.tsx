import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageTitle, Sheet } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCurriculum } from "@/lib/curriculum";
import { parseSchedule } from "@/lib/db/domain";
import { createClient } from "@/lib/supabase/server";
import { GroupForm } from "./group-form";

export default async function GroupsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.groups");
  const tc = await getTranslations("common");
  const supabase = await createClient();

  const [{ data: groups }, { data: students }, curriculum] = await Promise.all([
    supabase.from("groups").select("*").is("archived_at", null).order("name"),
    supabase.from("students").select("group_id").is("deleted_at", null),
    getCurriculum(),
  ]);
  const counts = new Map<string, number>();
  for (const s of students ?? []) if (s.group_id) counts.set(s.group_id, (counts.get(s.group_id) ?? 0) + 1);
  const gradeLabel = new Map(curriculum.map((g) => [g.id, locale === "ar" ? g.title_ar : g.title_en]));
  const weekdays = t.raw("weekdays") as string[];
  const grades = curriculum.map((g) => ({ id: g.id, label: (locale === "ar" ? g.title_ar : g.title_en) ?? g.code, editions: g.editions }));

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>

      {(groups ?? []).length === 0 ? (
        <p className="mb-6 text-pencil">{t("empty")}</p>
      ) : (
        <ul className="mb-6 divide-y divide-ruling rounded-[var(--radius-sheet)] border border-ruling bg-surface">
          {(groups ?? []).map((g) => (
            <li key={g.id}>
              <Link href={`/t/groups/${g.id}`} className="flex flex-col gap-1 px-4 py-3 no-underline hover:bg-paper">
                <span className="text-lg font-extrabold">{g.name}</span>
                <span className="flex flex-wrap gap-x-4 text-xs text-pencil">
                  <span>{gradeLabel.get(g.grade_level_id)}</span>
                  <span>{tc(g.venue)}</span>
                  <span>{g.edition === "ar" ? tc("editionAr") : tc("editionEn")}</span>
                  <span>{t("studentsCount", { count: counts.get(g.id) ?? 0 })}</span>
                </span>
                <span className="text-xs">
                  {parseSchedule(g.schedule)
                    .map((s) => `${weekdays[s.weekday]} ${s.start}`)
                    .join(locale === "ar" ? "، " : ", ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Sheet>
        <h2 className="mb-4 text-xl font-extrabold">{t("new")}</h2>
        <GroupForm grades={grades} />
      </Sheet>
    </>
  );
}
