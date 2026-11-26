"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link href={pathname} locale={other} lang={other} className="font-semibold underline underline-offset-4">
      {t("language")}
    </Link>
  );
}
