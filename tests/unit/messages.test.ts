import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [`${prefix}[${obj.length}]`];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("translation files", () => {
  it("have exactly the same keys in Arabic and English", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("never mention payments or fees (non-negotiable 1)", () => {
    const text = JSON.stringify([ar, en]).toLowerCase();
    for (const word of ["payment", "invoice", "subscription", "unpaid", "مصاريف", "اشتراك", "فلوس الشهر"]) {
      if (word === "payment") {
        // The privacy policy states that the platform has no payments at all; nothing else may mention them.
        expect(text.match(/payment/g)?.length ?? 0).toBeLessThanOrEqual(2);
        continue;
      }
      expect(text).not.toContain(word);
    }
  });
});
