import "server-only";
import { timingSafeEqual } from "node:crypto";
import { hmacCode, normaliseCode } from "@/lib/codes";
import { toWesternDigits } from "@/lib/digits";
import type { SubjectType } from "@/lib/db/types";
import { serverEnv } from "@/lib/env";
import { lastFourDigits } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CodeLoginError = "invalid" | "last4" | "rateLimited" | "generic";
export type CodeLoginResult = { ok: true; home: "/s" | "/p" } | { ok: false; error: CodeLoginError };

const PER_IP = { windowSeconds: 600, max: 10 };
// Caps distributed guessing across all IPs: 6-char codes have ~887M combinations.
const GLOBAL = { windowSeconds: 600, max: 300 };

/** Internal login identity for a code user. Never shown or emailed (.invalid is a reserved TLD). */
function syntheticEmail(kind: SubjectType, subjectId: string): string {
  return `${kind}-${subjectId}@code-login.invalid`;
}

function sameDigits(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function signInWithCode(input: {
  kind: SubjectType;
  code: string;
  last4?: string;
  ip: string;
}): Promise<CodeLoginResult> {
  const admin = createAdminClient();

  const [perIp, global] = await Promise.all([
    admin.rpc("hit_rate_limit", { p_key: `code-login:${input.ip}`, p_window_seconds: PER_IP.windowSeconds, p_max: PER_IP.max }),
    admin.rpc("hit_rate_limit", { p_key: "code-login:global", p_window_seconds: GLOBAL.windowSeconds, p_max: GLOBAL.max }),
  ]);
  if (perIp.error || global.error) return { ok: false, error: "generic" };
  if (perIp.data === false || global.data === false) return { ok: false, error: "rateLimited" };

  const code = normaliseCode(input.code);
  if (!code) return { ok: false, error: "invalid" };

  const { data: row, error: codeError } = await admin
    .from("access_codes")
    .select("id, subject_type, subject_id")
    .eq("code_hmac", hmacCode(code, serverEnv().CODE_PEPPER))
    .is("revoked_at", null)
    .maybeSingle();
  if (codeError) return { ok: false, error: "generic" };
  if (!row || row.subject_type !== input.kind) return { ok: false, error: "invalid" };

  if (input.kind === "parent") {
    const { data: parent } = await admin.from("parents").select("phone_e164, deleted_at").eq("id", row.subject_id).maybeSingle();
    if (!parent || parent.deleted_at) return { ok: false, error: "invalid" };
    const typed = toWesternDigits(input.last4 ?? "").replace(/\D/g, "");
    if (!sameDigits(typed, lastFourDigits(parent.phone_e164))) return { ok: false, error: "last4" };
  } else {
    const { data: student } = await admin.from("students").select("status, deleted_at").eq("id", row.subject_id).maybeSingle();
    if (!student || student.deleted_at || student.status !== "active") return { ok: false, error: "invalid" };
  }

  // One auth user per person for code logins, created on first use.
  const email = syntheticEmail(input.kind, row.subject_id);
  const { data: link } = await admin
    .from("account_links")
    .select("user_id")
    .eq("subject_type", input.kind)
    .eq("subject_id", row.subject_id)
    .eq("method", "code")
    .maybeSingle();

  if (!link) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { via: "code" },
    });
    if (createError || !created.user) return { ok: false, error: "generic" };
    const userId = created.user.id;
    const { error: profileError } = await admin.from("profiles").insert({ user_id: userId, role: input.kind });
    const { error: linkError } = await admin
      .from("account_links")
      .insert({ user_id: userId, subject_type: input.kind, subject_id: row.subject_id, method: "code" });
    if (profileError || linkError) {
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, error: "generic" };
    }
  }

  // Mint a one-time token server-side and exchange it for a session cookie. No token reaches the URL.
  const { data: magic, error: linkTokenError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkTokenError || !magic.properties?.hashed_token) return { ok: false, error: "generic" };

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: magic.properties.hashed_token });
  if (verifyError) return { ok: false, error: "generic" };

  await admin.from("access_codes").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: true, home: input.kind === "student" ? "/s" : "/p" };
}
