import "server-only";
import { cache } from "react";
import type { SubjectType, UserRole } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  userId: string;
  role: UserRole | null;
  subjectType: SubjectType | null;
  subjectId: string | null;
  theme: "system" | "light" | "dark";
};

/** The signed-in user and what they act as. Cached for one request. Reads go through RLS. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: link }] = await Promise.all([
    supabase.from("profiles").select("role, theme").eq("user_id", userId).maybeSingle(),
    supabase.from("account_links").select("subject_type, subject_id").eq("user_id", userId).maybeSingle(),
  ]);

  const theme = profile?.theme === "light" || profile?.theme === "dark" ? profile.theme : "system";
  return {
    userId,
    role: profile?.role ?? null,
    subjectType: link?.subject_type ?? null,
    subjectId: link?.subject_id ?? null,
    theme,
  };
});

/**
 * Page/action guard: returns the viewer if they have `role`, otherwise sends them to sign in.
 * RLS enforces the same rule in the database; this gives a clean redirect instead of empty pages.
 */
export async function requireRole(role: UserRole, locale: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== role) {
    const { redirect } = await import("@/i18n/navigation");
    const as = role === "teacher" ? "teacher" : role;
    redirect({ href: { pathname: "/login", query: { as } }, locale });
    throw new Error("unreachable");
  }
  return viewer;
}

export function homeFor(role: UserRole | null): "/t" | "/s" | "/p" | "/login" {
  if (role === "teacher") return "/t";
  if (role === "student") return "/s";
  if (role === "parent") return "/p";
  return "/login";
}
