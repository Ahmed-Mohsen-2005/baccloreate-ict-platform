import { NextResponse, type NextRequest } from "next/server";
import { resolveGoogleUser } from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/server";

/** Google OAuth returns here. Exchanges the code for a session, then decides who the user is. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = params.get("locale") === "en" ? "en" : "ar";
  const intent = params.get("as") === "teacher" ? "teacher" : "member";
  const prefix = locale === "en" ? "/en" : "";
  // Redirect on the address the user is actually on: the sign-in cookies were set there, and
  // NEXT_PUBLIC_SITE_URL may point at a different Vercel address.
  const site = request.nextUrl.origin;
  const fail = (error: string, why?: string) =>
    NextResponse.redirect(new URL(`${prefix}/login?as=${intent === "teacher" ? "teacher" : "student"}&error=${error}${why ? `&why=${why}` : ""}`, site));

  const code = params.get("code");
  if (!code) return fail("google_failed", "no_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Usually a missing/expired PKCE verifier cookie, or a code that was already used.
    console.error("google sign-in: code exchange failed:", error.message);
    return fail("google_failed", "exchange");
  }

  const outcome = await resolveGoogleUser(intent);
  if (!outcome.ok) return fail(outcome.error, outcome.why);
  return NextResponse.redirect(new URL(`${prefix}${outcome.home}`, site));
}
