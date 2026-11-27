import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LessonCode } from "@/components/lesson-code";
import { LocalizedTitle } from "@/components/localized-title";
import { UnitObject } from "@/components/unit-object";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/viewer";
import { getCurriculum, localTitle } from "@/lib/curriculum";
import { domainClass } from "@/lib/db/domain";
import { createClient } from "@/lib/supabase/server";

/** A lesson: its materials (RLS shows only what is released and meant for this student). */
export default async function LessonPage({ params }: { params: Promise<{ locale: string; lesson: string }> }) {
  const { locale, lesson: lessonId } = await params;
  setRequestLocale(locale);
  const viewer = await requireRole("student", locale);
  const t = await getTranslations("materials");
  const tc = await getTranslations("common");
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("grade_level_id, edition").eq("id", viewer.subjectId ?? "").maybeSingle();
  const curriculum = await getCurriculum();
  const grade = curriculum.find((g) => g.id === student?.grade_level_id);
  const unit = grade?.units.find((u) => u.lessons.some((l) => l.id === lessonId));
  const lesson = unit?.lessons.find((l) => l.id === lessonId);
  if (!student || !grade || !unit || !lesson) notFound();

  const { data: materials } = await supabase.from("materials").select("id, title, kind, body").eq("lesson_id", lesson.id).order("created_at");
  const titleLocale = student.edition === "ar" ? "ar" : "en";
  const domain = lesson.domain ?? unit.domain;
  const page = student.edition === "ar" ? (lesson.page_ar ?? lesson.page_en) : lesson.page_en;

  return (
    <div className={domainClass(domain)}>
      <Link href="/s" className="inline-block py-2 text-sm text-pencil underline underline-offset-4">
        {t("back")}
      </Link>
      <header className="tile object-panel mt-2 flex items-center gap-5 rounded-[var(--radius-sheet)] p-5">
        <div className="w-24 shrink-0 sm:w-32">
          <UnitObject domain={domain} />
        </div>
        <div className="min-w-0">
          <LessonCode code={lesson.code} size="xl" />
          <h1 className="mt-1 text-2xl font-extrabold">
            <LocalizedTitle {...localTitle(lesson, titleLocale)} />
          </h1>
          {page ? <p className="text-sm text-pencil">{tc("page", { page })}</p> : null}
        </div>
      </header>

      <section aria-labelledby="materials-title" className="mt-8">
        <h2 id="materials-title" className="text-xl font-extrabold">
          {t("title")}
        </h2>
        {(materials ?? []).length === 0 ? (
          <p className="mt-2 text-pencil">{t("empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-ruling rounded-[var(--radius-sheet)] border border-ruling bg-surface">
            {(materials ?? []).map((m) => (
              <li key={m.id} className="px-4 py-3">
                <p className="text-xs text-pencil">{t(`kind.${m.kind}`)}</p>
                <p className="text-lg font-semibold">{m.title}</p>
                {m.kind === "note" ? (
                  <p className="mt-2 whitespace-pre-line">{m.body}</p>
                ) : (
                  <a href={`/api/materials/${m.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                    {t("open")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
