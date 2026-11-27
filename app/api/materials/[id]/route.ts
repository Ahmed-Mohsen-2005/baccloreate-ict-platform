import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import { watermarkPdf } from "@/lib/pdf-watermark";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Opens a material. Access is decided by RLS on `materials` (a student only gets a row if it is
 * released, for their grade, edition and group). Files are never public: the server hands out a
 * 60-second signed URL, or streams the PDF itself with the student's ID stamped on it.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return notFound();
  const viewer = await getViewer();
  if (!viewer || (viewer.role !== "student" && viewer.role !== "teacher")) return new Response("Unauthorized", { status: 401 });

  const supabase = await createClient();
  const { data: m } = await supabase.from("materials").select("kind, url, storage_key, watermark").eq("id", id).maybeSingle();
  if (!m) return notFound();

  if ((m.kind === "link" || m.kind === "video_link") && m.url?.startsWith("https://")) return Response.redirect(m.url, 302);
  if (!m.storage_key) return notFound();

  const { data: signed } = await createAdminClient().storage.from("materials").createSignedUrl(m.storage_key, 60);
  if (!signed) return notFound();

  if (m.kind === "pdf" && m.watermark && viewer.role === "student") {
    const { data: student } = await supabase.from("students").select("external_id").eq("id", viewer.subjectId ?? "").maybeSingle();
    const file = await fetch(signed.signedUrl);
    if (!file.ok) return notFound();
    const stamped = await watermarkPdf(new Uint8Array(await file.arrayBuffer()), `ID ${student?.external_id ?? "student"}`);
    return new Response(Buffer.from(stamped), {
      headers: { "content-type": "application/pdf", "content-disposition": "inline", "cache-control": "private, no-store" },
    });
  }
  return Response.redirect(signed.signedUrl, 302);
}
