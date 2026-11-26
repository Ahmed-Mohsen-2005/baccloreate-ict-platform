import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";

export type ParsedSheet = { headers: string[]; records: Record<string, unknown>[] };

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB is thousands of rows
export const MAX_IMPORT_ROWS = 2000;

export class ImportFileError extends Error {
  constructor(public readonly code: "too_big" | "empty" | "unsupported" | "unreadable" | "too_many_rows") {
    super(code);
  }
}

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text; // hyperlinks (emails)
    if ("result" in value) return value.result ?? ""; // formulas
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
  }
  return value;
}

export async function parseSpreadsheet(file: { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }): Promise<ParsedSheet> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportFileError("too_big");
  if (file.size === 0) throw new ImportFileError("empty");
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  let sheet: ParsedSheet;
  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy" });
    sheet = { headers: result.meta.fields ?? [], records: result.data };
  } else if (name.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      throw new ImportFileError("unreadable");
    }
    const ws = workbook.worksheets[0];
    if (!ws) throw new ImportFileError("empty");
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
      headers[col - 1] = String(cellValue(c.value)).trim();
    });
    const records: Record<string, unknown>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (h) record[h] = cellValue(row.getCell(i + 1).value);
      });
      records.push(record);
    });
    sheet = { headers: headers.filter(Boolean), records };
  } else {
    throw new ImportFileError("unsupported");
  }

  if (sheet.headers.length === 0 || sheet.records.length === 0) throw new ImportFileError("empty");
  if (sheet.records.length > MAX_IMPORT_ROWS) throw new ImportFileError("too_many_rows");
  return sheet;
}
