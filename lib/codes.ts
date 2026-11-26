import { createHmac, randomInt } from "node:crypto";
import { toWesternDigits } from "./digits";

/** No 0/O, 1/I/L: they are confused on phone screens and when read aloud. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Accepts what people type ("abc 123", "ABC-123", Arabic digits); returns null when it can't be a code. */
export function normaliseCode(input: string): string | null {
  const cleaned = toWesternDigits(input).toUpperCase().replace(/[\s\-_.]/g, "");
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) if (!CODE_ALPHABET.includes(ch)) return null;
  return cleaned;
}

/** Codes are stored only as HMAC-SHA256 with a server-side pepper, so a lookup needs no plaintext. */
export function hmacCode(code: string, pepper: string): string {
  if (pepper.length < 32) throw new Error("CODE_PEPPER must be at least 32 characters");
  return createHmac("sha256", pepper).update(code).digest("hex");
}

export { formatCode } from "./code-format";
