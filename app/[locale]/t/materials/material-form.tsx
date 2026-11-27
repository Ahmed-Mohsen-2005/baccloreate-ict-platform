"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { createMaterial, prepareUpload, type MaterialInput } from "./actions";

type Kind = MaterialInput["kind"];
export type FormGrade = { id: string; label: string; lessons: { id: string; label: string }[]; groups: { id: string; name: string }[]; editions: ("ar" | "en")[] };

const KINDS: Kind[] = ["pdf", "image", "link", "video_link", "note"];

export function MaterialForm({ grades }: { grades: FormGrade[] }) {
  const t = useTranslations("teacher.materials");
  const tk = useTranslations("materials.kind");
  const tc = useTranslations("common");
  const [kind, setKind] = useState<Kind>("pdf");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "saved" | "error">("idle");
  const [error, setError] = useState<"file" | "type" | "size" | "fields" | "failed" | null>(null);
  const grade = useMemo(() => grades.find((g) => g.id === gradeId), [grades, gradeId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setError(null);
    setStatus("uploading");

    let storageKey: string | null = null;
    if (kind === "pdf" || kind === "image") {
      const file = fd.get("file");
      if (!(file instanceof File) || file.size === 0) return fail("file");
      const prep = await prepareUpload({ type: file.type, size: file.size });
      if (!prep.ok) return fail(prep.error);
      const { error: uploadError } = await createBrowserSupabase().storage.from("materials").uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
      if (uploadError) return fail("failed");
      storageKey = prep.path;
    }

    const res = await createMaterial({
      title: get("title"),
      kind,
      gradeId,
      lessonId: get("lessonId") || null,
      edition: get("edition") === "ar" || get("edition") === "en" ? (get("edition") as "ar" | "en") : null,
      releaseAt: get("releaseAt") || null,
      watermark: fd.get("watermark") === "on",
      groupIds: fd.getAll("groupIds").map(String),
      url: get("url") || null,
      body: get("body") || null,
      storageKey,
    });
    if (!res.ok) return fail("fields");
    form.reset();
    setStatus("saved");

    function fail(code: "file" | "type" | "size" | "fields" | "failed") {
      setError(code);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {status === "saved" && <Notice tone="success">{t("saved")}</Notice>}
      {error && <Notice tone="error">{t(`errors.${error}`)}</Notice>}

      <Field id="m-title" label={t("titleLabel")}>
        <Input id="m-title" name="title" required maxLength={160} />
      </Field>
      <Field id="m-kind" label={t("kind")}>
        <Select id="m-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {tk(k)}
            </option>
          ))}
        </Select>
      </Field>

      {(kind === "pdf" || kind === "image") && (
        <Field id="m-file" label={t("file")} hint={t("fileHint")}>
          <input
            id="m-file"
            name="file"
            type="file"
            accept={kind === "pdf" ? "application/pdf" : "image/png,image/jpeg,image/webp"}
            className="block w-full text-base file:me-3 file:min-h-12 file:rounded-[var(--radius-control)] file:border file:border-ink file:bg-surface file:px-4 file:font-semibold"
          />
        </Field>
      )}
      {(kind === "link" || kind === "video_link") && (
        <Field id="m-url" label={t("url")} hint={t("urlHint")}>
          <Input id="m-url" name="url" type="url" dir="ltr" placeholder="https://" />
        </Field>
      )}
      {kind === "note" && (
        <Field id="m-body" label={t("body")}>
          <Textarea id="m-body" name="body" maxLength={10000} />
        </Field>
      )}

      <Field id="m-grade" label={tc("grade")}>
        <Select id="m-grade" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="m-lesson" label={t("lesson")}>
        <Select id="m-lesson" name="lessonId" key={gradeId} defaultValue="">
          <option value="">{t("noLesson")}</option>
          {grade?.lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
      </Field>
      {grade && grade.editions.length > 1 && (
        <Field id="m-edition" label={tc("edition")}>
          <Select id="m-edition" name="edition" defaultValue="">
            <option value="">{t("bothEditions")}</option>
            <option value="en">{tc("editionEn")}</option>
            <option value="ar">{tc("editionAr")}</option>
          </Select>
        </Field>
      )}
      <Field id="m-release" label={t("releaseAt")} hint={t("releaseHint")}>
        <Input id="m-release" name="releaseAt" type="datetime-local" dir="ltr" className="w-64" />
      </Field>

      {grade && grade.groups.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="font-semibold">{t("groups")}</legend>
          <p className="text-xs text-pencil">{t("groupsHint")}</p>
          {grade.groups.map((g) => (
            <label key={g.id} className="flex min-h-10 items-center gap-2">
              <input type="checkbox" name="groupIds" value={g.id} className="size-5" />
              {g.name}
            </label>
          ))}
        </fieldset>
      )}
      {kind === "pdf" && (
        <label className="flex items-start gap-3">
          <input type="checkbox" name="watermark" className="mt-1 size-5 shrink-0" />
          <span>{t("watermark")}</span>
        </label>
      )}

      <Button type="submit" disabled={status === "uploading"} className="self-start">
        {status === "uploading" ? t("uploading") : t("save")}
      </Button>
    </form>
  );
}
