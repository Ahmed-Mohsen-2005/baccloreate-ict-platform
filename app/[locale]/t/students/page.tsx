import { getTranslations, setRequestLocale } from "next-intl/server";
import { Term } from "@/components/term";
import { Input, PageTitle, buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCurriculum } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; filter?: string }> };

export default async function StudentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "", filter = "all" } = await searchParams;
  const t = await getTranslations("teacher.students");
  const tc = await getTranslations("common");
  const supabase = await createClient();

  const [{ data: students }, { data: groups }, curriculum] = await Promise.all([
    supabase.from("students").select("*").is("deleted_at", null).order("display_name"),
    supabase.from("groups").select("id, name"),
    getCurriculum(),
  ]);
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const gradeById = new Map(curriculum.map((g) => [g.id, g]));

  const needle = q.trim().toLowerCase();
  const all = students ?? [];
  const shown = all.filter((s) => {
    if (filter === "nogroup" && s.group_id) return false;
    const grade = gradeById.get(s.grade_level_id);
    if ((filter === "g10" || filter === "g11") && grade?.code !== filter) return false;
    if (!needle) return true;
    return [s.display_name, s.external_id, s.phone_e164, s.google_email].some((v) => v?.toLowerCase().includes(needle));
  });

  const filters = [
    { key: "all", label: t("filterAll") },
    ...[...curriculum].reverse().map((g) => ({ key: g.code, label: locale === "ar" ? g.title_ar : g.title_en })),
    { key: "nogroup", label: t("filterNoGroup") },
  ];

  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form className="flex flex-1 gap-2" role="search">
          <input type="hidden" name="filter" value={filter} />
          <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} aria-label={tc("search")} className="min-w-0 flex-1" />
          <button className={buttonClass("secondary")}>{tc("search")}</button>
        </form>
        <Link href="/t/students/import" className={buttonClass("primary")}>
          {t("import")}
        </Link>
      </div>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={{ pathname: "/t/students", query: { filter: f.key, ...(q ? { q } : {}) } }}
            aria-current={filter === f.key ? "page" : undefined}
            className="rounded-[var(--radius-chip)] px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper"
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="text-pencil">{all.length === 0 ? t("emptyAll") : t("empty")}</p>
      ) : (
        <ul className="divide-y divide-ruling rounded-[var(--radius-sheet)] border border-ruling bg-surface">
          {shown.map((s) => (
            <li key={s.id}>
              <Link href={`/t/students/${s.id}`} className="flex flex-col gap-0.5 px-4 py-3 no-underline hover:bg-paper">
                <span className="font-semibold">{s.display_name}</span>
                <span className="flex flex-wrap gap-x-3 text-xs text-pencil">
                  {s.external_id && <Term>{s.external_id}</Term>}
                  <span>{locale === "ar" ? gradeById.get(s.grade_level_id)?.title_ar : gradeById.get(s.grade_level_id)?.title_en}</span>
                  <span>{s.group_id ? groupName.get(s.group_id) : tc("noGroup")}</span>
                  <span>{tc(s.venue)}</span>
                  {s.status !== "active" && <span>{t(`statuses.${s.status}`)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
