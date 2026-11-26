import { getTranslations, setRequestLocale } from "next-intl/server";
import { LessonCode } from "@/components/lesson-code";
import { LocalizedTitle } from "@/components/localized-title";
import { SiteHeader } from "@/components/site-header";
import { buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getViewer, homeFor } from "@/lib/auth/viewer";
import { getCurriculum, getSiteSettings, localTitle } from "@/lib/curriculum";
import { domainClass } from "@/lib/db/domain";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ grade?: string }> };

/** Landing: the hero is the textbook's contents page (§5). Zero client JS beyond the language switch. */
export default async function Home({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { grade: gradeParam } = await searchParams;
  const t = await getTranslations("landing");
  const tPrivacy = await getTranslations("privacy");

  const [curriculum, settings, viewer] = await Promise.all([getCurriculum(), getSiteSettings(), getViewer()]);
  const grades = [...curriculum].reverse(); // Grade 11 first
  const selected = grades.find((g) => g.code === gradeParam) ?? grades[0];
  const brand = settings?.teacher_title || t("title");
  const bio = locale === "ar" ? settings?.bio_ar : settings?.bio_en;
  const home = viewer ? homeFor(viewer.role) : "/login";

  return (
    <>
      <SiteHeader brand={brand} signedIn={Boolean(viewer)} theme={viewer?.theme ?? "system"} />
      <main id="main" className="mx-auto max-w-5xl px-4 pb-16">
        <section aria-labelledby="hero-title" className="pt-8 sm:pt-14">
          <h1 id="hero-title" className="text-3xl font-extrabold sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-lg text-pencil">{t("subtitle")}</p>

          <nav aria-label={t("contents")} className="mt-6 flex gap-2 border-b border-ruling">
            {grades.map((g) => {
              const current = g.code === selected?.code;
              return (
                <Link
                  key={g.code}
                  href={{ pathname: "/", query: { grade: g.code } }}
                  aria-current={current ? "page" : undefined}
                  className="-mb-px border-b-4 border-transparent px-3 py-2 font-display font-semibold text-pencil aria-[current=page]:border-ink aria-[current=page]:text-ink"
                >
                  {locale === "ar" ? g.title_ar : g.title_en}
                </Link>
              );
            })}
          </nav>

          {selected && (
            <div className="mt-4">
              <p className="text-xs text-pencil">
                {selected.editions.length === 1 ? `${t("wholeYear")}. ${t("englishOnly")}` : null}
              </p>
              <ol className="mt-2 divide-y divide-ruling">
                {selected.units.map((unit) => {
                  const title = localTitle(unit, locale);
                  return (
                    <li key={unit.id} className={domainClass(unit.domain)}>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-baseline gap-3 py-3 [&::-webkit-details-marker]:hidden">
                          <span className="unit-rule w-10 shrink-0 ps-2 font-display text-2xl font-extrabold text-accent">{unit.code}</span>
                          <span className="flex-1 text-lg font-semibold">
                            <LocalizedTitle {...title} />
                          </span>
                          <span className="flex shrink-0 flex-col items-end text-xs text-pencil sm:flex-row sm:gap-3">
                            {unit.term ? <span>{t("term", { n: unit.term })}</span> : null}
                            <span>{t("lessonsCount", { count: unit.lessons.length })}</span>
                          </span>
                          <span aria-hidden className="text-pencil transition-transform group-open:rotate-90 rtl:-scale-x-100">
                            ›
                          </span>
                        </summary>
                        <ol className="mb-4 grid gap-2 ps-12 sm:grid-cols-2">
                          {unit.lessons.map((lesson) => {
                            const lt = localTitle(lesson, locale);
                            return (
                              <li key={lesson.id} className={`flex items-baseline gap-3 ${lesson.domain ? domainClass(lesson.domain) : ""}`}>
                                <LessonCode code={lesson.code} size="md" />
                                <LocalizedTitle {...lt} />
                              </li>
                            );
                          })}
                        </ol>
                      </details>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={home} className={buttonClass("primary")}>
              {t("ctaLogin")}
            </Link>
            <Link href="/join" className={buttonClass("secondary")}>
              {t("ctaJoin")}
            </Link>
          </div>
        </section>

        <section aria-labelledby="get-title" className="mt-14 max-w-prose">
          <h2 id="get-title" className="text-xl font-extrabold">
            {t("whatYouGetTitle")}
          </h2>
          <ul className="mt-3 list-disc space-y-1 ps-5 marker:text-pencil">
            {(["materials", "simulations", "quizzes", "mastery", "parents"] as const).map((key) => (
              <li key={key}>{t(`whatYouGet.${key}`)}</li>
            ))}
          </ul>
        </section>

        {settings?.teacher_name && (
          <section aria-labelledby="about-title" className="mt-14 max-w-prose">
            <h2 id="about-title" className="text-xl font-extrabold">
              {t("aboutTitle")}
            </h2>
            <p className="mt-2 text-lg font-semibold">{settings.teacher_name}</p>
            {settings.years_experience ? <p className="text-pencil">{t("years", { count: settings.years_experience })}</p> : null}
            {bio && <p className="mt-2 whitespace-pre-line">{bio}</p>}
          </section>
        )}
      </main>
      <footer className="border-t border-ruling">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-pencil">
          <Link href="/privacy" className="underline underline-offset-4">
            {tPrivacy("title")}
          </Link>
        </div>
      </footer>
    </>
  );
}
