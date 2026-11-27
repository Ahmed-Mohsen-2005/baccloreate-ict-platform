import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Button, PageTitle, Sheet } from "@/components/ui";
import { getCurriculum } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { deleteMaterial } from "./actions";
import { MaterialForm, type FormGrade } from "./material-form";

export default async function MaterialsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher.materials");
  const tk = await getTranslations("materials.kind");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const supabase = await createClient();

  const [curriculum, { data: groups }, { data: items }, { data: restricted }] = await Promise.all([
    getCurriculum(),
    supabase.from("groups").select("id, name, grade_level_id").is("archived_at", null).order("name"),
    supabase.from("materials").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("material_groups").select("material_id"),
  ]);
  const grades: FormGrade[] = curriculum.map((g) => ({
    id: g.id,
    label: (locale === "ar" ? g.title_ar : g.title_en) ?? g.code,
    editions: g.editions,
    lessons: g.units.flatMap((u) => u.lessons.map((l) => ({ id: l.id, label: `${l.code} ${(locale === "ar" && l.title_ar) || l.title_en}` }))),
    groups: (groups ?? []).filter((x) => x.grade_level_id === g.id).map((x) => ({ id: x.id, name: x.name })),
  }));
  const lessonLabel = new Map(grades.flatMap((g) => g.lessons.map((l) => [l.id, l.label] as const)));
  const restrictedIds = new Set((restricted ?? []).map((r) => r.material_id));
  const now = new Date();

  return (
    <>
      <PageTitle intro={t("intro")}>{t("title")}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Sheet>
          <MaterialForm grades={grades} />
        </Sheet>
        <div>
          {(items ?? []).length === 0 ? (
            <p className="text-pencil">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(items ?? []).map((m) => (
                <li key={m.id} className="rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4">
                  <p className="text-xs text-pencil">
                    {tk(m.kind)}
                    {m.lesson_id ? ` — ${lessonLabel.get(m.lesson_id) ?? ""}` : ""}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">{m.title}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-pencil">
                    {m.release_at && new Date(m.release_at) > now && (
                      <span>{t("scheduled", { date: format.dateTime(new Date(m.release_at), { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }) })}</span>
                    )}
                    {restrictedIds.has(m.id) && <span>{t("restricted")}</span>}
                    {m.watermark && <span>{t("watermarked")}</span>}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {m.kind !== "note" && (
                      <a href={`/api/materials/${m.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                        {t("open")}
                      </a>
                    )}
                    <form action={deleteMaterial}>
                      <input type="hidden" name="id" value={m.id} />
                      <Button type="submit" variant="quiet">
                        {tc("delete")}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
