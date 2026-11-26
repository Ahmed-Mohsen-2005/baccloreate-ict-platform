import { toWesternDigits } from "../digits";
import { normalisePhone } from "../phone";
import { mapColumns, type ColumnMap, type ImportField } from "./columns";

export type GradeCode = "g10" | "g11";
export type Edition = "ar" | "en";
export type Venue = "online" | "offline";
export type Gender = "m" | "f";

export type ImportRow = {
  rowNumber: number; // 1-based spreadsheet row (header is row 1)
  external_id: string;
  display_name: string;
  grade_code: GradeCode;
  edition: Edition;
  venue: Venue;
  gender: Gender | null;
  phone_e164: string | null;
  google_email: string | null;
  parent_phone_e164: string;
  parent_email: string | null;
  group_id: string | null;
};

export type IssueCode =
  | "missing_external_id"
  | "duplicate_external_id"
  | "missing_name"
  | "bad_grade"
  | "bad_phone"
  | "missing_parent_phone"
  | "bad_parent_phone"
  | "bad_email"
  | "duplicate_google_email"
  | "email_taken"
  | "bad_venue"
  | "bad_gender"
  | "phone_fixed_leading_zero"
  | "shared_family_email"
  | "siblings_linked";

export type Issue = { rowNumber: number; field: ImportField | "row"; code: IssueCode; value?: string };

export type ValidationResult = {
  rows: ImportRow[];
  errors: Issue[];
  warnings: Issue[];
  columns: { map: ColumnMap; unknown: string[]; missingRequired: ImportField[] };
};

export type ValidationContext = {
  /** Default edition for Grade 11 rows (§9 Q17: English). Grade 10 is always English. */
  defaultEdition: Edition;
  /** google_email → external_id of students already in the database, to catch clashes before writing. */
  existingGoogleEmails?: Map<string, string | null>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseGrade(raw: string): GradeCode | null {
  const s = toWesternDigits(raw).toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (/\b11\b|2nd|second|sec ?2|g11|تاني|تانية|ثاني|ثانية|الثاني/.test(s)) return "g11";
  if (/\b10\b|1st|first|sec ?1|g10|أول|اول|أولى|اولى|الأول|الاول/.test(s)) return "g10";
  return null;
}

export function parseVenue(raw: string): Venue | null {
  const s = raw.toLowerCase().replace(/\s+/g, "").trim();
  if (["online", "اونلاين", "أونلاين", "اون", "on"].includes(s)) return "online";
  if (["offline", "سنتر", "center", "centre", "حضوري", "off", "inperson"].includes(s)) return "offline";
  return null;
}

export function parseGender(raw: string): Gender | null | "invalid" {
  const s = raw.toLowerCase().trim();
  if (!s) return null;
  if (["m", "male", "boy", "ذكر", "ولد"].includes(s)) return "m";
  if (["f", "female", "girl", "أنثى", "انثى", "بنت"].includes(s)) return "f";
  return "invalid";
}

function cell(record: Record<string, unknown>, map: ColumnMap, field: ImportField): string {
  const header = map[field];
  if (!header) return "";
  const v = record[header];
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text).trim(); // exceljs hyperlink cells
  return String(v).trim();
}

