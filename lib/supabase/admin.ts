import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client: bypasses RLS. Use only for the narrow server flows that need it
 * (code login, Google account matching, public join requests, rate limiting).
 * Everything the teacher does goes through the teacher's own session instead.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
