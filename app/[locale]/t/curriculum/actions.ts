"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { DOMAINS } from "@/lib/db/domain";
import { createClient } from "@/lib/supabase/server";

const optionalText = z.string().trim().max(300).transform((v) => (v === "" ? null : v));
const optionalPage = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().int().positive().max(2000).nullable());

const lessonSchema = z.object({
  code: z.string().trim().min(1).max(12),
  title_en: z.string().trim().min(1).max(300),
  title_ar: optionalText,
  page_en: optionalPage,
  page_ar: optionalPage,
});

const unitSchema = z.object({
  code: z.string().trim().min(1).max(12),
  title_en: z.string().trim().min(1).max(300),
  title_ar: optionalText,
  term: z.enum(["", "1", "2"]).transform((v) => (v === "" ? null : Number(v))),
  domain: z.enum(DOMAINS),
});

const topicSchema = z.object({
  title_en: z.string().trim().min(1).max(120),
  title_ar: optionalText,
});

const uuid = z.uuid();

function fields(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

async function guard() {
  await requireRole("teacher", await getLocale());
  return createClient();
}

function refresh() {
  revalidatePath("/[locale]/t/curriculum", "page");
  revalidatePath("/[locale]", "page");
}

export async function updateLesson(formData: FormData) {
  const supabase = await guard();
  const id = uuid.parse(formData.get("id"));
  const data = lessonSchema.parse(fields(formData, ["code", "title_en", "title_ar", "page_en", "page_ar"]));
  await supabase.from("lessons").update(data).eq("id", id);
  refresh();
}

export async function addLesson(formData: FormData) {
  const supabase = await guard();
  const unitId = uuid.parse(formData.get("unit_id"));
  const data = lessonSchema.parse(fields(formData, ["code", "title_en", "title_ar", "page_en", "page_ar"]));
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  await supabase.from("lessons").insert({ ...data, unit_id: unitId, position: (count ?? 0) + 1 });
  refresh();
}

export async function deleteLesson(formData: FormData) {
  const supabase = await guard();
  await supabase.from("lessons").delete().eq("id", uuid.parse(formData.get("id")));
  refresh();
}

export async function updateTopic(formData: FormData) {
  const supabase = await guard();
  const id = uuid.parse(formData.get("id"));
  const data = topicSchema.parse(fields(formData, ["title_en", "title_ar"]));
  const { error } = await supabase.from("topics").update(data).eq("id", id);
  if (error) throw new Error(`Could not update topic: ${error.message}`);
  refresh();
}

export async function addTopic(formData: FormData) {
  const supabase = await guard();
  const lessonId = uuid.parse(formData.get("lesson_id"));
  const data = topicSchema.parse(fields(formData, ["title_en", "title_ar"]));
  const { count, error: countError } = await supabase.from("topics").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  if (countError) throw new Error(`Could not count lesson topics: ${countError.message}`);
  const { error } = await supabase.from("topics").insert({ ...data, lesson_id: lessonId, position: (count ?? 0) + 1 });
  if (error) throw new Error(`Could not add topic: ${error.message}`);
  refresh();
}

export async function deleteTopic(formData: FormData) {
  const supabase = await guard();
  const id = uuid.parse(formData.get("id"));
  const lessonId = uuid.parse(formData.get("lesson_id"));
  const { count, error: countError } = await supabase.from("topics").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  if (countError) throw new Error(`Could not count lesson topics: ${countError.message}`);
  if ((count ?? 0) <= 1) return;
  const { error } = await supabase.from("topics").delete().eq("id", id).eq("lesson_id", lessonId);
  if (error) throw new Error(`Could not delete topic: ${error.message}`);
  refresh();
}

export async function updateUnit(formData: FormData) {
  const supabase = await guard();
  const id = uuid.parse(formData.get("id"));
  const data = unitSchema.parse(fields(formData, ["code", "title_en", "title_ar", "term", "domain"]));
  await supabase.from("units").update(data).eq("id", id);
  refresh();
}

export async function addUnit(formData: FormData) {
  const supabase = await guard();
  const gradeId = uuid.parse(formData.get("grade_level_id"));
  const data = unitSchema.parse(fields(formData, ["code", "title_en", "title_ar", "term", "domain"]));
  const { count } = await supabase.from("units").select("id", { count: "exact", head: true }).eq("grade_level_id", gradeId);
  await supabase.from("units").insert({ ...data, grade_level_id: gradeId, position: (count ?? 0) + 1 });
  refresh();
}

/** Moves a unit or lesson one step up/down among its siblings, then saves the whole order at once. */
export async function move(formData: FormData) {
  const supabase = await guard();
  const table = z.enum(["units", "lessons", "topics"]).parse(formData.get("table"));
  const id = uuid.parse(formData.get("id"));
  const dir = formData.get("dir") === "up" ? -1 : 1;

  const siblings =
    table === "lessons"
      ? await (async () => {
          const { data: row } = await supabase.from("lessons").select("unit_id").eq("id", id).single();
          const { data } = await supabase.from("lessons").select("id").eq("unit_id", row?.unit_id ?? "").order("position");
          return data ?? [];
        })()
      : table === "topics"
        ? await (async () => {
            const { data: row } = await supabase.from("topics").select("lesson_id").eq("id", id).single();
            const { data } = await supabase.from("topics").select("id").eq("lesson_id", row?.lesson_id ?? "").order("position");
            return data ?? [];
          })()
      : await (async () => {
          const { data: row } = await supabase.from("units").select("grade_level_id").eq("id", id).single();
          const { data } = await supabase.from("units").select("id").eq("grade_level_id", row?.grade_level_id ?? "").order("position");
          return data ?? [];
        })();

  const ids = siblings.map((s) => s.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await supabase.rpc("reorder", { p_table: table, p_ids: ids });
  refresh();
}
