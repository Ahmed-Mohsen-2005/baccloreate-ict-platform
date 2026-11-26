import { describe, expect, it } from "vitest";
import { mapColumns } from "@/lib/import/columns";
import { parseGender, parseGrade, parseVenue, validateImport } from "@/lib/import/validate";

// The teacher's real headers (docs/M0-PLAN.md §9 Q4). All row data below is synthetic.
const HEADERS = ["studentID", "Name", "grade", "phone number", "gmail", "parent's email", "parent's phone number", "venue", "gender"];

function row(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    studentID: "1001",
    Name: "طالب تجربة",
    grade: "11",
    "phone number": "01012345678",
    gmail: "Student.Test@gmail.com",
    "parent's email": "parent.test@gmail.com",
    "parent's phone number": "01112345678",
    venue: "offline",
    gender: "m",
    ...over,
  };
}

const ctx = { defaultEdition: "en" as const };

describe("column mapping", () => {
  it("recognises the teacher's real headers", () => {
    const { map, unknown, missingRequired } = mapColumns(HEADERS);
    expect(missingRequired).toEqual([]);
    expect(unknown).toEqual([]);
    expect(map).toMatchObject({ external_id: "studentID", parent_phone: "parent's phone number", google_email: "gmail" });
  });

  it("accepts the long venue header and Arabic headers", () => {
    const { map } = mapColumns(["venue (online or offline)", "الاسم", "النوع"]);
    expect(map.venue).toBe("venue (online or offline)");
    expect(map.display_name).toBe("الاسم");
    expect(map.gender).toBe("النوع");
  });

  it("reports missing required columns", () => {
    const { missingRequired } = mapColumns(["Name", "grade"]);
    expect(missingRequired).toEqual(["external_id", "parent_phone", "venue"]);
  });
});

describe("value parsing", () => {
  it.each([
    ["10", "g10"], ["11", "g11"], ["1st sec", "g10"], ["2nd sec", "g11"], ["Grade 11", "g11"],
    ["أولى ثانوي", "g10"], ["تانية ثانوي", "g11"], ["ثانية", "g11"], ["١١", "g11"], ["sec 1", "g10"],
  ])("grade %s → %s", (raw, code) => expect(parseGrade(raw)).toBe(code));

  it("rejects unknown grades", () => {
    expect(parseGrade("12")).toBeNull();
    expect(parseGrade("")).toBeNull();
  });

  it("parses venue and gender in both languages", () => {
    expect(parseVenue("Online")).toBe("online");
    expect(parseVenue("سنتر")).toBe("offline");
    expect(parseVenue("maybe")).toBeNull();
    expect(parseGender("Female")).toBe("f");
    expect(parseGender("ذكر")).toBe("m");
    expect(parseGender("")).toBeNull();
    expect(parseGender("x")).toBe("invalid");
  });
});

describe("validateImport", () => {
  it("normalises a clean row", () => {
    const r = validateImport(HEADERS, [row()], ctx);
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      {
        rowNumber: 2,
        external_id: "1001",
        display_name: "طالب تجربة",
        grade_code: "g11",
        edition: "en",
        venue: "offline",
        gender: "m",
        phone_e164: "+201012345678",
        google_email: "student.test@gmail.com",
        parent_phone_e164: "+201112345678",
        parent_email: "parent.test@gmail.com",
        group_id: null,
      },
    ]);
  });

  it("forces English for Grade 10 and uses the default edition for Grade 11", () => {
    const r = validateImport(HEADERS, [row({ grade: "10" }), row({ studentID: "1002", gmail: "" })], { defaultEdition: "ar" });
    expect(r.rows.map((x) => x.edition)).toEqual(["en", "ar"]);
  });

  it("reports each problem with its row number and field", () => {
    const r = validateImport(
      HEADERS,
      [
        row({ studentID: "", Name: "" }),
        row({ studentID: "1002", grade: "12", venue: "home", gmail: "not-an-email" }),
        row({ studentID: "1003", gmail: "", "parent's phone number": "", "phone number": "123" }),
        row({ studentID: "1004", gmail: "", "parent's phone number": "0101" }),
      ],
      ctx,
    );
    expect(r.rows).toEqual([]);
    const byRow = (n: number) => r.errors.filter((e) => e.rowNumber === n).map((e) => e.code).sort();
    expect(byRow(2)).toEqual(["missing_external_id", "missing_name"]);
    expect(byRow(3)).toEqual(["bad_email", "bad_grade", "bad_venue"]);
    expect(byRow(4)).toEqual(["bad_phone", "missing_parent_phone"]);
    expect(byRow(5)).toEqual(["bad_parent_phone"]);
  });

  it("catches duplicate student IDs and Gmail addresses inside the file", () => {
    const r = validateImport(HEADERS, [row(), row({ gmail: "other@gmail.com" }), row({ studentID: "1003" })], ctx);
    expect(r.errors.map((e) => e.code).sort()).toEqual(["duplicate_external_id", "duplicate_google_email"]);
  });

  it("catches a Gmail already used by a different student in the database", () => {
    const existing = new Map([["student.test@gmail.com", "9999"]]);
    const r = validateImport(HEADERS, [row()], { ...ctx, existingGoogleEmails: existing });
    expect(r.errors.map((e) => e.code)).toEqual(["email_taken"]);
  });

  it("allows the same Gmail when re-importing the same student", () => {
    const existing = new Map([["student.test@gmail.com", "1001"]]);
    const r = validateImport(HEADERS, [row()], { ...ctx, existingGoogleEmails: existing });
    expect(r.errors).toEqual([]);
  });

  it("warns about restored leading zeros and links siblings by parent phone", () => {
    const r = validateImport(
      HEADERS,
      [row({ "phone number": 1012345678 }), row({ studentID: "1002", gmail: "", "phone number": "" })],
      ctx,
    );
    expect(r.errors).toEqual([]);
    const codes = r.warnings.map((w) => `${w.rowNumber}:${w.code}`).sort();
    expect(codes).toEqual(["2:phone_fixed_leading_zero", "2:siblings_linked", "3:siblings_linked"]);
  });

  it("keeps a shared family email on the student and warns", () => {
    const r = validateImport(HEADERS, [row({ gmail: "family@gmail.com", "parent's email": "family@gmail.com" })], ctx);
    expect(r.rows[0]?.google_email).toBe("family@gmail.com");
    expect(r.rows[0]?.parent_email).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("shared_family_email");
  });

  it("skips fully blank lines and strips .0 from numeric IDs", () => {
    const blank = Object.fromEntries(HEADERS.map((h) => [h, ""]));
    const r = validateImport(HEADERS, [row({ studentID: 1001.0 }), blank], ctx);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]?.external_id).toBe("1001");
  });

  it("stops early when required columns are missing", () => {
    const r = validateImport(["Name"], [{ Name: "x" }], ctx);
    expect(r.rows).toEqual([]);
    expect(r.columns.missingRequired.length).toBeGreaterThan(0);
  });
});
