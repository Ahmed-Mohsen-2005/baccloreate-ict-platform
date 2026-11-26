import type { CSSProperties } from "react";

/**
 * The signature element (§5): a lesson code ("2-1") whose glyphs fill with the unit colour
 * from the baseline up, in proportion to mastery. Empty outline = not started.
 * Set the unit's domain class on an ancestor so --accent resolves.
 */
export function LessonCode({
  code,
  mastery = 0,
  size = "lg",
  label,
}: {
  code: string;
  mastery?: number;
  size?: "md" | "lg" | "xl";
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, mastery)) * 100);
  const sizeClass = size === "xl" ? "text-4xl" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <span
      className={`lesson-code ${sizeClass} leading-none`}
      style={{ "--fill": `${pct}%` } as CSSProperties}
      aria-label={label ? `${code}: ${label}` : code}
    >
      {code}
    </span>
  );
}
