import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { parseSchedule } from "@/lib/db/domain";
import { sessionsOn } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

/** Today's sessions (created from each group's weekly schedule, idempotently) with live attendance counts. */
export default async function AttendancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.attendance");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const supabase = await createClient();
  const now = new Date();

  const { data: groups } = await supabase.from("groups").select("id, name, venue, schedule, timezone").is("archived_at", null);
  const wanted = (groups ?? []).flatMap((g) =>
    sessionsOn(parseSchedule(g.schedule), now, g.timezone).map((s) => ({
      group_id: g.id,
      starts_at: s.startsAt.toISOString(),
      ends_at: s.endsAt.toISOString(),
    })),
  );
  if (wanted.length > 0) await supabase.from("class_sessions").upsert(wanted, { onConflict: "group_id,starts_at", ignoreDuplicates: true });

  const dayStart = new Date(now.getTime() - 14 * 3600_000).toISOString();
  const dayEnd = new Date(now.getTime() + 14 * 3600_000).toISOString();
  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, group_id, starts_at, ends_at")
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd)
    .order("starts_at");
  const ids = (sessions ?? []).map((s) => s.id);
  const [{ data: marks }, { data: students }] = await Promise.all([
    ids.length ? supabase.from("attendance").select("session_id, status").in("session_id", ids) : Promise.resolve({ data: [] as { session_id: string; status: string }[] }),
    supabase.from("students").select("group_id").eq("status", "active").is("deleted_at", null),
  ]);
  const groupById = new Map((groups ?? []).map((g) => [g.id, g]));
  const size = new Map<string, number>();
  for (const s of students ?? []) if (s.group_id) size.set(s.group_id, (size.get(s.group_id) ?? 0) + 1);
  const present = new Map<string, number>();
  for (const m of marks ?? []) if (m.status !== "absent") present.set(m.session_id, (present.get(m.session_id) ?? 0) + 1);

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
      {(sessions ?? []).length === 0 ? (
        <p className="text-pencil">{t("noSessions")}</p>
      ) : (
        <ul className="divide-y divide-ruling rounded-[var(--radius-sheet)] border border-ruling bg-surface">
          {(sessions ?? []).map((s) => {
            const g = groupById.get(s.group_id);
            return (
              <li key={s.id}>
                <Link href={`/t/attendance/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 no-underline hover:bg-paper">
                  <span className="flex flex-col">
                    <span className="text-lg font-extrabold">{g?.name}</span>
                    <span className="text-xs text-pencil">
                      {format.dateTime(new Date(s.starts_at), { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: g?.timezone })} · {g ? tc(g.venue) : ""}
                    </span>
                  </span>
                  <span className="font-display text-2xl font-extrabold">
                    {present.get(s.id) ?? 0}/{size.get(s.group_id) ?? 0}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
