import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ImportFileError, parseSpreadsheet } from "@/lib/import/parse";
import { validateImport } from "@/lib/import/validate";

// The teacher's real headers (§9 Q4) with synthetic rows, written the way Excel stores them.
const HEADERS = ["studentID", "Name", "grade", "phone number", "gmail", "parent's email", "parent's phone number", "venue", "gender"];

async function xlsxFile(rows: unknown[][], name = "students.xlsx") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(HEADERS);
  for (const r of rows) ws.addRow(r);
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], name);
}

describe("parseSpreadsheet + validateImport", () => {
  it("reads an Excel file with numeric phones and IDs, as Excel stores them", async () => {
    const file = await xlsxFile([
      [1001, "طالب أول", 11, 1012345678, "first@gmail.com", "parent1@gmail.com", 1112345678, "offline", "m"],
      [1002, "طالبة تانية", "10", "", "", "", "01112345678", "online", "f"],
    ]);
    const sheet = await parseSpreadsheet(file);
    expect(sheet.headers).toEqual(HEADERS);
    const result = validateImport(sheet.headers, sheet.records, { defaultEdition: "en" });
    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => [r.external_id, r.grade_code, r.phone_e164, r.parent_phone_e164])).toEqual([
      ["1001", "g11", "+201012345678", "+201112345678"],
      ["1002", "g10", null, "+201112345678"],
    ]);
    expect(result.warnings.filter((w) => w.code === "siblings_linked")).toHaveLength(2);
  });

  it("reads a UTF-8 CSV with a BOM and Arabic names", async () => {
    const csv = `﻿${HEADERS.join(",")}\n2001,"اسم تجربة",11,,,,01012345678,online,f\n`;
    const sheet = await parseSpreadsheet(new File([csv], "students.csv"));
    const result = validateImport(sheet.headers, sheet.records, { defaultEdition: "ar" });
    expect(result.rows[0]).toMatchObject({ external_id: "2001", display_name: "اسم تجربة", edition: "ar" });
  });

  it("rejects unsupported, empty and oversized files with a code", async () => {
    await expect(parseSpreadsheet(new File(["x"], "students.pdf"))).rejects.toMatchObject({ code: "unsupported" });
    await expect(parseSpreadsheet(new File([], "students.xlsx"))).rejects.toMatchObject({ code: "empty" });
    const big = { name: "big.xlsx", size: 3 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) };
    await expect(parseSpreadsheet(big)).rejects.toBeInstanceOf(ImportFileError);
  });

  it("reports a corrupt xlsx as unreadable", async () => {
    await expect(parseSpreadsheet(new File(["not a zip"], "students.xlsx"))).rejects.toMatchObject({ code: "unreadable" });
  });
});
