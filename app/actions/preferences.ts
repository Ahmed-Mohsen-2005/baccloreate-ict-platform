"use server";

import { cookies } from "next/headers";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const THEMES = ["system", "light", "dark"] as const;

/** Stores the theme in a cookie (works signed out) and on the profile when signed in. */
export async function setTheme(formData: FormData) {
  const value = String(formData.get("theme"));
  const theme = THEMES.find((t) => t === value) ?? "system";
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const viewer = await getViewer();
  if (viewer) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ theme }).eq("user_id", viewer.userId);
  }
}
