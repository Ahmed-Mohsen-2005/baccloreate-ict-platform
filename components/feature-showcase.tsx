import { getTranslations } from "next-intl/server";
import { LessonCode } from "./lesson-code";
import { Term } from "./term";

/** QR-like pattern (hand-made, not a real code): 1 = filled module. */
const QR = ["1110111", "1010101", "1110110", "0001011", "1101001", "0111110", "1011011"];
const BUBBLES = [
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [1, 0, 0, 0],
  [0, 0, 0, 1],
  [0, 1, 0, 0],
];

function Mock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={`mt-4 flex-1 rounded-[var(--radius-control)] border border-ruling bg-paper/60 p-3 text-sm ${className}`}>
      {children}
    </div>
  );
}

/** Designed previews of what the platform does, built from plain markup (zero JS, zero images). */
export async function FeatureShowcase() {
  const t = await getTranslations("showcase");
  const chips = t.raw("chips") as string[];

  const card = "reveal glass flex flex-col p-5";
  const head = (key: string, accent: string) => (
    <>
      <h3 className={`font-display text-xl font-extrabold ${accent}`}>{t(`cards.${key}.title`)}</h3>
      <p className="mt-1 text-pencil">{t(`cards.${key}.body`)}</p>
    </>
  );

  return (
    <section aria-labelledby="showcase-title" className="mt-24">
      <h2 id="showcase-title" className="max-w-3xl text-3xl font-extrabold sm:text-4xl">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-prose text-lg text-pencil">{t("intro")}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-6">
        {/* Live quiz */}
        <article className={`${card} md:col-span-3 domain-protocol`}>
          {head("quiz", "text-accent")}
          <Mock>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-accent">
                {t("mock.room")} <Term>482 913</Term>
              </span>
              <span className="text-xs text-pencil">{t("mock.question")}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {[92, 54, 28, 14].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 font-mono text-xs text-pencil">{"ABCD"[i]}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-ruling">
                    <div className={`bar h-full rounded-full ${i === 0 ? "bg-accent" : "bg-pencil/60"}`} style={{ width: `${w}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Mock>
        </article>

        {/* Attendance */}
        <article className={`${card} md:col-span-3 domain-society`}>
          {head("attendance", "text-accent")}
          <Mock className="flex items-center gap-4">
            <div className="grid grid-cols-7 gap-0.5 rounded-md bg-surface p-2" style={{ width: 92 }}>
              {QR.flatMap((row, y) => [...row].map((c, x) => <span key={`${y}${x}`} className={`aspect-square rounded-[1px] ${c === "1" ? "bg-ink" : "bg-transparent"}`} />))}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-pencil">{t("mock.code")}</span>
              <span className="font-mono text-3xl font-semibold tracking-[0.25em] text-accent">
                <Term>7291</Term>
              </span>
              <svg viewBox="0 0 36 36" className="size-8 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" className="stroke-ruling" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" className="count-ring stroke-accent" strokeWidth="3" strokeLinecap="round" pathLength={100} />
              </svg>
            </div>
          </Mock>
        </article>

        {/* Mastery */}
        <article className={`${card} md:col-span-2`}>
          {head("mastery", "")}
          <Mock className="flex flex-col gap-3">
            <div className="domain-cipher flex items-center gap-4">
              <LessonCode code="2-1" mastery={0.92} size="lg" />
              <LessonCode code="2-2" mastery={0.55} size="lg" />
              <LessonCode code="2-3" mastery={0.2} size="lg" />
            </div>
            <div className="domain-protocol flex items-center gap-4">
              <LessonCode code="3-1" mastery={0.75} size="lg" />
              <LessonCode code="3-2" mastery={0.35} size="lg" />
              <LessonCode code="3-3" mastery={0} size="lg" />
            </div>
          </Mock>
        </article>

        {/* AI tutor */}
        <article className={`${card} md:col-span-2 domain-neuron`}>
          {head("tutor", "text-accent")}
          <Mock className="flex flex-col gap-2">
            <p className="self-end rounded-2xl rounded-ee-sm bg-ink px-3 py-2 text-paper">{t("mock.studentAsk")}</p>
            <p className="self-start rounded-2xl rounded-es-sm border border-accent/40 bg-accent/10 px-3 py-2">
              <span className="me-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-paper">AI</span>
              {t("mock.tutorReply")}
            </p>
            <span className="typing self-start px-3" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </Mock>
        </article>

        {/* Parent report */}
        <article className={`${card} md:col-span-2`}>
          {head("report", "")}
          <Mock>
            <div className="rounded-2xl rounded-es-sm bg-[#d9fdd3] p-3 text-[#111b21]">
              <p className="font-semibold">{t("mock.reportTitle")}</p>
              <p className="mt-1">{t("mock.reportBody")}</p>
            </div>
            <p className="mt-2 text-xs text-pencil">{t("mock.reviewed")}</p>
          </Mock>
        </article>

        {/* Scan */}
        <article className={`${card} md:col-span-2 domain-swatch`}>
          {head("scan", "text-accent")}
          <Mock className="relative overflow-hidden">
            <div className="grid gap-2">
              {BUBBLES.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 font-mono text-xs text-pencil">{i + 1}</span>
                  {row.map((on, j) => (
                    <span key={j} className={`size-4 rounded-full border border-pencil ${on ? "bg-accent border-accent" : ""}`} />
                  ))}
                </div>
              ))}
            </div>
            <span className="scan-line" />
          </Mock>
        </article>

        {/* Copilot */}
        <article className={`${card} md:col-span-2 domain-signal`}>
          {head("copilot", "text-accent")}
          <Mock className="flex flex-col gap-2">
            <p className="rounded-full border border-ruling bg-surface px-3 py-2">{t("mock.copilotAsk")}</p>
            <div className="flex flex-wrap gap-2">
              {(t.raw("mock.names") as string[]).map((n) => (
                <span key={n} className="rounded-full bg-accent/15 px-3 py-1 text-accent">
                  {n}
                </span>
              ))}
            </div>
            <span className="text-xs text-pencil">{t("mock.teacherOnly")}</span>
          </Mock>
        </article>

        {/* Labs */}
        <article className={`${card} md:col-span-4 domain-data`}>
          {head("labs", "text-accent")}
          <Mock className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-pencil">{t("mock.shift")}</span>
              <span className="font-mono text-lg">
                <Term>HELLO</Term> <span className="text-accent">→</span> <Term>KHOOR</Term>
              </span>
              <div className="h-2 rounded-full bg-ruling">
                <div className="h-full w-1/4 rounded-full bg-accent" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              {[
                ["x", "5"],
                ["name", "Sara"],
                ["ok", "True"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <span className="font-mono text-xs text-pencil">{k}</span>
                  <span className="grid min-w-12 place-items-center rounded-md border border-accent bg-surface px-2 py-2 font-mono font-bold">{v}</span>
                </div>
              ))}
            </div>
          </Mock>
        </article>
      </div>

      <ul className="mt-8 flex flex-wrap gap-2" aria-label={t("chipsLabel")}>
        {chips.map((c) => (
          <li key={c} className="reveal rounded-full border border-ruling bg-surface px-4 py-2 text-sm">
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}
