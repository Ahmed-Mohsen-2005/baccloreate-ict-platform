"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type { AttendanceMethod, AttendanceStatus } from "@/lib/db/types";
import { markAllPresent, markAttendance } from "./actions";

export type RosterStudent = { id: string; name: string; status: AttendanceStatus | null; method: AttendanceMethod | null };

const OPTIONS: AttendanceStatus[] = ["present", "late", "absent"];
const TONE: Record<AttendanceStatus, string> = {
  present: "aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:border-ink",
  late: "aria-pressed:bg-[#8a5300] aria-pressed:text-white aria-pressed:border-[#8a5300]",
  absent: "aria-pressed:bg-margin aria-pressed:text-paper aria-pressed:border-margin",
};

/** One-handed roster: 48px targets, optimistic updates, "all present". */
export function Roster({ sessionId, students }: { sessionId: string; students: RosterStudent[] }) {
  const t = useTranslations("teacher.attendance");
  const [rows, setRows] = useState(students);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (studentId: string, status: AttendanceStatus) => {
    const before = rows;
    setRows((r) => r.map((s) => (s.id === studentId ? { ...s, status, method: "tap" } : s)));
    setFailed(false);
    startTransition(async () => {
      const res = await markAttendance(sessionId, studentId, status);
      if (!res.ok) {
        setRows(before);
        setFailed(true);
      }
    });
  };

  const all = () => {
    const before = rows;
    setRows((r) => r.map((s) => (s.status ? s : { ...s, status: "present", method: "tap" })));
    startTransition(async () => {
      const res = await markAllPresent(sessionId);
      if (!res.ok) {
        setRows(before);
        setFailed(true);
      }
    });
  };

  const counts = { present: 0, late: 0, absent: 0 };
  for (const r of rows) if (r.status) counts[r.status] += 1;

  return (
    <section aria-labelledby="roster-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="roster-title" className="text-xl font-extrabold">
          {t("roster")}
        </h2>
        <p className="text-sm text-pencil" aria-live="polite">
          {t("counts", counts)}
        </p>
      </div>
      <Button type="button" variant="secondary" onClick={all} disabled={pending} className="self-start">
        {t("allPresent")}
      </Button>
      {failed && (
        <p role="alert" className="font-semibold text-margin">
          {t("saveFailed")}
        </p>
      )}
      <ul className="divide-y divide-ruling rounded-[var(--radius-sheet)] border border-ruling bg-surface">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{s.name}</span>
              {s.method && s.method !== "tap" && <span className="ms-2 text-xs text-pencil">{t(`methods.${s.method}`)}</span>}
            </span>
            <span className="flex gap-1.5" role="group" aria-label={s.name}>
              {OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={s.status === o}
                  onClick={() => set(s.id, o)}
                  className={`min-h-12 min-w-16 rounded-[var(--radius-control)] border border-ruling px-3 text-sm font-semibold ${TONE[o]}`}
                >
                  {t(o)}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
