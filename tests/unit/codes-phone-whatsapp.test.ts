import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, formatCode, generateCode, hmacCode, normaliseCode } from "@/lib/codes";
import { lastFourDigits, normalisePhone } from "@/lib/phone";
import { buildWaLink, codesMessage } from "@/lib/whatsapp";

const PEPPER = "test-pepper-test-pepper-test-pepper-0123";

describe("access codes", () => {
  it("generates 6 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    }
  });

  it("never uses 0, O, 1, I or L", () => {
    for (const ch of "0O1IL") expect(CODE_ALPHABET).not.toContain(ch);
  });

  it("normalises what people type", () => {
    expect(normaliseCode("abc 234")).toBe("ABC234");
    expect(normaliseCode("ABC-234")).toBe("ABC234");
    expect(normaliseCode(" abc.234 ")).toBe("ABC234");
    expect(normaliseCode("ABC٢٣٤")).toBe("ABC234");
  });

  it("rejects strings that cannot be codes", () => {
    expect(normaliseCode("ABC12")).toBeNull();
    expect(normaliseCode("ABC1234")).toBeNull();
    expect(normaliseCode("ABCD10")).toBeNull(); // 1 and 0 are not in the alphabet
    expect(normaliseCode("")).toBeNull();
  });

  it("hashes deterministically and depends on the pepper", () => {
    expect(hmacCode("ABC234", PEPPER)).toBe(hmacCode("ABC234", PEPPER));
    expect(hmacCode("ABC234", PEPPER)).not.toBe(hmacCode("ABC234", `${PEPPER}x`));
    expect(hmacCode("ABC234", PEPPER)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses a short pepper", () => {
    expect(() => hmacCode("ABC234", "short")).toThrow(/CODE_PEPPER/);
  });

  it("formats for reading aloud", () => {
    expect(formatCode("ABC234")).toBe("ABC 234");
  });
});

describe("Egyptian phone numbers", () => {
  it.each([
    ["01012345678", "+201012345678"],
    ["010 1234 5678", "+201012345678"],
    ["010-1234-5678", "+201012345678"],
    ["+201112345678", "+201112345678"],
    ["00201212345678", "+201212345678"],
    ["201512345678", "+201512345678"],
    ["٠١٠١٢٣٤٥٦٧٨", "+201012345678"],
  ])("normalises %s", (raw, e164) => {
    const r = normalisePhone(raw);
    expect(r).toMatchObject({ ok: true, e164, fixedLeadingZero: false });
  });

  it("restores a leading zero Excel dropped (number or text)", () => {
    expect(normalisePhone(1012345678)).toEqual({ ok: true, e164: "+201012345678", fixedLeadingZero: true });
    expect(normalisePhone("1012345678.0")).toEqual({ ok: true, e164: "+201012345678", fixedLeadingZero: true });
  });

  it("rejects empty and invalid numbers", () => {
    expect(normalisePhone("")).toEqual({ ok: false, reason: "empty" });
    expect(normalisePhone(null)).toEqual({ ok: false, reason: "empty" });
    expect(normalisePhone("0101234")).toEqual({ ok: false, reason: "invalid" });
    expect(normalisePhone("abc")).toEqual({ ok: false, reason: "invalid" });
  });

  it("gives the last four digits for parent login", () => {
    expect(lastFourDigits("+201012345678")).toBe("5678");
  });
});

describe("WhatsApp messages", () => {
  it("builds a wa.me link with digits only and encoded text", () => {
    expect(buildWaLink("+201012345678", "أهلاً 1&2")).toBe(
      `https://wa.me/201012345678?text=${encodeURIComponent("أهلاً 1&2")}`,
    );
  });

  it("lists every child's code and the parent code, gendered", () => {
    const text = codesMessage({
      platformName: "منصة تجربة",
      children: [
        { name: "سارة", gender: "f", code: "ABC234" },
        { name: "عمر", gender: "m", code: "XYZ789" },
      ],
      parentCode: "PQR456",
      loginUrl: "https://example.vercel.app/login",
    });
    expect(text).toContain("ولي أمر سارة وعمر");
    expect(text).toContain("كود الطالبة سارة: ABC 234");
    expect(text).toContain("كود الطالب عمر: XYZ 789");
    expect(text).toContain("كود حضرتك كولي أمر: PQR 456");
    expect(text).toContain("https://example.vercel.app/login");
    expect(text).toContain("دي أكواد الدخول على منصة تجربة.");
  });
});
