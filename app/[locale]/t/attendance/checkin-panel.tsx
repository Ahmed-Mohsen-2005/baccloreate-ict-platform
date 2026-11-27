"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Term } from "@/components/term";
import { Button } from "@/components/ui";
import { rotateCheckinCode, stopCheckin } from "./actions";

const ROTATE_EVERY_MS = 60_000;

/**
 * The teacher's check-in board: a 4-digit code and a QR that carry the same code and rotate every minute.
 * Online groups read the code from the screen share; in-person groups scan the QR. The QR is drawn
 * in the browser (no request to any QR service).
 */
export function CheckinPanel({ sessionId, siteUrl, locale }: { sessionId: string; siteUrl: string; locale: string }) {
  const t = useTranslations("teacher.attendance");
  const [code, setCode] = useState<string | null>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const rotate = useCallback(async () => {
    const res = await rotateCheckinCode(sessionId);
    if (!res.ok) {
      setError(true);
      return;
    }
    setError(false);
    setCode(res.code);
    setSeconds(ROTATE_EVERY_MS / 1000);
    const prefix = locale === "en" ? "/en" : "";
    setSvg(await QRCode.toString(`${siteUrl}${prefix}/s/checkin?code=${res.code}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" }));
  }, [sessionId, siteUrl, locale]);

  useEffect(() => {
    if (!code) return;
    const tick = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    const rotateTimer = setInterval(() => void rotate(), ROTATE_EVERY_MS);
    return () => {
      clearInterval(tick);
      clearInterval(rotateTimer);
    };
  }, [code, rotate]);

  const stop = async () => {
    await stopCheckin(sessionId);
    setCode(null);
    setSvg("");
  };

  return (
    <section aria-labelledby="checkin-title" className="flex flex-col gap-3 rounded-[var(--radius-sheet)] border border-ruling bg-surface p-4">
      <h2 id="checkin-title" className="text-xl font-extrabold">
        {t("checkin")}
      </h2>
      <p className="text-sm text-pencil">{t("checkinHint")}</p>
      {error && (
        <p role="alert" className="font-semibold text-margin">
          {t("saveFailed")}
        </p>
      )}
      {code ? (
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-pencil">{t("code")}</span>
            <span className="font-mono text-6xl font-semibold tracking-[0.2em]" aria-live="polite">
              <Term>{code}</Term>
            </span>
            <span className="text-xs text-pencil">{t("rotatesIn", { seconds })}</span>
          </div>
          {svg && (
            <div
              role="img"
              aria-label={t("qrLabel")}
              className="size-44 rounded-[var(--radius-control)] bg-white p-1 [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void rotate()}>
          {code ? t("newCode") : t("startCheckin")}
        </Button>
        {code && (
          <Button type="button" variant="quiet" onClick={() => void stop()}>
            {t("stopCheckin")}
          </Button>
        )}
      </div>
    </section>
  );
}
