import { formatCode } from "./codes";

/** WhatsApp click-to-chat link. The text is prefilled; the teacher presses send. */
export function buildWaLink(e164: string, text: string): string {
  const digits = e164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type CodeMessageChild = {
  name: string;
  gender: "m" | "f" | null;
  code: string;
};

/**
 * The Arabic "your codes" message to a parent: every child's code plus the parent's own code.
 * Copy lives here (not in messages/*.json) because it leaves the app as a WhatsApp text.
 */
export function codesMessage(input: {
  teacherTitle: string;
  children: CodeMessageChild[];
  parentCode: string;
  loginUrl: string;
}): string {
  const names = input.children.map((c) => c.name).join(" و");
  const lines = [
    `أهلاً يا ولي أمر ${names}،`,
    input.teacherTitle
      ? `دي أكواد الدخول على منصة ${input.teacherTitle} للبرمجة والذكاء الاصطناعي.`
      : "دي أكواد الدخول على منصة البرمجة والذكاء الاصطناعي.",
    "",
    ...input.children.map((c) => `كود ${c.gender === "f" ? "الطالبة" : "الطالب"} ${c.name}: ${formatCode(c.code)}`),
    `كود حضرتك كولي أمر: ${formatCode(input.parentCode)}`,
    "وانت داخل بكود ولي الأمر هتكتب كمان آخر ٤ أرقام من رقم موبايلك.",
    "",
    `ادخلوا من هنا: ${input.loginUrl}`,
    "الأكواد دي خاصة، متبعتوهاش لحد.",
  ];
  return lines.join("\n");
}
