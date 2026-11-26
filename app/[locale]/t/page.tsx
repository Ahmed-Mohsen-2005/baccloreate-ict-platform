import { getTranslations, setRequestLocale } from "next-intl/server";
import { Notice, PageTitle, Sheet, buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.dashboard");
  const supabase = await createClient();

  const [students, noGroup, pending, parents, codeMessages, settings] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("students").select("id", { count: "exact", head: true }).is("deleted_at", null).is("group_id", null),
    supabase.from("join_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("parents").select("id").is("deleted_at", null),
    supabase.from("messages").select("recipient_parent_id").eq("template", "codes"),
    getSiteSettings(),
  ]);

  const studentCount = students.count ?? 0;
  const sentTo = new Set((codeMessages.data ?? []).map((m) => m.recipient_parent_id));
  const unsentFamilies = (parents.data ?? []).filter((p) => !sentTo.has(p.id)).length;

  const items = [
    { show: (noGroup.count ?? 0) > 0, text: t("noGroup", { count: noGroup.count ?? 0 }), href: "/t/students?filter=nogroup" },
    { show: (pending.count ?? 0) > 0, text: t("pendingRequests", { count: pending.count ?? 0 }), href: "/t/join-requests" },
    { show: unsentFamilies > 0, text: t("codesNotSent", { count: unsentFamilies }), href: "/t/codes" },
  ].filter((i) => i.show);

  return (
    <>
      <PageTitle>{t("title")}</PageTitle>

      {!settings?.teacher_title && (
        <div className="mb-4">
          <Notice>
            {t("setupSettings")}{" "}
            <Link href="/t/settings" className="font-semibold underline underline-offset-4">
              {t("setupSettingsCta")}
            </Link>
          </Notice>
        </div>
      )}

      {studentCount === 0 ? (
        <Sheet className="max-w-prose">
          <h2 className="text-xl font-extrabold">{t("emptyTitle")}</h2>
          <p className="mt-2 text-pencil">{t("emptyBody")}</p>
          <Link href="/t/students/import" className={buttonClass("primary", "mt-4")}>
            {t("importCta")}
          </Link>
        </Sheet>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-display text-3xl font-extrabold">{t("students", { count: studentCount })}</p>
          {items.length > 0 && (
            <ul className="divide-y divide-ruling rounded-[var(--radius-sheet)] border border-ruling bg-surface">
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex min-h-12 items-center px-4 py-3 font-semibold no-underline hover:bg-paper">
                    {item.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
