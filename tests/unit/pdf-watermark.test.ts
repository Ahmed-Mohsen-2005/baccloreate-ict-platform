import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { watermarkPdf } from "@/lib/pdf-watermark";

async function samplePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([595, 842]);
  return doc.save();
}

describe("watermarkPdf", () => {
  it("keeps every page and produces a valid, larger PDF", async () => {
    const original = await samplePdf(3);
    const stamped = await watermarkPdf(original, "ID 1001");
    const reloaded = await PDFDocument.load(stamped);
    expect(reloaded.getPageCount()).toBe(3);
    expect(stamped.length).toBeGreaterThan(original.length);
  });

  it("does not throw on non-Latin labels (replaced, never embedded)", async () => {
    const stamped = await watermarkPdf(await samplePdf(1), "ID طالب 7");
    expect((await PDFDocument.load(stamped)).getPageCount()).toBe(1);
  });
});
