"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import type { ScheduleSlot } from "@/lib/db/domain";
import { createGroup, updateGroup, type GroupFormState } from "./actions";

type GradeOption = { id: string; label: string; editions: ("ar" | "en")[] };
type GroupValues = {
  id: string;
  name: string;
  grade_level_id: string;
  edition: "ar" | "en";
  venue: "online" | "offline";
  meet_url: string | null;
  schedule: ScheduleSlot[];
};

export function GroupForm({ grades, group }: { grades: GradeOption[]; group?: GroupValues }) {
  const t = useTranslations("teacher.groups");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<GroupFormState, FormData>(group ? updateGroup : createGroup, {});
  const [gradeId, setGradeId] = useState(group?.grade_level_id ?? grades[grades.length - 1]?.id ?? "");
  const [venue, setVenue] = useState<"online" | "offline">(group?.venue ?? "offline");
  const [slots, setSlots] = useState<ScheduleSlot[]>(group?.schedule.length ? group.schedule : [{ weekday: 6, start: "16:00", minutes: 90 }]);
  const weekdays = t.raw("weekdays") as string[];
  const grade = grades.find((g) => g.id === gradeId);
  const err = state.errors ?? {};

  const setSlot = (i: number, patch: Partial<ScheduleSlot>) => setSlots((s) => s.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)));

  return (
    <form action={action} className="flex flex-col gap-4">
      {group && <input type="hidden" name="id" value={group.id} />}
      <input type="hidden" name="schedule" value={JSON.stringify(slots)} />
      {state.failed && <Notice tone="error">{tc("errorGeneric")}</Notice>}

      <Field id="group-name" label={t("name")} error={err.name && t("errors.name")}>
        <Input id="group-name" name="name" defaultValue={group?.name} placeholder={t("namePlaceholder")} required aria-invalid={Boolean(err.name)} />
      </Field>

      {!group && (
        <Field id="group-grade" label={tc("grade")}>
          <Select id="group-grade" name="grade_level_id" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {grade && grade.editions.length > 1 ? (
        <Field id="group-edition" label={tc("edition")}>
          <Select id="group-edition" name="edition" defaultValue={group?.edition ?? "en"}>
            <option value="en">{tc("editionEn")}</option>
            <option value="ar">{tc("editionAr")}</option>
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="edition" value="en" />
      )}

      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{tc("venue")}</legend>
        <div className="flex gap-4">
          {(["offline", "online"] as const).map((v) => (
            <label key={v} className="flex min-h-12 items-center gap-2">
              <input type="radio" name="venue" value={v} checked={venue === v} onChange={() => setVenue(v)} className="size-5" />
              {tc(v)}
            </label>
          ))}
        </div>
      </fieldset>

      {venue === "online" && (
        <Field id="group-meet" label={t("meetUrl")} hint={t("meetUrlHint")} error={err.meetUrl && t("errors.meetUrl")}>
          <Input id="group-meet" name="meet_url" type="url" dir="ltr" defaultValue={group?.meet_url ?? ""} aria-invalid={Boolean(err.meetUrl)} />
        </Field>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">{t("schedule")}</legend>
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs">
              {t("weekday")}
              <Select value={slot.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })} className="w-36">
                {weekdays.map((d, n) => (
                  <option key={d} value={n}>
                    {d}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col text-xs">
              {t("start")}
              <Input type="time" value={slot.start} onChange={(e) => setSlot(i, { start: e.target.value })} className="w-32" dir="ltr" />
            </label>
            <label className="flex flex-col text-xs">
              {t("minutes")}
              <Input
                type="number"
                min={15}
                max={360}
                step={15}
                value={slot.minutes}
                onChange={(e) => setSlot(i, { minutes: Number(e.target.value) })}
                className="w-24"
                dir="ltr"
              />
            </label>
            {slots.length > 1 && (
              <Button type="button" variant="quiet" onClick={() => setSlots((s) => s.filter((_, j) => j !== i))}>
                {t("removeSlot")}
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" className="self-start" onClick={() => setSlots((s) => [...s, { weekday: 2, start: "16:00", minutes: 90 }])}>
          {t("addSlot")}
        </Button>
        {err.schedule && (
          <p role="alert" className="text-xs font-semibold text-margin">
            {t("errors.schedule")}
          </p>
        )}
      </fieldset>

      <Button type="submit" disabled={pending} className="self-start">
        {tc("save")}
      </Button>
    </form>
  );
}
