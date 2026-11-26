"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import type { StudentRow } from "@/lib/db/types";
import { updateStudent, type StudentFormState } from "../actions";

export function StudentForm({
  student,
  groups,
  editions,
}: {
  student: StudentRow;
  groups: { id: string; name: string }[];
  editions: ("ar" | "en")[];
}) {
  const t = useTranslations("teacher.students");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<StudentFormState, FormData>(updateStudent, {});
  const err = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={student.id} />
      {state.saved && <Notice tone="success">{tc("saved")}</Notice>}
      {state.failed && <Notice tone="error">{tc("errorGeneric")}</Notice>}

      <Field id="display_name" label={tc("name")} error={err.name && t("errors.name")}>
        <Input id="display_name" name="display_name" defaultValue={student.display_name} required aria-invalid={Boolean(err.name)} />
      </Field>
      <Field id="group_id" label={tc("group")}>
        <Select id="group_id" name="group_id" defaultValue={student.group_id ?? ""}>
          <option value="">{tc("noGroup")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>
      {editions.length > 1 ? (
        <Field id="edition" label={tc("edition")}>
          <Select id="edition" name="edition" defaultValue={student.edition}>
            <option value="en">{tc("editionEn")}</option>
            <option value="ar">{tc("editionAr")}</option>
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="edition" value="en" />
      )}
      <Field id="venue" label={tc("venue")}>
        <Select id="venue" name="venue" defaultValue={student.venue}>
          <option value="offline">{tc("offline")}</option>
          <option value="online">{tc("online")}</option>
        </Select>
      </Field>
      <Field id="gender" label={tc("gender")}>
        <Select id="gender" name="gender" defaultValue={student.gender ?? ""}>
          <option value="">{tc("genderUnknown")}</option>
          <option value="m">{tc("male")}</option>
          <option value="f">{tc("female")}</option>
        </Select>
      </Field>
      <Field id="phone" label={tc("phone")} error={err.phone && t("errors.phone")}>
        <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={student.phone_e164 ?? ""} aria-invalid={Boolean(err.phone)} />
      </Field>
      <Field
        id="google_email"
        label={t("googleEmail")}
        error={(err.email && t("errors.email")) || (err.emailTaken && t("errors.emailTaken"))}
      >
        <Input id="google_email" name="google_email" type="email" dir="ltr" defaultValue={student.google_email ?? ""} aria-invalid={Boolean(err.email || err.emailTaken)} />
      </Field>
      <Field id="status" label={t("status")}>
        <Select id="status" name="status" defaultValue={student.status === "archived" ? "archived" : "active"}>
          <option value="active">{t("statuses.active")}</option>
          <option value="archived">{t("statuses.archived")}</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {tc("save")}
      </Button>
    </form>
  );
}
