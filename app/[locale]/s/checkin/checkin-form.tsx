"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice } from "@/components/ui";
import { checkIn, type CheckinState } from "./actions";

export function CheckinForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations("student.checkin");
  const [state, action, pending] = useActionState<CheckinState, FormData>(checkIn, {});

  if (state.done) return <Notice tone="success">{t("done")}</Notice>;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="code" label={t("codeLabel")} hint={t("hint")} error={state.error && t(`errors.${state.error}`)}>
        <Input
          id="code"
          name="code"
          defaultValue={initialCode}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          dir="ltr"
          required
          aria-invalid={Boolean(state.error)}
          className="w-40 font-mono text-3xl tracking-[0.3em]"
        />
      </Field>
      <Button type="submit" disabled={pending} className="min-h-14 self-start px-8 text-lg">
        {t("submit")}
      </Button>
    </form>
  );
}
