import { getTranslations, setRequestLocale } from "next-intl/server";
import { Term } from "@/components/term";
import { Button, Input, PageTitle, Sheet } from "@/components/ui";
import { getSiteSettings } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { addAllowlistEmail, removeAllowlistEmail } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.settings");
  const tc = await getTranslations("common");
  const supabase = await createClient();
  const [settings, { data: allowlist }] = await Promise.all([
    getSiteSettings(),
    supabase.from("teacher_allowlist").select("email").order("email"),
  ]);

  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Sheet>
          <h2 className="mb-4 text-lg font-extrabold">{t("site")}</h2>
          <SettingsForm settings={settings} />
        </Sheet>
        <Sheet className="self-start">
          <h2 className="text-lg font-extrabold">{t("allowlist")}</h2>
          <p className="mt-1 text-xs text-pencil">{t("allowlistHint")}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {(allowlist ?? []).map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-2">
                <Term>{row.email}</Term>
                <form action={removeAllowlistEmail}>
                  <input type="hidden" name="email" value={row.email} />
                  <Button type="submit" variant="quiet">
                    {tc("delete")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addAllowlistEmail} className="mt-3 flex gap-2">
            <Input name="email" type="email" dir="ltr" required aria-label={t("allowlistAdd")} className="min-w-0 flex-1" />
            <Button type="submit" variant="secondary">
              {tc("add")}
            </Button>
          </form>
        </Sheet>
      </div>
    </>
  );
}
