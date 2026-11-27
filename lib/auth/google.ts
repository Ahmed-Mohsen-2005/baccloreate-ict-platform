import "server-only";
import { teacherEmailsFromEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type GoogleIntent = "teacher" | "member";
export type GoogleOutcome =
  | { ok: true; home: "/t" | "/s" | "/p" }
  | { ok: false; error: "google_unknown" | "not_teacher" | "google_failed"; why?: string };

/**
 * Decides who a freshly signed-in Google user is (§9 Q15):
 * teacher if the email is allow-listed; otherwise the student whose imported `gmail`
 * matches, else the parent whose email matches. Unknown accounts are signed out and
 * deleted so we keep no data about them. The match is re-checked on every sign-in.
 */
export async function resolveGoogleUser(intent: GoogleIntent): Promise<GoogleOutcome> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const email = user?.email?.toLowerCase();
  if (!user) return { ok: false, error: "google_failed", why: "no_session" };
  if (!email) return { ok: false, error: "google_failed", why: "no_email" };
  if (!user.email_confirmed_at) return { ok: false, error: "google_failed", why: "unverified" };

  const admin = createAdminClient();

  const { data: listed, error: listError } = await admin.from("teacher_allowlist").select("email").eq("email", email).maybeSingle();
  // A database error here almost always means SUPABASE_SECRET_KEY is wrong (or the SQL migrations weren't run).
  if (listError) {
    console.error("google sign-in: allow-list query failed:", listError.message);
    return { ok: false, error: "google_failed", why: "admin_key" };
  }
  const isTeacher = teacherEmailsFromEnv().includes(email) || Boolean(listed);

  if (isTeacher) {
    await admin.from("account_links").delete().eq("user_id", user.id);
    const { error } = await admin.from("profiles").upsert({ user_id: user.id, role: "teacher" }, { onConflict: "user_id" });
    if (error) console.error("google sign-in: teacher profile upsert failed:", error.message);
    return error ? { ok: false, error: "google_failed", why: "profile" } : { ok: true, home: "/t" };
  }

  const forget = async (error: "google_unknown" | "not_teacher"): Promise<GoogleOutcome> => {
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(user.id);
    return { ok: false, error };
  };

  if (intent === "teacher") return forget("not_teacher");

  const [{ data: student }, { data: parent }] = await Promise.all([
    admin.from("students").select("id").eq("google_email", email).eq("status", "active").is("deleted_at", null).maybeSingle(),
    admin.from("parents").select("id").eq("email", email).is("deleted_at", null).maybeSingle(),
  ]);

  const match = student
    ? { subject_type: "student" as const, subject_id: student.id }
    : parent
      ? { subject_type: "parent" as const, subject_id: parent.id }
      : null;
  if (!match) return forget("google_unknown");

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ user_id: user.id, role: match.subject_type }, { onConflict: "user_id" });
  const { error: linkError } = await admin
    .from("account_links")
    .upsert({ user_id: user.id, ...match, method: "google" }, { onConflict: "user_id" });
  if (profileError || linkError) {
    console.error("google sign-in: member link failed:", profileError?.message ?? linkError?.message);
    return { ok: false, error: "google_failed", why: "link" };
  }

  return { ok: true, home: match.subject_type === "student" ? "/s" : "/p" };
}
