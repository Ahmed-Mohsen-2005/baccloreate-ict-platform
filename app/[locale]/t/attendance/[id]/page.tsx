import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageTitle } from "@/components/ui";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { CheckinPanel } from "../checkin-panel";
import { Roster, type RosterStudent } from "../roster";

export default async function SessionAttendance({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.attendance");
  const format = await getFormatter();
  const supabase = await createClient();

  const { data: session } = await supabase.from("class_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();
  const [{ data: group }, { data: students }, { data: marks }] = await Promise.all([
    supabase.from("groups").select("name, venue, timezone").eq("id", session.group_id).single(),
    supabase.from("students").select("id, display_name").eq("group_id", session.group_id).eq("status", "active").is("deleted_at", null).order("display_name"),
    supabase.from("attendance").select("student_id, status, method").eq("session_id", id),
  ]);
  const markBy = new Map((marks ?? []).map((m) => [m.student_id, m]));
  const roster: RosterStudent[] = (students ?? []).map((s) => ({
    id: s.id,
    name: s.display_name,
    status: markBy.get(s.id)?.status ?? null,
    method: markBy.get(s.id)?.method ?? null,
  }));

  return (
    <>
      <PageTitle intro={format.dateTime(new Date(session.starts_at), { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: group?.timezone })}>
        {group?.name ?? t("title")}
      </PageTitle>
      <div className="flex flex-col gap-6">
        <CheckinPanel sessionId={session.id} siteUrl={serverEnv().NEXT_PUBLIC_SITE_URL} locale={locale} />
        {roster.length === 0 ? <p className="text-pencil">{t("emptyGroup")}</p> : <Roster sessionId={session.id} students={roster} />}
      </div>
    </>
  );
}
