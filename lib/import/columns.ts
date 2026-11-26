/**
 * Maps spreadsheet headers to import fields. Built around the teacher's real file
 * (docs/M0-PLAN.md §9 Q4): studentID, Name, grade, phone number, gmail,
 * parent's email, parent's phone number, venue (online or offline), gender.
 * Matching ignores case, spaces, punctuation and apostrophes, and accepts Arabic headers.
 */
export const IMPORT_FIELDS = [
  "external_id",
  "display_name",
  "grade",
  "phone",
  "google_email",
  "parent_email",
  "parent_phone",
  "venue",
  "gender",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

const ALIASES: Record<ImportField, string[]> = {
  external_id: ["studentid", "id", "studentcode", "رقمالطالب", "كودالطالب"],
  display_name: ["name", "studentname", "fullname", "الاسم", "اسمالطالب"],
  grade: ["grade", "class", "year", "الصف", "السنة"],
  phone: ["phonenumber", "phone", "studentphone", "studentphonenumber", "mobile", "رقمالموبايل", "موبايلالطالب", "تليفون"],
  google_email: ["gmail", "email", "studentemail", "studentgmail", "الايميل", "الإيميل"],
  parent_email: ["parentsemail", "parentemail", "parentgmail", "ايميلوليالامر", "إيميلوليالأمر"],
  parent_phone: ["parentsphonenumber", "parentphonenumber", "parentphone", "parentsphone", "رقمولىالامر", "رقموليالامر", "رقموليالأمر", "موبايلوليالامر"],
  venue: ["venue", "mode", "attendance", "مكانالحضور", "الحضور"],
  gender: ["gender", "sex", "النوع"],
};

export function normaliseHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // "venue (online or offline)" → "venue"
    .replace(/[\s'’`_\-.:/]/g, "")
    .trim();
}

export type ColumnMap = Partial<Record<ImportField, string>>;

/** Returns which original header feeds each field, plus headers we could not place. */
export function mapColumns(headers: string[]): { map: ColumnMap; unknown: string[]; missingRequired: ImportField[] } {
  const map: ColumnMap = {};
  const unknown: string[] = [];
  for (const header of headers) {
    const key = normaliseHeader(header);
    if (!key) continue;
    const field = IMPORT_FIELDS.find((f) => ALIASES[f].includes(key));
    if (field && !map[field]) map[field] = header;
    else unknown.push(header);
  }
  const required: ImportField[] = ["external_id", "display_name", "grade", "parent_phone", "venue"];
  return { map, unknown, missingRequired: required.filter((f) => !map[f]) };
}
