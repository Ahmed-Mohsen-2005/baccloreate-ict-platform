"use client";

import { useEffect, useRef, useState } from "react";

const POOLS = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ar: "ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
} as const;

/** Deterministic Caesar shift (same on server and client, so no hydration mismatch). */
function encrypt(text: string, pool: string): string {
  return [...text]
    .map((ch) => {
      const i = pool.indexOf(ch.toUpperCase());
      return i < 0 ? ch : pool[(i + 3) % pool.length]!;
    })
    .join("");
}

/**
 * Cybersecurity unit signature (docs/M0-PLAN.md §5): a title shown as cipher text that the
 * student decrypts with a tap. The real title is always in the accessibility tree.
 */
export function DecryptTitle({ text, lang, hint }: { text: string; lang: "ar" | "en"; hint: string }) {
  const pool = POOLS[lang];
  const [shown, setShown] = useState(() => encrypt(text, pool));
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const decrypt = () => {
    if (done || timer.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text);
      setDone(true);
      return;
    }
    const chars = [...text];
    let step = 0;
    timer.current = setInterval(() => {
      step += 1;
      setShown(
        chars
          .map((ch, i) => (i < step || !pool.includes(ch.toUpperCase()) ? ch : pool[Math.floor(Math.random() * pool.length)]))
          .join(""),
      );
      if (step >= chars.length) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setShown(text);
        setDone(true);
      }
    }, 45);
  };

  return (
    <button
      type="button"
      onClick={decrypt}
      disabled={done}
      className="flex w-full flex-col items-start gap-0.5 text-start disabled:cursor-default"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className={done ? "" : "cipher-text text-pencil"} lang={lang} dir={lang === "en" ? "ltr" : "rtl"}>
        {shown}
      </span>
      {!done && (
        <span aria-hidden className="text-xs text-accent">
          {hint}
        </span>
      )}
    </button>
  );
}
