import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Button, PageTitle, Sheet } from "@/components/ui";
import { getCurriculum } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { deleteAnnouncement } from "./actions";
import { AnnouncementForm } from "./announcement-form";

export default async function AnnouncementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.announcements");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const supabase = await createClient();

  const [{ data: groups }, { data: items }, curriculum] = await Promise.all([
    supabase.from("groups").select("id, name").is("archived_at", null).order("name"),
    supabase.from("announcements").select("*").order("publish_at", { ascending: false }).limit(50),
    getCurriculum(),
  ]);
  const grades = curriculum.map((g) => ({ id: g.id, label: (locale === "ar" ? g.title_ar : g.title_en) ?? g.code }));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const gradeLabel = new Map(grades.map((g) => [g.id, g.label]));
  const now = new Date();

  const audienceText = (a: (typeof items extends (infer R)[] | null ? R : never)) =>
    a.audience === "all_students" ? t("allStudents")
    : a.audience === "all_parents" ? t("allParents")
    : a.audience === "group" ? t("audienceGroup", { name: groupName.get(a.group_id ?? "") ?? "" })
    : t("audienceGrade", { name: gradeLabel.get(a.grade_level_id ?? "") ?? "" });

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Sheet>
          <AnnouncementForm groups={groups ?? []} grades={grades} />
        </Sheet>
        <div>
          {(items ?? []).length === 0 ? (
            <p className="text-pencil">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(items ?? []).map((a) => (
                <li key={a.id} className="rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4">
                  <p className="text-xs text-pencil">
                    {audienceText(a)}
                    {" — "}
                    {new Date(a.publish_at) > now
                      ? t("scheduled", { date: format.dateTime(new Date(a.publish_at), { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }) })
                      : format.dateTime(new Date(a.publish_at), { dateStyle: "medium", timeZone: "Africa/Cairo" })}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">{a.title}</p>
                  <p className="mt-1 whitespace-pre-line">{a.body}</p>
                  <form action={deleteAnnouncement} className="mt-2">
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="quiet">
                      {tc("delete")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
