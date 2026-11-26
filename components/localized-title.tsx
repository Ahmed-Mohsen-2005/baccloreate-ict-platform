/** Renders a curriculum title with the right lang/dir, so English titles sit correctly in Arabic pages. */
export function LocalizedTitle({ text, lang }: { text: string; lang: "ar" | "en" }) {
  return (
    <span lang={lang} dir={lang === "en" ? "ltr" : "rtl"} className="[unicode-bidi:isolate]">
      {text}
    </span>
  );
}
