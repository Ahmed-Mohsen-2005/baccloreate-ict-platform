import { describe, expect, it } from "vitest";
import { hasPlatformName, platformName } from "@/lib/brand";

const base = { platform_name_ar: "", platform_name_en: "", teacher_title: "" };

describe("platformName", () => {
  it("prefers the name in the reader's language and falls back to the other", () => {
    const s = { ...base, platform_name_ar: "منصة تجربة", platform_name_en: "Demo Platform" };
    expect(platformName(s, "ar", "x")).toBe("منصة تجربة");
    expect(platformName(s, "en", "x")).toBe("Demo Platform");
    expect(platformName({ ...base, platform_name_en: "Only English" }, "ar", "x")).toBe("Only English");
    expect(platformName({ ...base, platform_name_ar: "بس عربي" }, "en", "x")).toBe("بس عربي");
  });

  it("falls back to the legacy teacher title, then the default", () => {
    expect(platformName({ ...base, teacher_title: "Mr. Test" }, "ar", "default")).toBe("Mr. Test");
    expect(platformName(base, "ar", "default")).toBe("default");
    expect(platformName(null, "en", "default")).toBe("default");
  });

  it("ignores whitespace-only values", () => {
    expect(platformName({ ...base, platform_name_ar: "   " }, "ar", "default")).toBe("default");
    expect(hasPlatformName({ ...base, platform_name_ar: "  " })).toBe(false);
    expect(hasPlatformName({ ...base, platform_name_en: "X" })).toBe(true);
  });
});
