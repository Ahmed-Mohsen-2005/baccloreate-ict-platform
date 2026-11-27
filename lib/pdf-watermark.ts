import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/**
 * Stamps every page with the student's ID so a leaked copy can be traced.
 * Latin text only (the standard PDF fonts have no Arabic glyphs), so it uses the student's ID
 * from the teacher's file, never their name.
 */
export async function watermarkPdf(bytes: Uint8Array, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = label.replace(/[^\x20-\x7e]/g, "?").slice(0, 40);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(18, Math.min(width, height) / 12);
    const textWidth = font.widthOfTextAtSize(text, size);
    // Large faint diagonal in the middle of the page.
    page.drawText(text, {
      x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4),
      y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4),
      size,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.18,
      rotate: degrees(45),
    });
    // Small footer line, readable but unobtrusive.
    page.drawText(text, { x: 24, y: 14, size: 8, font, color: rgb(0.35, 0.35, 0.35), opacity: 0.8 });
  }
  return doc.save();
}
