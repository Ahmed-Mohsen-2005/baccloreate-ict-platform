import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth/viewer";
import { getSiteSettings } from "@/lib/curriculum";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as { h: string; p: string }[];
  const [settings, viewer] = await Promise.all([getSiteSettings(), getViewer()]);

  return (
    <>
      <SiteHeader brand={settings?.teacher_title || t("title")} signedIn={Boolean(viewer)} theme={viewer?.theme ?? "system"} />
      <main id="main" className="mx-auto max-w-prose px-4 py-8">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="text-xs text-pencil">{t("updated")}</p>
        {sections.map((s) => (
          <section key={s.h} className="mt-6">
            <h2 className="text-lg font-extrabold">{s.h}</h2>
            <p className="mt-1">{s.p}</p>
          </section>
        ))}
      </main>
    </>
  );
}
