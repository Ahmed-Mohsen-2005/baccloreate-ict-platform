import { getTranslations, setRequestLocale } from "next-intl/server";
import { platformName } from "@/lib/brand";
import { SiteHeader } from "@/components/site-header";
import { PageTitle } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { getCurriculum, getSiteSettings } from "@/lib/curriculum";
import { JoinForm } from "./join-form";

export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("join");
  const [curriculum, settings, viewer] = await Promise.all([getCurriculum(), getSiteSettings(), getViewer()]);
  const grades = curriculum.map((g) => ({ id: g.id, label: locale === "ar" ? g.title_ar : g.title_en }));

  return (
    <>
      <SiteHeader brand={platformName(settings, locale, t("title"))} signedIn={Boolean(viewer)} theme={viewer?.theme ?? "system"} />
      <main id="main" className="mx-auto max-w-md px-4 py-8">
        <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
        <JoinForm grades={grades} />
      </main>
    </>
  );
}
