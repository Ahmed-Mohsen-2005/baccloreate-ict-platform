"use server";

import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/viewer";
import { toWesternDigits } from "@/lib/digits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CheckinState = { done?: boolean; error?: "invalid" | "rateLimited" | "generic" };

/** Student enters (or scans) the 4-digit code. The database decides if it is valid for their group. */
export async function checkIn(_prev: CheckinState, formData: FormData): Promise<CheckinState> {
  const viewer = await requireRole("student", await getLocale());
  const code = toWesternDigits(String(formData.get("code") ?? "")).replace(/\D/g, "").slice(0, 4);
  if (!/^[0-9]{4}$/.test(code)) return { error: "invalid" };

  // 4 digits are guessable, so cap attempts per student (a code is also limited to the student's own group).
  const { data: allowed } = await createAdminClient().rpc("hit_rate_limit", { p_key: `checkin:${viewer.userId}`, p_window_seconds: 600, p_max: 10 });
  if (allowed === false) return { error: "rateLimited" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in", { p_code: code });
  if (error) return { error: error.code === "22023" ? "invalid" : "generic" };
  return { done: true };
}
