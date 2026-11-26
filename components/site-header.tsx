import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/actions/auth";
import { setTheme } from "@/app/actions/preferences";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";

export type NavItem = { href: string; label: string };

/** One quiet header for every area. Bold things live in the page, not here. */
export async function SiteHeader({
  brand,
  nav = [],
  signedIn = false,
  theme,
}: {
  brand: string;
  nav?: NavItem[];
  signedIn?: boolean;
  theme: "system" | "light" | "dark";
}) {
  const t = await getTranslations("common");
  const themes = [
    { value: "system", label: t("themeSystem") },
    { value: "light", label: t("themeLight") },
    { value: "dark", label: t("themeDark") },
  ] as const;

  return (
    <header className="border-b border-ruling bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold no-underline">
          {brand}
        </Link>
        <div className="ms-auto flex items-center gap-3 text-xs">
          <LanguageSwitch />
          <form action={setTheme} className="flex items-center gap-1" aria-label={t("theme")}>
            {themes.map((option) => (
              <button
                key={option.value}
                name="theme"
                value={option.value}
                aria-pressed={theme === option.value}
                className="rounded-[var(--radius-chip)] px-2 py-1 aria-pressed:bg-ink aria-pressed:text-paper"
              >
                {option.label}
              </button>
            ))}
          </form>
          {signedIn && (
            <form action={signOut}>
              <button className="underline underline-offset-4">{t("signOut")}</button>
            </form>
          )}
        </div>
        {nav.length > 0 && (
          <nav className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4" aria-label="main">
            <ul className="flex gap-1 whitespace-nowrap">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block rounded-[var(--radius-chip)] px-3 py-2 font-semibold hover:bg-surface">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
