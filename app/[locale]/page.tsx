import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureShowcase } from "@/components/feature-showcase";
import { HeroOrbit, type OrbitUnit } from "@/components/hero-orbit";
import { LessonCode } from "@/components/lesson-code";
import { LocalizedTitle } from "@/components/localized-title";
import { ParticleField } from "@/components/particle-field";
import { platformName } from "@/lib/brand";
import { SiteHeader } from "@/components/site-header";
import { buttonClass } from "@/components/ui";
import { UnitObject } from "@/components/unit-object";
import { Link } from "@/i18n/navigation";
import { getViewer, homeFor } from "@/lib/auth/viewer";
import { getCurriculum, getSiteSettings, localTitle } from "@/lib/curriculum";
import { domainClass } from "@/lib/db/domain";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ grade?: string }> };

// Literal class names so Tailwind can see them. Grade 11 has 7 units: 2 wide, 3 medium, 2 wide.
const SPAN: Record<number, string> = { 2: "md:col-span-2", 3: "md:col-span-3" };
const SEVEN_UNIT_PATTERN = [3, 3, 2, 2, 2, 3, 3];

/** Landing: a futuristic stage (orbit of unit worlds over a living network), then the bench and every feature. */
export default async function Home({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { grade: gradeParam } = await searchParams;
  const t = await getTranslations("landing");
  const tPrivacy = await getTranslations("privacy");

  const [curriculum, settings, viewer] = await Promise.all([getCurriculum(), getSiteSettings(), getViewer()]);
  const grades = [...curriculum].reverse(); // Grade 11 first
  const hero = grades[0];
  const selected = grades.find((g) => g.code === gradeParam) ?? hero;
  const brand = platformName(settings, locale, t("title"));
  const bio = locale === "ar" ? settings?.bio_ar : settings?.bio_en;
  const home = viewer ? homeFor(viewer.role) : "/login";
  const units = selected?.units ?? [];
  const pattern = units.length === 7 ? SEVEN_UNIT_PATTERN : units.map(() => 2);

  const orbitUnits: OrbitUnit[] = (hero?.units ?? []).map((u) => ({
    id: u.id,
    code: u.code,
    gradeCode: hero?.code ?? "",
    domain: u.domain,
    title: localTitle(u, locale).text,
  }));
  const marqueeLessons = (hero?.units ?? []).flatMap((u) => u.lessons.map((l) => ({ id: l.id, code: l.code, domain: l.domain ?? u.domain })));

  return (
    <>
      <SiteHeader brand={brand} signedIn={Boolean(viewer)} theme={viewer?.theme ?? "system"} />

      <div className="stage">
        <ParticleField />
        <section aria-labelledby="hero-title" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div>
            <h1 id="hero-title" className="shine text-[clamp(2.3rem,6.2vw,4.4rem)] font-extrabold leading-[1.4] pb-1">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-prose text-lg text-pencil sm:text-xl">{t("heroLead")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={home} className={buttonClass("primary", "min-h-14 px-7 text-lg")}>
                {t("ctaLogin")}
              </Link>
              <Link href="/join" className={buttonClass("secondary", "glass min-h-14 px-7 text-lg")}>
                {t("ctaJoin")}
              </Link>
            </div>
          </div>
          <HeroOrbit units={orbitUnits} label={t("orbitLabel")} />
        </section>

        <div className="marquee border-y border-ruling/60 py-4" aria-label={t("marqueeLabel")} role="group">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 gap-10" aria-hidden={copy === 1}>
                {marqueeLessons.map((l) => (
                  <li key={`${copy}-${l.id}`} className={domainClass(l.domain)}>
                    <LessonCode code={l.code} size="lg" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-20">
        <section aria-label={t("benchLabel")} className="mt-16">
          <nav aria-label={t("contents")} className="flex gap-2 border-b border-ruling">
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
          {selected && selected.editions.length === 1 && <p className="mt-2 text-xs text-pencil">{`${t("wholeYear")}. ${t("englishOnly")}`}</p>}

          <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
            {units.map((unit, i) => {
              const span = pattern[i] ?? 2;
              const odd = units.length % 2 === 1 && i === units.length - 1;
              return (
                <li key={unit.id} className={`reveal ${odd ? "col-span-2" : ""} ${SPAN[span]} ${domainClass(unit.domain)}`}>
                  <Link
                    href={`/units/${selected?.code}/${unit.code}`}
                    className="tile flex h-full flex-col overflow-hidden rounded-[var(--radius-sheet)] bg-surface no-underline"
                  >
                    <div className="object-panel px-4 pt-5 pb-3">
                      <div className={`mx-auto ${span === 3 ? "max-w-72" : "max-w-56"}`}>
                        <UnitObject domain={unit.domain} />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <span className="font-display text-2xl font-extrabold leading-none text-accent">{unit.code}</span>
                      <span className="text-base font-semibold leading-snug">
                        <LocalizedTitle {...localTitle(unit, locale)} />
                      </span>
                      <span className="mt-auto flex flex-wrap gap-x-3 pt-2 text-xs text-pencil">
                        <span>{t("lessonsCount", { count: unit.lessons.length })}</span>
                        {unit.term ? <span>{t("term", { n: unit.term })}</span> : null}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <FeatureShowcase />

        <section aria-labelledby="cta-title" className="reveal glass mt-24 flex flex-col items-start gap-4 p-8 sm:p-12">
          <h2 id="cta-title" className="shine text-3xl font-extrabold sm:text-4xl">
            {t("ctaBandTitle")}
          </h2>
          <p className="max-w-prose text-lg text-pencil">{t("ctaBandBody")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={home} className={buttonClass("primary", "min-h-14 px-7 text-lg")}>
              {t("ctaLogin")}
            </Link>
            <Link href="/join" className={buttonClass("secondary", "min-h-14 px-7 text-lg")}>
              {t("ctaJoin")}
            </Link>
          </div>
        </section>

        {settings?.teacher_name && (
          <section aria-labelledby="about-title" className="mt-20 max-w-prose">
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
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-pencil">
          <Link href="/privacy" className="underline underline-offset-4">
            {tPrivacy("title")}
          </Link>
        </div>
      </footer>
    </>
  );
}
