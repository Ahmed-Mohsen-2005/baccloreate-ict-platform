import { getTranslations, setRequestLocale } from "next-intl/server";
import { LessonCode } from "@/components/lesson-code";
import { LocalizedTitle } from "@/components/localized-title";
import { Button, Input, PageTitle, Select } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCurriculum, getTopics, localTitle, type CurriculumUnit } from "@/lib/curriculum";
import { DOMAINS, domainClass } from "@/lib/db/domain";
import type { TopicRow } from "@/lib/db/types";
import { addLesson, addTopic, addUnit, deleteLesson, deleteTopic, move, updateLesson, updateTopic, updateUnit } from "./actions";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ grade?: string }> };

function MoveButtons({ table, id, labels }: { table: "units" | "lessons" | "topics"; id: string; labels: { up: string; down: string } }) {
  return (
    <form action={move} className="flex gap-1">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <button name="dir" value="up" aria-label={labels.up} title={labels.up} className="size-10 rounded-[var(--radius-control)] border border-ruling">
        ↑
      </button>
      <button name="dir" value="down" aria-label={labels.down} title={labels.down} className="size-10 rounded-[var(--radius-control)] border border-ruling">
        ↓
      </button>
    </form>
  );
}

export default async function CurriculumEditor({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { grade: gradeParam } = await searchParams;
  const t = await getTranslations("teacher.curriculum");
  const tc = await getTranslations("common");
  const [curriculum, topics] = await Promise.all([getCurriculum(), getTopics()]);
  const topicsByLesson = new Map<string, TopicRow[]>();
  for (const topic of topics) topicsByLesson.set(topic.lesson_id, [...(topicsByLesson.get(topic.lesson_id) ?? []), topic]);
  const lessonTopics = (lessonId: string) => topicsByLesson.get(lessonId) ?? [];
  const grades = [...curriculum].reverse();
  const grade = grades.find((g) => g.code === gradeParam) ?? grades[0];
  const moveLabels = { up: tc("moveUp"), down: tc("moveDown") };
  const bilingual = (grade?.editions.length ?? 0) > 1;

  const unitFields = (unit?: CurriculumUnit) => (
    <div className="grid gap-2 sm:grid-cols-[6rem_1fr_1fr]">
      <label className="flex flex-col text-xs">
        {t("code")}
        <Input name="code" defaultValue={unit?.code} required dir="ltr" />
      </label>
      <label className="flex flex-col text-xs">
        {t("titleEn")}
        <Input name="title_en" defaultValue={unit?.title_en} required dir="ltr" />
      </label>
      <label className="flex flex-col text-xs">
        {t("titleAr")}
        <Input name="title_ar" defaultValue={unit?.title_ar ?? ""} dir="rtl" />
      </label>
      <label className="flex flex-col text-xs">
        {t("term")}
        <Select name="term" defaultValue={unit?.term ? String(unit.term) : ""}>
          <option value="">{t("termNone")}</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </Select>
      </label>
      <label className="flex flex-col text-xs sm:col-span-2">
        {t("domain")}
        <Select name="domain" defaultValue={unit?.domain ?? "programming"}>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {t(`domains.${d}`)}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );

  const lessonFields = (lesson?: CurriculumUnit["lessons"][number]) => (
    <div className="grid gap-2 sm:grid-cols-[6rem_1fr_1fr]">
      <label className="flex flex-col text-xs">
        {t("code")}
        <Input name="code" defaultValue={lesson?.code} required dir="ltr" />
      </label>
      <label className="flex flex-col text-xs">
        {t("titleEn")}
        <Input name="title_en" defaultValue={lesson?.title_en} required dir="ltr" />
      </label>
      <label className="flex flex-col text-xs">
        {t("titleAr")}
        <Input name="title_ar" defaultValue={lesson?.title_ar ?? ""} dir="rtl" />
      </label>
      <label className="flex flex-col text-xs">
        {t("pageEn")}
        <Input name="page_en" defaultValue={lesson?.page_en ?? ""} inputMode="numeric" dir="ltr" />
      </label>
      {bilingual && (
        <label className="flex flex-col text-xs">
          {t("pageAr")}
          <Input name="page_ar" defaultValue={lesson?.page_ar ?? ""} inputMode="numeric" dir="ltr" />
        </label>
      )}
      {!bilingual && <input type="hidden" name="page_ar" value="" />}
    </div>
  );

  const topicFields = (topic?: TopicRow) => (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col text-xs">
        {t("titleEn")}
        <Input name="title_en" defaultValue={topic?.title_en} required dir="ltr" maxLength={120} />
      </label>
      <label className="flex flex-col text-xs">
        {t("titleAr")}
        <Input name="title_ar" defaultValue={topic?.title_ar ?? ""} dir="rtl" maxLength={300} />
      </label>
    </div>
  );

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>

      <nav className="mb-6 flex gap-2 border-b border-ruling">
        {grades.map((g) => (
          <Link
            key={g.code}
            href={{ pathname: "/t/curriculum", query: { grade: g.code } }}
            aria-current={g.code === grade?.code ? "page" : undefined}
            className="-mb-px border-b-4 border-transparent px-3 py-2 font-semibold text-pencil aria-[current=page]:border-ink aria-[current=page]:text-ink"
          >
            {locale === "ar" ? g.title_ar : g.title_en}
          </Link>
        ))}
      </nav>

      {grade && (
        <ol className="flex flex-col gap-6">
          {grade.units.map((unit) => (
            <li key={unit.id} className={`${domainClass(unit.domain)} unit-rule rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4`}>
              <div className="flex items-start gap-3">
                <details className="flex-1">
                  <summary className="cursor-pointer text-lg font-extrabold">
                    <span className="text-accent">{t("unit", { code: unit.code })}</span>{" "}
                    <LocalizedTitle {...localTitle(unit, locale)} />
                  </summary>
                  <form action={updateUnit} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="id" value={unit.id} />
                    {unitFields(unit)}
                    <Button type="submit" variant="secondary" className="self-start">
                      {tc("save")}
                    </Button>
                  </form>
                </details>
                <MoveButtons table="units" id={unit.id} labels={moveLabels} />
              </div>

              <h3 className="mt-4 text-xs font-semibold text-pencil">{t("lessons")}</h3>
              <ol className="mt-2 divide-y divide-ruling">
                {unit.lessons.map((lesson) => (
                  <li key={lesson.id} className={`flex items-start gap-3 py-2 ${lesson.domain ? domainClass(lesson.domain) : ""}`}>
                    <details className="flex-1">
                      <summary className="flex cursor-pointer items-baseline gap-3">
                        <LessonCode code={lesson.code} size="md" />
                        <LocalizedTitle {...localTitle(lesson, locale)} />
                      </summary>
                      <form action={updateLesson} className="mt-3 flex flex-col gap-3">
                        <input type="hidden" name="id" value={lesson.id} />
                        {lessonFields(lesson)}
                        <Button type="submit" variant="secondary" className="self-start">
                          {tc("save")}
                        </Button>
                      </form>
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-margin">{t("dangerZone")}</summary>
                        <form action={deleteLesson} className="mt-2 flex flex-col gap-2">
                          <input type="hidden" name="id" value={lesson.id} />
                          <p className="text-xs">{t("deleteConfirm")}</p>
                          <Button type="submit" variant="danger" className="self-start">
                            {t("deleteLesson")}
                          </Button>
                        </form>
                      </details>
                      <section aria-label={t("topicsForLesson", { code: lesson.code })} className="mt-4 rounded-[var(--radius-control)] border border-ruling bg-paper p-3">
                        <h4 className="text-sm font-bold">{t("topics")}</h4>
                        <ol className="mt-2 divide-y divide-ruling">
                          {lessonTopics(lesson.id).map((topic) => (
                            <li key={topic.id} className="flex items-start gap-2 py-2">
                              <form action={updateTopic} className="flex min-w-0 flex-1 flex-col gap-2">
                                <input type="hidden" name="id" value={topic.id} />
                                {topicFields(topic)}
                                <Button type="submit" variant="secondary" className="self-start">
                                  {tc("save")}
                                </Button>
                              </form>
                              <MoveButtons table="topics" id={topic.id} labels={moveLabels} />
                              {lessonTopics(lesson.id).length > 1 && (
                                <form action={deleteTopic}>
                                  <input type="hidden" name="id" value={topic.id} />
                                  <input type="hidden" name="lesson_id" value={lesson.id} />
                                  <Button type="submit" variant="danger" aria-label={t("deleteTopicNamed", { title: locale === "ar" && topic.title_ar ? topic.title_ar : topic.title_en })}>
                                    {t("deleteTopic")}
                                  </Button>
                                </form>
                              )}
                            </li>
                          ))}
                        </ol>
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold">{t("addTopic")}</summary>
                          <form action={addTopic} className="mt-3 flex flex-col gap-2">
                            <input type="hidden" name="lesson_id" value={lesson.id} />
                            {topicFields()}
                            <Button type="submit" variant="secondary" className="self-start">
                              {t("addTopic")}
                            </Button>
                          </form>
                        </details>
                      </section>
                    </details>
                    <MoveButtons table="lessons" id={lesson.id} labels={moveLabels} />
                  </li>
                ))}
              </ol>

              <details className="mt-3">
                <summary className="cursor-pointer font-semibold">{t("addLesson")}</summary>
                <form action={addLesson} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="unit_id" value={unit.id} />
                  {lessonFields()}
                  <Button type="submit" variant="secondary" className="self-start">
                    {t("addLesson")}
                  </Button>
                </form>
              </details>
            </li>
          ))}
        </ol>
      )}

      {grade && (
        <details className="mt-6 rounded-[var(--radius-sheet)] border border-dashed border-ruling p-4">
          <summary className="cursor-pointer font-semibold">{t("addUnit")}</summary>
          <form action={addUnit} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="grade_level_id" value={grade.id} />
            {unitFields()}
            <Button type="submit" variant="secondary" className="self-start">
              {t("addUnit")}
            </Button>
          </form>
        </details>
      )}
    </>
  );
}
