import "server-only";
import { z } from "zod";

/**
 * Server-only environment. Values come from Vercel / .env.local and never reach the client
 * (except NEXT_PUBLIC_* which are public by design). Names are listed in .env.example.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url(),
  CODE_PEPPER: z.string().min(32, "CODE_PEPPER must be at least 32 random characters"),
  TEACHER_EMAILS: z.string().default(""),
  CRON_SECRET: z.string().min(16).optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function serverEnv() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Missing or invalid environment variables: ${missing}. See .env.example and DEPLOY.md.`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function teacherEmailsFromEnv(): string[] {
  return serverEnv()
    .TEACHER_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
