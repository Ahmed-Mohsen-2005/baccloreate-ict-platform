import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Button, Notice } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { getViewer, homeFor } from "@/lib/auth/viewer";
import { getSiteSettings } from "@/lib/curriculum";
import { startGoogleSignIn } from "./actions";
import { CodeForm } from "./code-form";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ as?: string; error?: string; why?: string }> };

const GOOGLE_ERRORS = ["google_unknown", "google_failed", "not_teacher", "generic"] as const;

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { as, error, why } = await searchParams;
  const reason = /^[a-z_]{2,20}$/.test(why ?? "") ? why : null; // short code for support, never free text
  const t = await getTranslations("login");

  const [viewer, settings] = await Promise.all([getViewer(), getSiteSettings()]);
  if (viewer?.role) redirect({ href: homeFor(viewer.role), locale });

  const tab = as === "parent" || as === "teacher" ? as : "student";
  const googleError = GOOGLE_ERRORS.find((e) => e === error);
  const tabs = [
    { key: "student", label: t("asStudent") },
    { key: "parent", label: t("asParent") },
    { key: "teacher", label: t("asTeacher") },
  ] as const;

  return (
    <>
      <SiteHeader brand={settings?.teacher_title || t("title")} theme={viewer?.theme ?? "system"} />
      <main id="main" className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>

        <nav className="mt-4 flex border-b border-ruling" aria-label={t("title")}>
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={{ pathname: "/login", query: { as: item.key } }}
              aria-current={tab === item.key ? "page" : undefined}
              className="-mb-px flex-1 border-b-4 border-transparent py-3 text-center font-semibold text-pencil aria-[current=page]:border-ink aria-[current=page]:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-6">
          {googleError && (
            <Notice tone="error">
              {t(`errors.${googleError}`)}
              {reason && (
                <span className="mt-1 block font-mono text-xs text-pencil" dir="ltr">
                  code: {reason}
                </span>
              )}
            </Notice>
          )}

          {tab !== "teacher" && <CodeForm key={tab} kind={tab} />}

          {tab !== "teacher" && (
            <p className="text-center text-xs text-pencil" aria-hidden>
              {t("or")}
            </p>
          )}

          <form action={startGoogleSignIn} className="flex flex-col gap-2">
            <input type="hidden" name="as" value={tab === "teacher" ? "teacher" : "member"} />
            <Button type="submit" variant={tab === "teacher" ? "primary" : "secondary"}>
              {t("google")}
            </Button>
            <p className="text-xs text-pencil">{tab === "teacher" ? t("teacherHint") : t("googleHint")}</p>
          </form>
        </div>
      </main>
    </>
  );
}
