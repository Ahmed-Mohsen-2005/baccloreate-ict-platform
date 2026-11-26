"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";
import type { SiteSettingsRow } from "@/lib/db/types";
import { saveSiteSettings, type SettingsState } from "./actions";

export function SettingsForm({ settings }: { settings: SiteSettingsRow | null }) {
  const t = useTranslations("teacher.settings");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSiteSettings, {});
  const err = state.errors ?? {};
  const socials = (settings?.socials ?? {}) as Record<string, string>;

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.saved && <Notice tone="success">{tc("saved")}</Notice>}
      {state.failed && <Notice tone="error">{tc("errorGeneric")}</Notice>}
      <Field id="teacher_title" label={t("teacherTitle")} hint={t("teacherTitleHint")}>
        <Input id="teacher_title" name="teacher_title" defaultValue={settings?.teacher_title ?? ""} />
      </Field>
      <Field id="teacher_name" label={t("teacherName")}>
        <Input id="teacher_name" name="teacher_name" defaultValue={settings?.teacher_name ?? ""} />
      </Field>
      <Field id="bio_ar" label={t("bioAr")}>
        <Textarea id="bio_ar" name="bio_ar" dir="rtl" defaultValue={settings?.bio_ar ?? ""} />
      </Field>
      <Field id="bio_en" label={t("bioEn")}>
        <Textarea id="bio_en" name="bio_en" dir="ltr" defaultValue={settings?.bio_en ?? ""} />
      </Field>
      <Field id="years" label={t("years")} error={err.years && t("errors.years")}>
        <Input id="years" name="years" inputMode="numeric" dir="ltr" className="w-24" defaultValue={settings?.years_experience ?? ""} />
      </Field>
      <Field id="whatsapp" label={t("whatsapp")} error={err.whatsapp && t("errors.whatsapp")}>
        <Input id="whatsapp" name="whatsapp" type="tel" dir="ltr" defaultValue={settings?.whatsapp_e164 ?? ""} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">{t("socials")}</legend>
        {(["facebook", "youtube", "telegram"] as const).map((key) => (
          <label key={key} className="flex flex-col text-xs">
            {t(key)}
            <Input name={key} type="url" dir="ltr" defaultValue={socials[key] ?? ""} />
          </label>
        ))}
        {err.url && (
          <p role="alert" className="text-xs font-semibold text-margin">
            {t("errors.url")}
          </p>
        )}
      </fieldset>
      <Button type="submit" disabled={pending} className="self-start">
        {tc("save")}
      </Button>
    </form>
  );
}
