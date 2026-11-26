"use client";

import { useRef, useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Term } from "@/components/term";
import { Button, Notice, buttonClass } from "@/components/ui";
import { formatCode } from "@/lib/code-format";
import { prepareFamilyCodes, type PrepareResult } from "./actions";

export type Family = { parentId: string; phone: string; children: string[]; lastSentAt: string | null };

export function CodesBoard({ families }: { families: Family[] }) {
  const t = useTranslations("teacher.codes");
  const tc = useTranslations("common");
  const format = useFormatter();
  const separator = useLocale() === "ar" ? "، " : ", ";
  const [prepared, setPrepared] = useState<Record<string, PrepareResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const refs = useRef<Record<string, HTMLLIElement | null>>({});

  const prepare = (parentId: string) => {
    setBusy(parentId);
    startTransition(async () => {
      const result = await prepareFamilyCodes(parentId);
      setPrepared((p) => ({ ...p, [parentId]: result }));
      setBusy(null);
    });
  };

  const goNext = (index: number) => {
    const next = families.slice(index + 1).find((f) => !prepared[f.parentId]);
    if (next) {
      const el = refs.current[next.parentId];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector("button")?.focus();
    }
  };

  if (families.length === 0) return <Notice>{t("allSent")}</Notice>;

  return (
    <ol className="flex flex-col gap-3">
      {families.map((family, index) => {
        const result = prepared[family.parentId];
        return (
          <li
            key={family.parentId}
            ref={(el) => {
              refs.current[family.parentId] = el;
            }}
            className="scroll-mt-4 rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4"
          >
            <p className="text-lg font-extrabold">{family.children.join(separator)}</p>
            <p className="flex flex-wrap gap-x-3 text-xs text-pencil">
              <Term>{family.phone}</Term>
              <span>
                {family.lastSentAt ? t("sentOn", { date: format.dateTime(new Date(family.lastSentAt), { dateStyle: "medium" }) }) : t("notSent")}
              </span>
            </p>

            {result?.ok ? (
              <div className="mt-3 flex flex-col gap-3">
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                  {result.children.map((c) => (
                    <div key={c.name} className="contents">
                      <dt>{c.name}</dt>
                      <dd className="font-mono text-lg font-semibold">
                        <Term>{formatCode(c.code)}</Term>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-pencil">{t("codesShownOnce")}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={result.link} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
                    {t("open")}
                  </a>
                  <Button type="button" variant="secondary" onClick={() => goNext(index)}>
                    {t("nextFamily")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {result && !result.ok && <Notice tone="error">{tc("errorGeneric")}</Notice>}
                <Button
                  type="button"
                  variant={family.lastSentAt ? "secondary" : "primary"}
                  disabled={busy === family.parentId}
                  onClick={() => prepare(family.parentId)}
                  className="self-start"
                >
                  {busy === family.parentId ? tc("loading") : family.lastSentAt ? t("prepareAgain") : t("prepare")}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
