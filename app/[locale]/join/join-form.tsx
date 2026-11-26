"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { submitJoinRequest, type JoinState } from "./actions";

export function JoinForm({ grades }: { grades: { id: string; label: string }[] }) {
  const t = useTranslations("join");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<JoinState, FormData>(submitJoinRequest, {});
  const err = state.errors ?? {};

  if (state.ok) {
    return (
      <Notice tone="success">
        <p className="font-semibold">{t("sentTitle")}</p>
        <p>{t("sentBody")}</p>
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.rateLimited && <Notice tone="error">{t("errors.rateLimited")}</Notice>}
      {state.failed && <Notice tone="error">{tc("errorGeneric")}</Notice>}

      <Field id="name" label={t("studentName")} error={err.name && t("errors.name")}>
        <Input id="name" name="name" required autoComplete="off" aria-invalid={Boolean(err.name)} />
      </Field>
      <Field id="grade" label={tc("grade")} error={err.grade && t("errors.grade")}>
        <Select id="grade" name="grade" required defaultValue="" aria-invalid={Boolean(err.grade)}>
          <option value="" disabled />
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{tc("venue")}</legend>
        <div className="flex gap-4">
          {(["online", "offline"] as const).map((v) => (
            <label key={v} className="flex min-h-12 items-center gap-2">
              <input type="radio" name="venue" value={v} required className="size-5" /> {tc(v)}
            </label>
          ))}
        </div>
        {err.venue && (
          <p role="alert" className="text-xs font-semibold text-margin">
            {t("errors.venue")}
          </p>
        )}
      </fieldset>
      <Field id="gender" label={<>{tc("gender")} <span className="font-normal text-pencil">{tc("optional")}</span></>}>
        <Select id="gender" name="gender" defaultValue="">
          <option value="">{tc("genderUnknown")}</option>
          <option value="m">{tc("male")}</option>
          <option value="f">{tc("female")}</option>
        </Select>
      </Field>
      <Field id="parentPhone" label={t("parentPhone")} error={err.parentPhone && t("errors.parentPhone")}>
        <Input id="parentPhone" name="parentPhone" type="tel" inputMode="tel" dir="ltr" required autoComplete="tel" aria-invalid={Boolean(err.parentPhone)} />
      </Field>
      <Field id="parentEmail" label={<>{t("parentEmail")} <span className="font-normal text-pencil">{tc("optional")}</span></>}>
        <Input id="parentEmail" name="parentEmail" type="email" dir="ltr" autoComplete="email" />
      </Field>
      <Field id="studentPhone" label={<>{t("studentPhone")} <span className="font-normal text-pencil">{tc("optional")}</span></>} error={err.studentPhone && t("errors.studentPhone")}>
        <Input id="studentPhone" name="studentPhone" type="tel" inputMode="tel" dir="ltr" aria-invalid={Boolean(err.studentPhone)} />
      </Field>
      <Field id="studentEmail" label={<>{t("studentEmail")} <span className="font-normal text-pencil">{tc("optional")}</span></>} error={err.email && t("errors.email")}>
        <Input id="studentEmail" name="studentEmail" type="email" dir="ltr" aria-invalid={Boolean(err.email)} />
      </Field>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consent" required className="mt-1 size-5 shrink-0" aria-invalid={Boolean(err.consent)} />
          <span>{t("consent")}</span>
        </label>
        <Link href="/privacy" className="ps-8 text-xs underline underline-offset-4">
          {t("privacyLink")}
        </Link>
        {err.consent && (
          <p role="alert" className="text-xs font-semibold text-margin">
            {t("errors.consent")}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
