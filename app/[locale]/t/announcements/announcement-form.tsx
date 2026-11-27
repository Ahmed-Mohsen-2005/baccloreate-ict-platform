"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { createAnnouncement, type AnnouncementState } from "./actions";

export function AnnouncementForm({ groups, grades }: { groups: { id: string; name: string }[]; grades: { id: string; label: string }[] }) {
  const t = useTranslations("teacher.announcements");
  const [state, action, pending] = useActionState<AnnouncementState, FormData>(createAnnouncement, {});

  return (
    <form action={action} className="flex flex-col gap-4" key={state.saved ? "saved" : "form"}>
      {state.saved && <Notice tone="success">{t("published")}</Notice>}
      {state.error === "fields" && <Notice tone="error">{t("errors.fields")}</Notice>}
      {state.error === "failed" && <Notice tone="error">{t("errors.failed")}</Notice>}

      <Field id="audience" label={t("audience")}>
        <Select id="audience" name="audience" defaultValue="all_students">
          <option value="all_students">{t("allStudents")}</option>
          <option value="all_parents">{t("allParents")}</option>
          {grades.map((g) => (
            <option key={g.id} value={`grade:${g.id}`}>
              {t("audienceGrade", { name: g.label })}
            </option>
          ))}
          {groups.map((g) => (
            <option key={g.id} value={`group:${g.id}`}>
              {t("audienceGroup", { name: g.name })}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="title" label={t("titleLabel")}>
        <Input id="title" name="title" maxLength={120} required />
      </Field>
      <Field id="body" label={t("body")}>
        <Textarea id="body" name="body" maxLength={2000} required />
      </Field>
      <Field id="publish_at" label={t("publishAt")} hint={t("publishAtHint")}>
        <Input id="publish_at" name="publish_at" type="datetime-local" dir="ltr" className="w-64" />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {t("publish")}
      </Button>
    </form>
  );
}