/** Validates and normalises spreadsheet records. Pure: no database access. */
export function validateImport(headers: string[], records: Record<string, unknown>[], ctx: ValidationContext): ValidationResult {
  const columns = mapColumns(headers);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const rows: ImportRow[] = [];
  if (columns.missingRequired.length > 0) return { rows, errors, warnings, columns };

  const seenIds = new Map<string, number>();
  const seenEmails = new Map<string, number>();
  const parentPhones = new Map<string, number[]>();

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const rowErrors: Issue[] = [];
    const get = (f: ImportField) => cell(record, columns.map, f);

    if (Object.values(record).every((v) => v === null || v === undefined || String(v).trim() === "")) return; // blank line

    const externalId = toWesternDigits(get("external_id")).replace(/\.0+$/, "");
    if (!externalId) rowErrors.push({ rowNumber, field: "external_id", code: "missing_external_id" });
    else if (seenIds.has(externalId)) rowErrors.push({ rowNumber, field: "external_id", code: "duplicate_external_id", value: externalId });
    else seenIds.set(externalId, rowNumber);

    const name = get("display_name").replace(/\s+/g, " ");
    if (!name) rowErrors.push({ rowNumber, field: "display_name", code: "missing_name" });

    const grade = parseGrade(get("grade"));
    if (!grade) rowErrors.push({ rowNumber, field: "grade", code: "bad_grade", value: get("grade") });

    const venue = parseVenue(get("venue"));
    if (!venue) rowErrors.push({ rowNumber, field: "venue", code: "bad_venue", value: get("venue") });

    const gender = parseGender(get("gender"));
    if (gender === "invalid") rowErrors.push({ rowNumber, field: "gender", code: "bad_gender", value: get("gender") });

    let phone: string | null = null;
    const rawPhone = get("phone");
    if (rawPhone) {
      const p = normalisePhone(rawPhone);
      if (p.ok) {
        phone = p.e164;
        if (p.fixedLeadingZero) warnings.push({ rowNumber, field: "phone", code: "phone_fixed_leading_zero", value: rawPhone });
      } else rowErrors.push({ rowNumber, field: "phone", code: "bad_phone", value: rawPhone });
    }

    let parentPhone: string | null = null;
    const rawParent = get("parent_phone");
    if (!rawParent) rowErrors.push({ rowNumber, field: "parent_phone", code: "missing_parent_phone" });
    else {
      const p = normalisePhone(rawParent);
      if (p.ok) {
        parentPhone = p.e164;
        if (p.fixedLeadingZero) warnings.push({ rowNumber, field: "parent_phone", code: "phone_fixed_leading_zero", value: rawParent });
      } else rowErrors.push({ rowNumber, field: "parent_phone", code: "bad_parent_phone", value: rawParent });
    }

    const email = get("google_email").toLowerCase() || null;
    if (email && !EMAIL.test(email)) rowErrors.push({ rowNumber, field: "google_email", code: "bad_email", value: email });
    else if (email && seenEmails.has(email)) rowErrors.push({ rowNumber, field: "google_email", code: "duplicate_google_email", value: email });
    else if (email) {
      seenEmails.set(email, rowNumber);
      const owner = ctx.existingGoogleEmails?.get(email);
      if (ctx.existingGoogleEmails?.has(email) && owner !== externalId) {
        rowErrors.push({ rowNumber, field: "google_email", code: "email_taken", value: email });
      }
    }

    const parentEmail = get("parent_email").toLowerCase() || null;
    if (parentEmail && !EMAIL.test(parentEmail)) rowErrors.push({ rowNumber, field: "parent_email", code: "bad_email", value: parentEmail });
    if (email && parentEmail && email === parentEmail) {
      warnings.push({ rowNumber, field: "parent_email", code: "shared_family_email", value: email });
    }

    if (rowErrors.length > 0 || !grade || !venue || !parentPhone || gender === "invalid") {
      errors.push(...rowErrors);
      return;
    }

    parentPhones.set(parentPhone, [...(parentPhones.get(parentPhone) ?? []), rowNumber]);
    rows.push({
      rowNumber,
      external_id: externalId,
      display_name: name,
      grade_code: grade,
      edition: grade === "g10" ? "en" : ctx.defaultEdition,
      venue,
      gender,
      phone_e164: phone,
      google_email: email,
      parent_phone_e164: parentPhone,
      parent_email: parentEmail && parentEmail !== email ? parentEmail : null,
      group_id: null,
    });
  });

  for (const [, rowNumbers] of parentPhones) {
    if (rowNumbers.length > 1) {
      for (const rowNumber of rowNumbers) warnings.push({ rowNumber, field: "parent_phone", code: "siblings_linked" });
    }
  }

  return { rows, errors, warnings, columns };
}
