"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { zonedToUtc } from "@/lib/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 50 * 1024 * 1024;
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export type PrepareResult = { ok: true; path: string; token: string } | { ok: false; error: "type" | "size" | "failed" };

/**
 * Step 1 of an upload: a one-time signed URL so the browser sends the file straight to storage
 * (Vercel limits request bodies to ~4.5 MB, far below a textbook chapter). The object name is random,
 * the original file name is not trusted or stored.
 */
export async function prepareUpload(input: { type: string; size: number }): Promise<PrepareResult> {
  await requireRole("teacher", await getLocale());
  const ext = TYPES[input.type];
  if (!ext) return { ok: false, error: "type" };
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_BYTES) return { ok: false, error: "size" };
  const path = `${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("materials").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "failed" };
  return { ok: true, path, token: data.token };
}

const input = z
  .object({
    title: z.string().trim().min(1).max(160),
    kind: z.enum(["pdf", "image", "video_link", "link", "note"]),
    gradeId: z.uuid(),
    lessonId: z.uuid().nullable(),
    edition: z.enum(["ar", "en"]).nullable(),
    releaseAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
    watermark: z.boolean(),
    groupIds: z.array(z.uuid()).max(50),
    url: z.string().trim().max(500).nullable(),
    body: z.string().trim().max(10000).nullable(),
    storageKey: z.string().regex(/^[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/).nullable(),
  })
  .refine((v) => (v.kind === "pdf" || v.kind === "image" ? v.storageKey : v.kind === "note" ? v.body : v.url?.startsWith("https://")), "missing content");

export type MaterialInput = z.input<typeof input>;

/** Step 2: save the row (and its group restrictions) after the file is in storage. */
export async function createMaterial(raw: MaterialInput): Promise<{ ok: boolean }> {
  const viewer = await requireRole("teacher", await getLocale());
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const v = parsed.data;

  let releaseAt: string | null = null;
  if (v.releaseAt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.releaseAt)!;
    releaseAt = zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), "Africa/Cairo").toISOString();
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("materials")
    .insert({
      title: v.title,
      kind: v.kind,
      storage_key: v.kind === "pdf" || v.kind === "image" ? v.storageKey : null,
      url: v.kind === "video_link" || v.kind === "link" ? v.url : null,
      body: v.kind === "note" ? v.body : null,
      grade_level_id: v.gradeId,
      lesson_id: v.lessonId,
      edition: v.edition,
      release_at: releaseAt,
      watermark: v.kind === "pdf" && v.watermark,
      created_by: viewer.userId,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false };

  if (v.groupIds.length > 0) {
    const { error: groupError } = await supabase.from("material_groups").insert(v.groupIds.map((group_id) => ({ material_id: row.id, group_id })));
    if (groupError) {
      await supabase.from("materials").delete().eq("id", row.id); // never leave a restricted file visible to everyone
      return { ok: false };
    }
  }
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

export async function deleteMaterial(formData: FormData) {
  await requireRole("teacher", await getLocale());
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { data: row } = await supabase.from("materials").select("storage_key").eq("id", id).maybeSingle();
  await supabase.from("materials").delete().eq("id", id);
  if (row?.storage_key) await createAdminClient().storage.from("materials").remove([row.storage_key]);
  revalidatePath("/[locale]", "layout");
}
