import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { LessonCode } from "@/components/lesson-code";
import { LocalizedTitle } from "@/components/localized-title";
import { buttonClass } from "@/components/ui";
import { UnitObject } from "@/components/unit-object";
import { requireRole } from "@/lib/auth/viewer";
import { getCurriculum, localTitle } from "@/lib/curriculum";
import { domainClass, parseSchedule } from "@/lib/db/domain";
import { canJoinNow, nextSession } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

export default async function StudentHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireRole("student", locale);
  const t = await getTranslations("student");
  const format = await getFormatter();
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", viewer.subjectId ?? "").maybeSingle();
  if (!student) return <p>{t("noGroupYet")}</p>;

  const [{ data: group }, curriculum] = await Promise.all([
    student.group_id ? supabase.from("groups").select("*").eq("id", student.group_id).maybeSingle() : Promise.resolve({ data: null }),
    getCurriculum(),
  ]);
  const grade = curriculum.find((g) => g.id === student.grade_level_id);
  const session = group ? nextSession(parseSchedule(group.schedule), new Date(), group.timezone) : null;
  // Titles follow the student's book edition; Grade 10 is English only.
  const titleLocale = student.edition === "ar" ? "ar" : "en";

  return (
    <>
      <h1 className="text-2xl font-extrabold">{t("hello", { name: student.display_name.split(" ")[0] ?? student.display_name })}</h1>
      <p className="mt-1 text-pencil">{group ? t("yourGroup", { group: group.name }) : t("noGroupYet")}</p>

      {session && (
        <section className="mt-4 flex flex-col gap-3 rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4">
          <p className="text-lg font-semibold">
            {t("nextSession", {
              when: format.dateTime(session.startsAt, { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: group?.timezone }),
            })}
          </p>
          {group?.venue === "online" && group.meet_url && canJoinNow(session) && (
            <a href={group.meet_url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "self-start")}>
              {t("joinMeet")}
            </a>
          )}
        </section>
      )}

      {grade && (
        <section aria-labelledby="curriculum-title" className="mt-8">
          <h2 id="curriculum-title" className="text-xl font-extrabold">
            {t("curriculumTitle")}
          </h2>
          <p className="text-xs text-pencil">{t("mapComingSoon")}</p>
          <ol className="mt-4 flex flex-col gap-5">
            {grade.units.map((unit) => (
              <li key={unit.id} className={`${domainClass(unit.domain)} tile flex items-stretch gap-4 overflow-hidden rounded-[var(--radius-sheet)] bg-surface`}>
                <div className="object-panel w-24 shrink-0 self-stretch p-2 sm:w-32">
                  <div className="flex h-full items-center">
                    <UnitObject domain={unit.domain} />
                  </div>
                </div>
                <div className="min-w-0 flex-1 py-3 pe-3">
                  <p className="font-display text-lg font-extrabold leading-snug">
                    <span className="text-accent">{unit.code}</span> <LocalizedTitle {...localTitle(unit, titleLocale)} />
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {unit.lessons.map((lesson) => (
                      <li key={lesson.id} className={lesson.domain ? domainClass(lesson.domain) : ""}>
                        <LessonCode code={lesson.code} size="lg" label={localTitle(lesson, titleLocale).text} />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
