"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { loginWithCode, type LoginState } from "./actions";

export function CodeForm({ kind }: { kind: "student" | "parent" }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithCode, {});
  const codeError = state.error && state.error !== "last4" ? t(`errors.${state.error}`) : undefined;
  const last4Error = state.error === "last4" ? t("errors.last4") : undefined;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <Field id="code" label={t("codeLabel")} hint={kind === "parent" ? t("parentCodeHint") : t("codeHint")} error={codeError}>
        <Input
          id="code"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={9}
          dir="ltr"
          className="font-mono text-xl tracking-[0.2em]"
          aria-describedby={`code-hint${codeError ? " code-error" : ""}`}
          aria-invalid={Boolean(codeError)}
        />
      </Field>
      {kind === "parent" && (
        <Field id="last4" label={t("last4Label")} hint={t("last4Hint")} error={last4Error}>
          <Input
            id="last4"
            name="last4"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            dir="ltr"
            className="w-32 font-mono text-xl tracking-[0.2em]"
            aria-describedby={`last4-hint${last4Error ? " last4-error" : ""}`}
            aria-invalid={Boolean(last4Error)}
          />
        </Field>
      )}
      <Button type="submit" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
