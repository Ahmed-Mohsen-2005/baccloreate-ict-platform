"use server";

import { headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { signInWithCode, type CodeLoginError } from "@/lib/auth/code-login";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: CodeLoginError };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loginWithCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const kind = formData.get("kind") === "parent" ? "parent" : "student";
  const result = await signInWithCode({
    kind,
    code: String(formData.get("code") ?? ""),
    last4: String(formData.get("last4") ?? ""),
    ip: await clientIp(),
  });
  if (!result.ok) return { error: result.error };
  redirect({ href: result.home, locale: await getLocale() });
  return {};
}

export async function startGoogleSignIn(formData: FormData) {
  const intent = formData.get("as") === "teacher" ? "teacher" : "member";
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${serverEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?locale=${locale}&as=${intent}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    redirect({ href: { pathname: "/login", query: { error: "google_failed" } }, locale });
    return;
  }
  nextRedirect(data.url);
}
