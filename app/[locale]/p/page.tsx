import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementFeed } from "@/components/announcement-feed";
import { Button, Sheet, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/viewer";
import { getSiteSettings } from "@/lib/curriculum";
import { parseSchedule } from "@/lib/db/domain";
import { createClient } from "@/lib/supabase/server";
import { confirmConsent } from "./actions";

/** One screen per child, readable by someone who has never used a web app (§5.3). */
export default async function ParentHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireRole("parent", locale);
  const t = await getTranslations("parent");
  const tg = await getTranslations("teacher.groups");
  const supabase = await createClient();

  const [{ data: children }, { data: consents }, settings] = await Promise.all([
    supabase.from("students").select("id, display_name, group_id").order("display_name"),
    supabase.from("consents").select("student_id, method, parent_id").eq("method", "parent_portal").is("withdrawn_at", null),
    getSiteSettings(),
  ]);
  const groupIds = (children ?? []).map((c) => c.group_id).filter((g): g is string => Boolean(g));
  const { data: groups } = groupIds.length
    ? await supabase.from("groups").select("id, name, schedule").in("id", groupIds)
    : { data: [] as { id: string; name: string; schedule: unknown }[] };
  const groupById = new Map((groups ?? []).map((g) => [g.id, g]));

  // Attendance over the last 30 days, per child (RLS limits this to the parent's own children).
  const since = new Date(new Date().getTime() - 30 * 24 * 3600_000).toISOString();
  const { data: marks } = await supabase.from("attendance").select("student_id, status").gte("marked_at", since);
  const tally = new Map<string, { present: number; late: number; absent: number }>();
  for (const m of marks ?? []) {
    const row = tally.get(m.student_id) ?? { present: 0, late: 0, absent: 0 };
    row[m.status] += 1;
    tally.set(m.student_id, row);
  }
  const confirmed = new Set((consents ?? []).filter((c) => c.parent_id === viewer.subjectId).map((c) => c.student_id));
  const weekdays = tg.raw("weekdays") as string[];
  const firstNames = (children ?? []).map((c) => c.display_name.split(" ")[0] ?? c.display_name);

  return (
    <>
      <h1 className="text-2xl font-extrabold">{t("hello", { names: firstNames.join(locale === "ar" ? " و" : " & ") })}</h1>

      <div className="mt-6 flex flex-col gap-6">
        {(children ?? []).map((child) => {
          const group = child.group_id ? groupById.get(child.group_id) : null;
          const slots = group ? parseSchedule(group.schedule) : [];
          return (
            <Sheet key={child.id} aria-labelledby={`child-${child.id}`} className="flex flex-col gap-3">
              <h2 id={`child-${child.id}`} className="text-xl font-extrabold">
                {child.display_name}
              </h2>

              {!confirmed.has(child.id) && (
                <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-s-4 border-ink p-3">
                  <p className="font-semibold">{t("consentTitle")}</p>
                  <p className="text-base">{t("consentBody", { name: child.display_name })}</p>
                  <form action={confirmConsent}>
                    <input type="hidden" name="student_id" value={child.id} />
                    <Button type="submit">{t("consentAgree")}</Button>
                  </form>
                </div>
              )}

              {group && <p>{t("group", { group: group.name })}</p>}
              {slots.length > 0 && (
                <p>{t("schedule", { slots: slots.map((s) => `${weekdays[s.weekday]} ${s.start}`).join(locale === "ar" ? "، " : ", ") })}</p>
              )}
              <p className="font-semibold">{tally.has(child.id) ? t("attendanceSummary", tally.get(child.id)!) : t("noAttendanceYet")}</p>
              <p className="text-base text-pencil">{t("comingSoon", { name: child.display_name.split(" ")[0] ?? child.display_name })}</p>
            </Sheet>
          );
        })}
      </div>

      <AnnouncementFeed />

      {settings?.whatsapp_e164 && (
        <a
          href={`https://wa.me/${settings.whatsapp_e164.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("primary", "mt-8 w-full text-lg")}
        >
          {t("contactTeacher")}
        </a>
      )}
    </>
  );
}
