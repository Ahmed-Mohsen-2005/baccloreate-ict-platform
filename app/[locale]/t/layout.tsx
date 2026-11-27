import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { requireRole } from "@/lib/auth/viewer";
import { getSiteSettings } from "@/lib/curriculum";

export default async function TeacherLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireRole("teacher", locale);
  const t = await getTranslations("teacher.nav");
  const settings = await getSiteSettings();

  const nav = [
    { href: "/t", label: t("dashboard") },
    { href: "/t/attendance", label: t("attendance") },
    { href: "/t/students", label: t("students") },
    { href: "/t/codes", label: t("codes") },
    { href: "/t/groups", label: t("groups") },
    { href: "/t/join-requests", label: t("joinRequests") },
    { href: "/t/curriculum", label: t("curriculum") },
    { href: "/t/settings", label: t("settings") },
  ];

  return (
    <>
      <SiteHeader brand={settings?.teacher_title || t("dashboard")} nav={nav} signedIn theme={viewer.theme} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-6 pb-16">
        {children}
      </main>
    </>
  );
}
