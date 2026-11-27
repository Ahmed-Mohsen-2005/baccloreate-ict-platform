import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DecryptTitle } from "@/components/decrypt-title";
import { LessonCode } from "@/components/lesson-code";
import { LocalizedTitle } from "@/components/localized-title";
import { platformName } from "@/lib/brand";
import { SiteHeader } from "@/components/site-header";
import { UnitObject } from "@/components/unit-object";
import { buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getViewer, homeFor } from "@/lib/auth/viewer";
import { getCurriculum, getSiteSettings, localTitle } from "@/lib/curriculum";
import { domainClass } from "@/lib/db/domain";

type Props = { params: Promise<{ locale: string; grade: string; code: string }> };

/** Public unit page: the unit's object, its lessons, and (Cybersecurity) the decrypt moment. */
export default async function UnitPage({ params }: Props) {
  const { locale, grade: gradeCode, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tu = await getTranslations("unitPage");
  const tc = await getTranslations("common");

  const [curriculum, settings, viewer] = await Promise.all([getCurriculum(), getSiteSettings(), getViewer()]);
  const grade = curriculum.find((g) => g.code === gradeCode);
  const unit = grade?.units.find((u) => u.code === decodeURIComponent(code));
  if (!grade || !unit) notFound();

  const title = localTitle(unit, locale);
  const home = viewer ? homeFor(viewer.role) : "/login";

  return (
    <>
      <SiteHeader brand={platformName(settings, locale, t("title"))} signedIn={Boolean(viewer)} theme={viewer?.theme ?? "system"} />
      <main id="main" className={`${domainClass(unit.domain)} mx-auto max-w-6xl px-4 pb-20 pt-6`}>
        <Link href={{ pathname: "/", query: { grade: grade.code } }} className="inline-block py-2 text-sm text-pencil underline underline-offset-4">
          {tu("back")}
        </Link>

        <header className="mt-3 grid items-center gap-6 md:grid-cols-[minmax(0,24rem)_1fr]">
          <div className="tile object-panel rounded-[var(--radius-sheet)] p-6">
            <div className="mx-auto max-w-80">
              <UnitObject domain={unit.domain} />
            </div>
          </div>
          <div>
            <p className="font-display text-4xl font-extrabold leading-none text-accent">{unit.code}</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              <LocalizedTitle {...title} />
            </h1>
            <p className="mt-3 flex flex-wrap gap-x-4 text-pencil">
              <span>{t("lessonsCount", { count: unit.lessons.length })}</span>
              {unit.term ? <span>{t("term", { n: unit.term })}</span> : null}
            </p>
            <Link href={home} className={buttonClass("primary", "mt-5")}>
              {tu("openLogin")}
            </Link>
          </div>
        </header>

        <section aria-labelledby="lessons-title" className="mt-12">
          <h2 id="lessons-title" className="text-xl font-extrabold">
            {tu("lessonsTitle")}
          </h2>
          <ol className="mt-4 divide-y divide-ruling border-y border-ruling">
            {unit.lessons.map((lesson) => {
              const lt = localTitle(lesson, locale);
              const domain = lesson.domain ?? unit.domain;
              const page = locale === "ar" ? (lesson.page_ar ?? lesson.page_en) : lesson.page_en;
              return (
                <li key={lesson.id} className={`${domainClass(domain)} flex items-center gap-4 py-4`}>
                  <span className="w-20 shrink-0">
                    <LessonCode code={lesson.code} size="lg" />
                  </span>
                  <span className="min-w-0 flex-1 text-lg font-semibold">
                    {domain === "cipher" ? <DecryptTitle text={lt.text} lang={lt.lang} hint={tu("decryptHint")} /> : <LocalizedTitle {...lt} />}
                  </span>
                  {page ? <span className="shrink-0 text-xs text-pencil">{tc("page", { page })}</span> : null}
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </>
  );
}
