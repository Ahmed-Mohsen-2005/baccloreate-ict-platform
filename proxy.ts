import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

/**
 * Runs before every page: picks the locale (Arabic at "/", English at "/en") and
 * refreshes the Supabase session cookie. Access control happens in each area's
 * layout (server-side) and in Postgres RLS, never only here.
 */
export default async function proxy(request: NextRequest) {
  // If the Google sign-in comes back to the home page ("/?code=…", which Supabase does when the
  // callback address isn't in its Redirect URLs list), finish the sign-in instead of showing the landing page.
  const { pathname, searchParams } = request.nextUrl;
  const authCode = searchParams.get("code");
  if ((pathname === "/" || pathname === "/en") && authCode && /^[0-9a-f-]{36}$/i.test(authCode)) {
    const target = new URL("/auth/callback", request.nextUrl.origin);
    target.searchParams.set("code", authCode);
    target.searchParams.set("locale", pathname === "/en" ? "en" : "ar");
    return NextResponse.redirect(target);
  }

  const response = intl(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Skip API routes, the auth callback, Next internals and static files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
