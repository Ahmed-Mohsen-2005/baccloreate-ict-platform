"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Term } from "@/components/term";
import { Button, Field, Notice, Select, Sheet, buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { ImportRow, Issue } from "@/lib/import/validate";
import { checkImportFile, commitImport, type CheckState, type CommitResult } from "./actions";

type GroupOption = { id: string; name: string; grade_code: string; venue: "online" | "offline" };

function groupIssues(issues: Issue[]) {
  const byRow = new Map<number, Issue[]>();
  for (const issue of issues) byRow.set(issue.rowNumber, [...(byRow.get(issue.rowNumber) ?? []), issue]);
  return [...byRow.entries()].sort((a, b) => a[0] - b[0]);
}

export function ImportWizard({ groups, gradeLabels }: { groups: GroupOption[]; gradeLabels: Record<string, string> }) {
  const t = useTranslations("teacher.import");
  const tc = useTranslations("common");
  const [check, checkAction, checking] = useActionState<CheckState, FormData>(checkImportFile, { status: "idle" });
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [attested, setAttested] = useState(false);
  const [editions, setEditions] = useState<Record<string, "ar" | "en">>({});
  const [result, setResult] = useState<CommitResult | null>(null);
  const [saving, startSaving] = useTransition();

  const validation = check.status === "checked" ? check.result : null;
  const rows: ImportRow[] = useMemo(
    () =>
      (validation?.rows ?? []).map((r) => ({
        ...r,
        group_id: assigned[r.external_id] || null,
        edition: r.grade_code === "g10" ? "en" : (editions[r.external_id] ?? r.edition),
      })),
    [validation, assigned, editions],
  );
  const combos = useMemo(() => [...new Set(rows.map((r) => `${r.grade_code}|${r.venue}`))], [rows]);
  const badRows = validation ? new Set(validation.errors.map((e) => e.rowNumber)).size : 0;

  const issueText = (issue: Issue) => t(`issues.${issue.code}`, { value: issue.value ?? "" });
  const groupsFor = (grade: string) => groups.filter((g) => g.grade_code === grade);

  if (result?.ok) {
    return (
      <Sheet className="flex flex-col gap-4">
        <Notice tone="success">{t("done", { created: result.created, updated: result.updated, parents: result.parents })}</Notice>
        <Link href="/t/codes" className={buttonClass("primary", "self-start")}>
          {t("nextCodes")}
        </Link>
      </Sheet>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Sheet>
        <form action={checkAction} className="flex flex-col gap-4">
          <Field id="file" label={t("file")}>
            <input
              id="file"
              name="file"
              type="file"
              required
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="block w-full text-base file:me-3 file:min-h-12 file:rounded-[var(--radius-control)] file:border file:border-ink file:bg-surface file:px-4 file:font-semibold"
            />
          </Field>
          <Field id="defaultEdition" label={t("defaultEdition")}>
            <Select id="defaultEdition" name="defaultEdition" defaultValue="en" className="w-48">
              <option value="en">{tc("editionEn")}</option>
              <option value="ar">{tc("editionAr")}</option>
            </Select>
          </Field>
          <Button type="submit" disabled={checking} className="self-start">
            {checking ? tc("loading") : t("check")}
          </Button>
        </form>
      </Sheet>

      {check.status === "fileError" && <Notice tone="error">{t(`fileErrors.${check.code}`)}</Notice>}

      {validation && validation.columns.missingRequired.length > 0 && (
        <Notice tone="error">
          {t("missingColumns", { columns: validation.columns.missingRequired.join(", ") })}
        </Notice>
      )}

      {validation && validation.columns.missingRequired.length === 0 && (
        <>
          <section aria-labelledby="preview-title" className="flex flex-col gap-3">
            <h2 id="preview-title" className="text-xl font-extrabold">
              {t("previewTitle")}
            </h2>
            <p className="font-semibold">{t("summary", { ok: rows.length, bad: badRows })}</p>
            {validation.columns.unknown.length > 0 && (
              <p className="text-xs text-pencil">
                {t("unknownColumns", { columns: validation.columns.unknown.join(", ") })}
              </p>
            )}
          </section>

          {validation.errors.length > 0 && (
            <section aria-labelledby="errors-title" className="unit-rule flex flex-col gap-2 ps-3" style={{ ["--accent" as string]: "var(--margin)" }}>
              <h3 id="errors-title" className="font-extrabold text-margin">
                {t("errorsTitle")}
              </h3>
              <p className="text-xs text-pencil">{t("errorsHint")}</p>
              <ul className="flex flex-col gap-1">
                {groupIssues(validation.errors).map(([row, issues]) => (
                  <li key={row}>
                    <span className="font-semibold">{t("row", { n: row })}: </span>
                    {issues.map(issueText).join(" — ")}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {validation.warnings.length > 0 && (
            <details className="flex flex-col gap-2">
              <summary className="cursor-pointer font-semibold">
                {t("warningsTitle")} ({validation.warnings.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {groupIssues(validation.warnings).map(([row, issues]) => (
                  <li key={row}>
                    <span className="font-semibold">{t("row", { n: row })}: </span>
                    {issues.map(issueText).join(" — ")}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {rows.length > 0 && (
            <Sheet className="flex flex-col gap-4">
              <h3 className="text-lg font-extrabold">{t("assignTitle")}</h3>
              <p className="text-xs text-pencil">{t("assignHint")}</p>

              <div className="flex flex-col gap-2">
                {combos.map((combo) => {
                  const [grade, venue] = combo.split("|") as [string, "online" | "offline"];
                  return (
                    <label key={combo} className="flex flex-wrap items-center gap-2">
                      <span className="min-w-48">{t("assignBulk", { grade: gradeLabels[grade] ?? grade, venue: tc(venue) })}</span>
                      <Select
                        className="w-56"
                        defaultValue=""
                        onChange={(e) => {
                          const groupId = e.target.value;
                          setAssigned((prev) => {
                            const next = { ...prev };
                            for (const r of rows) if (r.grade_code === grade && r.venue === venue) next[r.external_id] = groupId;
                            return next;
                          });
                        }}
                      >
                        <option value="">{tc("noGroup")}</option>
                        {groupsFor(grade).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                  );
                })}
              </div>

              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[40rem] text-start text-sm">
                  <thead className="text-xs text-pencil">
                    <tr className="border-b border-ruling">
                      <th className="py-2 text-start font-semibold">{tc("studentId")}</th>
                      <th className="py-2 text-start font-semibold">{tc("name")}</th>
                      <th className="py-2 text-start font-semibold">{tc("grade")}</th>
                      <th className="py-2 text-start font-semibold">{tc("venue")}</th>
                      <th className="py-2 text-start font-semibold">{tc("edition")}</th>
                      <th className="py-2 text-start font-semibold">{tc("group")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ruling">
                    {rows.map((r) => (
                      <tr key={r.external_id}>
                        <td className="py-2">
                          <Term>{r.external_id}</Term>
                        </td>
                        <td className="py-2 font-semibold">{r.display_name}</td>
                        <td className="py-2">{gradeLabels[r.grade_code]}</td>
                        <td className="py-2">{tc(r.venue)}</td>
                        <td className="py-2">
                          {r.grade_code === "g10" ? (
                            tc("editionEn")
                          ) : (
                            <Select
                              aria-label={`${tc("edition")}: ${r.display_name}`}
                              value={r.edition}
                              onChange={(e) => setEditions((p) => ({ ...p, [r.external_id]: e.target.value === "ar" ? "ar" : "en" }))}
                              className="min-h-10 w-28"
                            >
                              <option value="en">{tc("editionEn")}</option>
                              <option value="ar">{tc("editionAr")}</option>
                            </Select>
                          )}
                        </td>
                        <td className="py-2">
                          <Select
                            aria-label={`${tc("group")}: ${r.display_name}`}
                            value={r.group_id ?? ""}
                            onChange={(e) => setAssigned((p) => ({ ...p, [r.external_id]: e.target.value }))}
                            className="min-h-10 w-44"
                          >
                            <option value="">{tc("noGroup")}</option>
                            {groupsFor(r.grade_code).map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 size-5 shrink-0" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
                <span>{t("attest")}</span>
              </label>

              {result && !result.ok && <Notice tone="error">{tc("errorGeneric")}</Notice>}

              <Button
                type="button"
                disabled={!attested || saving}
                className="self-start"
                onClick={() => startSaving(async () => setResult(await commitImport(rows, attested)))}
              >
                {saving ? tc("loading") : t("commit", { count: rows.length })}
              </Button>
            </Sheet>
          )}
        </>
      )}
    </div>
  );
}
