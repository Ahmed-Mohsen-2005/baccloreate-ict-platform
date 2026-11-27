import { getTranslations, setRequestLocale } from "next-intl/server";
import { platformName } from "@/lib/brand";
import { SiteHeader } from "@/components/site-header";
import { requireRole } from "@/lib/auth/viewer";
import { getSiteSettings } from "@/lib/curriculum";

export default async function StudentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireRole("student", locale);
  const [settings, t] = await Promise.all([getSiteSettings(), getTranslations("landing")]);
  return (
    <>
      <SiteHeader brand={platformName(settings, locale, t("title"))} signedIn theme={viewer.theme} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-6 pb-16">
        {children}
      </main>
    </>
  );
}
