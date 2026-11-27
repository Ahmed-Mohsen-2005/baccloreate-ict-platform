# DEPLOY.md

Everything runs on free tiers (docs/M0-PLAN.md §1b). You need free accounts on **Supabase**, **Vercel**, **GitHub** and **Google Cloud** (for Google sign-in). You create the accounts and paste the keys yourself; secrets never go into chat, the repo or any file except `.env.local` and Vercel's settings.

Commands below are for PowerShell on Windows.

---

## 1. Supabase project (database + login)

1. Go to <https://supabase.com> → **New project**.
   - Name: anything, e.g. `bacc-ict`.
   - Region: **Central EU (Frankfurt)** (closest to Egypt; this is what PRIVACY.md says).
   - Save the database password in your password manager.
2. Apply the database schema. Easiest way, no tools needed:
   - Open **SQL Editor** → **New query**.
   - Paste the whole contents of each file below, **in this order**, and press **Run** after each one:
     1. `supabase/migrations/20261126000001_foundation.sql`
     2. `supabase/migrations/20261126000002_onboarding_functions.sql`
     3. `supabase/migrations/20261126000003_service_wrappers.sql`
     4. `supabase/migrations/20261127000004_teaching_core.sql` (attendance, announcements, materials)
     5. `supabase/migrations/20261127000005_storage_limits.sql` (file type and size limits for uploads)
     6. `supabase/migrations/20261127000006_platform_name.sql` (platform name setting)
     7. `supabase/seed.sql` (the curriculum; run it once only, and only on a fresh project)

     Upgrading an existing project? Run only the new migration files you haven't run yet, in order. Never re-run `seed.sql`.
   - Each should end with "Success. No rows returned".
3. **Settings → API Keys**: copy the **Project URL**, the **publishable key** and the **secret key** (you'll paste them in step 4). The secret key is a password: never share it.

## 2. Google sign-in

1. Go to <https://console.cloud.google.com> → create a project (any name).
2. **APIs & Services → OAuth consent screen**: User type **External**, app name, your email. Add the scope `email`. While the app is in "Testing", add your Gmail (and any test students) as test users, or press **Publish app**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (shown in Supabase under **Authentication → Sign In / Providers → Google**).
4. Copy the **Client ID** and **Client secret** into Supabase: **Authentication → Sign In / Providers → Google** → enable → paste → Save.
5. In Supabase **Authentication → URL Configuration**:
   - **Site URL**: your Vercel address (step 5), or `http://localhost:3000` for now.
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-site>.vercel.app/auth/callback`.
6. Keep **Authentication → Sign In / Providers → Email** enabled: code login uses it internally (no emails are ever sent to students).

## 3. Generate the code pepper

This random value protects the access codes. Run once and keep the output:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

If you ever change it, every existing code stops working and you have to send new codes.

## 4. Run it on your computer

1. Copy `.env.example` to `.env.local` and fill in the values:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` from step 1.3
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
   - `CODE_PEPPER` from step 3
   - `TEACHER_EMAILS=` your Gmail address
2. Install and start:

```powershell
npm install
```

```powershell
npm run dev
```

3. Open <http://localhost:3000>, go to **Sign in → Teacher → Sign in with Google**. You land on the teacher dashboard.
4. Open **Settings**, write your title (e.g. «مستر أحمد»), name and bio.
5. Create your **groups**, then **Students → Upload student file**, then **Send codes**.

## Partner teachers

Any number of teachers can run the platform; each has full access to everything. To add one: sign in as a teacher → **Settings → Google emails allowed to sign in as teacher** → add their Gmail. They then sign in from **Sign in → Teacher → Sign in with Google** and land on the same dashboard. Emails listed in the `TEACHER_EMAILS` variable on Vercel are always allowed and cannot be removed from the app, so put every partner's Gmail there too (comma-separated) and redeploy; that way no partner can lock the other out by mistake. The audit log records which teacher made each change.

## 5. Put it online (Vercel)

1. Push the repo to a **private** GitHub repository (the `.gitignore` keeps your textbooks and `.env.local` out).
2. <https://vercel.com> → **Add New → Project** → import the repo. Framework: Next.js (auto-detected).
3. **Environment Variables**: add the same values as `.env.local`, but set `NEXT_PUBLIC_SITE_URL` to `https://<your-site>.vercel.app`.
4. **Deploy**. Then add `https://<your-site>.vercel.app/auth/callback` to the Supabase redirect URLs (step 2.5) and set the Supabase **Site URL** to the Vercel address.

Note: Vercel's free Hobby plan is officially for non-commercial use (see docs/M0-PLAN.md §1b). Moving to Pro later is a settings change.

## 6. Checks after each deploy

```powershell
npm run check
```

That runs typecheck, lint and all unit and security-rule tests (no internet or Docker needed).

## Coming in later milestones

- Daily Vercel cron that keeps the free Supabase project from pausing and purges old rate-limit rows (M2).
- Weekly encrypted database backup through GitHub Actions (M2), with restore steps here.
