import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { toWesternDigits } from "./digits";

export type PhoneResult =
  | { ok: true; e164: string; fixedLeadingZero: boolean }
  | { ok: false; reason: "empty" | "invalid" };

/**
 * Normalises an Egyptian (or international) phone number to E.164.
 * Handles what spreadsheets do to numbers: dropped leading 0, spaces, dashes,
 * "00" prefixes, Arabic-Indic digits, and numbers stored as floats ("1012345678.0").
 */
export function normalisePhone(raw: unknown): PhoneResult {
  if (raw === null || raw === undefined) return { ok: false, reason: "empty" };
  let s = toWesternDigits(String(raw)).trim();
  if (s === "") return { ok: false, reason: "empty" };

  s = s.replace(/\.0+$/, "").replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  let fixedLeadingZero = false;
  if (/^1[0125]\d{8}$/.test(s)) {
    // Egyptian mobile with the leading 0 dropped by Excel: 1012345678 → 01012345678
    s = `0${s}`;
    fixedLeadingZero = true;
  } else if (/^20\d{10}$/.test(s)) {
    s = `+${s}`;
  }

  const parsed = parsePhoneNumberFromString(s, "EG");
  if (!parsed || !parsed.isValid()) return { ok: false, reason: "invalid" };
  return { ok: true, e164: parsed.number, fixedLeadingZero };
}

export function lastFourDigits(e164: string): string {
  return e164.slice(-4);
}
