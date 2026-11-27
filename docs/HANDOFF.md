# Project handoff: state of the platform after M2

Written 2026-11-27 for whoever continues the build (Codex or a human). Read this first, then `docs/CODEX_PROMPT.md` (the work order), then `docs/M0-PLAN.md` (original architecture, data model, design plan and the owners' decisions) and `CLAUDE.md` (conventions and non-negotiables).

---

## 1. What this project is

A production web platform for the **Egyptian Baccalaureate ICT subject "Programming and Artificial Intelligence"**, taught in Grade 10 (first year of secondary) and Grade 11 (second year). It is run by **two partner teachers** (Eng. Ahmed and Eng. Abdelrahman) who both have full admin access, for **their students (minors, 15–17, about 15 today, mostly on mid-range Android phones with mobile data)** and **the students' parents (WhatsApp-first, many rarely open a web app)**.

- Arabic-first (RTL, Egyptian colloquial UI copy, English technical terms kept in English inside Arabic text) with English as the second locale.
- **No payments, fees, subscriptions or money tracking of any kind. Ever.**
- Free-tier infrastructure only (Vercel Hobby, Supabase Free, GitHub). No VPS. The only paid thing is the Anthropic API (a few US dollars a month expected).
- The curriculum is the interface: each unit is its own colour-coded "world" with a drawn object and, later, a simulation.

### Owners' decisions that override or refine the original brief
(All recorded in `docs/M0-PLAN.md` §9.)

| Topic | Decision |
| --- | --- |
| Roles | Still three roles (`teacher`, `student`, `parent`). The `teacher` role is held by **two partners**, each with full access. Everything is shared; there is no per-teacher ownership of students or groups. |
| Scope | Grade 11: all **7 units** (Term 1: units 1–4, Term 2: units 5–7), 23 lessons. Grade 10: **13 chapters, 62 lessons, English book only, one book for the whole year (no terms)**. |
| Question styles | Both lists merged into an editable `question_styles` table: Grade 11 book styles, the 2026 Grade 11 book styles, Grade 10 book styles, and the teachers' house styles. |
| Textbooks | May be used **everywhere** (question generation, tutor, summaries). Keep the PDFs in private storage, never in git, never downloadable by students unless uploaded as a material; the tutor quotes short passages and cites pages. |
| Hosting | Everything on **free tiers**; no server to run. EU data location (Supabase Frankfurt); consent text discloses the transfer to the EU/US. |
| Lesson recorder / speech-to-text | **Removed from scope** (there are no recorded sessions). |
| Online classes | Google Meet at fixed times; some groups are in-person. Online attendance uses a rotating 4-digit code shown on the teacher's screen share; in-person uses a QR. |
| Parent login | Parent access code **plus the last 4 digits of the parent's phone**. Students use the code only. |
| Google sign-in | Teachers (email allow-list). Students and parents may also sign in with Google **when their verified Gmail matches the imported `gmail` / `parent's email`**; codes still work. |
| Default edition | English for Grade 11 on import (changeable per student). Grade 10 is always English. |
| Weekly parent reports | Delivered through **WhatsApp deep links** (teacher taps send per parent); outbox is provider-agnostic for a future WhatsApp Business API. |
| Student motivation | **Private progress only** (keys earned, streaks, mastery). No leaderboards, no rankings. |
| Advanced features | All four groups wanted: live class kit, practice that sticks, interactive labs, AI helpers. |
| Landing page | Futuristic, big-tech style, with motion (the owners explicitly asked; this relaxes the brief's "no fade-ins" rule on the **landing page only**). Inside the app, motion stays purposeful. `prefers-reduced-motion` must always be respected. |

---

## 2. Progress by milestone

| Milestone | Status |
| --- | --- |
| M0 Plan | Done and approved. |
| M1 Foundation | Done, deployed, and signed in with Google as a teacher on the live site. |
| Redesign (not a numbered milestone) | Done: object workbench, futuristic landing, unit pages. |
| M2 Teaching core | **Code complete and tested; not yet verified on the live Supabase project.** |
| Cross-cutting prerequisite 3.1 (topics) | In progress on branch `m3-topics`: default topic migration, per-lesson editor and PGlite coverage. |
| M3 Assessment | Not started. |
| M4 AI layer | Not started. |
| M5 Tutor and insight | Not started. |
| M6 Simulations and polish | Not started (landing and object illustrations are done). |
| M7 Launch | Not started. |

### What exists today

**Auth and onboarding (M1)**
- Teacher: Google OAuth, allowed by `TEACHER_EMAILS` (env) or the `teacher_allowlist` table (editable in Settings). `app/auth/callback/route.ts` finishes sign-in; `proxy.ts` forwards a stray `/?code=<uuid>` to the callback; failures redirect to `/login?error=…&why=<code>` (reasons: `exchange`, `admin_key`, `profile`, `link`, `no_session`, `no_email`, `unverified`) and log the cause.
- Student/parent code login (`lib/auth/code-login.ts`): 6-character codes from an unambiguous alphabet, stored only as HMAC-SHA256 with `CODE_PEPPER`; per-IP and global rate limits through `app.hit_rate_limit`; parents must also enter the last 4 digits of their phone; the server creates a hidden auth user per person (`student-<id>@code-login.invalid`), mints a one-time magic-link token and verifies it server-side so no token reaches the URL.
- Google matching for students/parents (`lib/auth/google.ts`): unknown Google accounts are signed out and deleted immediately.
- Bulk import (`lib/import/*`, `app/[locale]/t/students/import`): reads the teacher's real columns `studentID, Name, grade, phone number, gmail, parent's email, parent's phone number, venue, gender` from `.xlsx`/`.csv`, normalises Egyptian phones (restores a dropped leading 0), validates per row, previews, assigns groups and editions, requires attested guardian consent, and commits in one transaction (`app.import_students`). Re-importing updates by `studentID`. Siblings are linked through the shared parent phone.
- Send codes (`app/[locale]/t/codes`): one WhatsApp message per family listing every child's code plus the parent's code; codes are issued at send time and shown once; the outbox row never contains codes.
- Self-registration: `/join` form with a required consent checkbox → `join_requests` → teacher approves into a group (`app.approve_join_request`).
- Consent history in `consents` (`import_attested`, `signup_checkbox`, `parent_portal`); parents confirm in their portal (`app.confirm_consent`).

**Curriculum (M1)**
- `grade_levels → units → lessons → topics`, bilingual, seeded in `supabase/seed.sql` from the textbooks' contents pages (confirmed by the owners). The `/t/curriculum` editor supports editing, adding, reordering and deleting curriculum rows. The topics slice adds one `General` / `عام` topic to every lesson, creates it automatically for new lessons, and adds per-lesson topic CRUD/reordering.
- Public pages: landing `/`, unit pages `/units/<grade>/<code>`, privacy `/privacy`.

**Teaching core (M2)**
- `class_sessions` generated idempotently from each group's weekly schedule in Cairo time (daylight saving handled and tested).
- Attendance (`/t/attendance`): roster with 48 px present/late/absent taps, "all present", rotating 4-digit code + QR (drawn client-side with `qrcode`), student check-in at `/s/checkin` (`app.check_in(code)`: own group only, unexpired code, never overwrites a teacher mark, rate-limited per student).
- Announcements (`/t/announcements`): to a group, a grade, all students or all parents, with scheduled publishing; shown on student and parent homes.
- Materials (`/t/materials`): PDFs and images uploaded **directly from the browser to private Supabase Storage through a one-time signed upload URL** (Vercel's ~4.5 MB body limit), links, videos and notes; attached to grade/lesson/edition/groups; scheduled release; optional student-ID watermark on PDFs; opened through `/api/materials/<id>` (RLS decides access; 60-second signed URLs).
- Student portal: home (next class, Join Meet button within 15 minutes of a session, Check in button while a class is live, announcements, curriculum with lesson codes linking to lesson pages), lesson page listing released materials.
- Parent portal: one card per child with consent confirmation, group, schedule, 30-day attendance sentence, announcements, WhatsApp button.
- Settings: platform name (Arabic/English, shared by both teachers), teachers' names, bio, years, WhatsApp number, social links (stored, **not yet rendered on the public page**), teacher allow-list.

**Design system**
- Tokens in `styles/tokens.css`; light theme = "notebook paper", dark theme = "blackboard" (designed, not inverted). Domain colours (light / dark): society `#0d6e6a`/`#6cd0c6`, cipher `#5b3dbf`/`#b6a6f8`, protocol `#1c5ab2`/`#8fb6f6`, swatch `#a8224e`/`#f593b0`, data `#4d6b0e`/`#b5d57a`, signal `#8a5300`/`#edbf5e`, neuron `#8a2b86`/`#e59ddf`, programming = ink. Base: paper `#f3f5f6`/`#15231f`, surface `#fff`/`#1c2d28`, ink `#15212b`/`#e9efeb`, pencil `#52606b`/`#a9b8b1`, ruling `#d3dae0`/`#2f443d`, margin(red) `#b92828`/`#f48a86`. All text colours measured ≥ 4.5:1.
- Fonts (self-hosted by `next/font`): Alexandria (display, lesson codes), IBM Plex Sans Arabic (text), IBM Plex Mono (code only).
- Signature element: `LessonCode` (`components/lesson-code.tsx`), a lesson code whose glyphs fill with the unit colour in proportion to mastery (`--fill`). **Mastery is not recorded yet, so codes are outlines.**
- Unit objects (`components/unit-object.tsx`): one SVG per domain (node graph, cipher wheel, request/response packets, swatches, data table, scatter + regression line, neural layers, variable boxes), animated on hover/focus/press via `.tile`.
- Landing (`app/[locale]/page.tsx`): hero stage (gradient-shine headline, pointer-reactive particle network `components/particle-field.tsx`, CSS-only orbit of the seven unit worlds `components/hero-orbit.tsx`), lesson-code marquee, unit bench (bento), feature showcase (`components/feature-showcase.tsx`, designed previews of every planned feature), call to action. Scroll reveals use CSS scroll-driven animations as progressive enhancement.
- Cybersecurity unit signature: lesson titles show as cipher text and decrypt on tap (`components/decrypt-title.tsx`).
- Owner feedback (2026-11-27): the interior experience feels too traditional and should get a separate design pass with a professional, animated, glassmorphic and programming-based direction. Keep the current slice focused on topic management; scope the visual redesign independently.

---

## 3. Architecture and repository map

```
app/
  [locale]/                    locale-prefixed routes (ar at "/", en at "/en"; next-intl "as-needed")
    page.tsx                   landing
    units/[grade]/[code]/      public unit page
    login/ join/ privacy/
    t/                         TEACHER area (layout guards role=teacher)
      attendance/ announcements/ materials/ students/ (+import, [id]) groups/ codes/
      join-requests/ curriculum/ settings/ page.tsx(dashboard)
    s/                         STUDENT area (home, checkin/, lessons/[lesson])
    p/                         PARENT area (home)
  auth/callback/route.ts       Google OAuth return
  api/materials/[id]/route.ts  access-checked file open
components/                    ui.tsx (Button/Input/Field/Sheet/Notice), site-header, unit-object, lesson-code, hero-orbit, …
i18n/                          routing.ts, request.ts, navigation.ts
lib/
  auth/ (viewer, code-login, google)  supabase/ (server, admin, browser)  import/  db/ (types, domain)
  curriculum.ts schedule.ts codes.ts phone.ts whatsapp.ts brand.ts pdf-watermark.ts env.ts digits.ts
messages/ar.json en.json       ALL UI copy (parity enforced by a test)
proxy.ts                       Next 16 "middleware": locale + session refresh + /?code= forwarding
supabase/migrations/*.sql      6 migrations (see §4);  supabase/seed.sql  production seed (curriculum + styles)
tests/rls/ (PGlite)  tests/unit/  tests/stubs/
docs/  M0-PLAN.md  DEPENDENCIES.md  HANDOFF.md  CODEX_PROMPT.md
```

- **Stack:** Next.js 16.4.6 (App Router, `proxy.ts`), React 19.3, TypeScript 5.9.3 strict (+ `noUncheckedIndexedAccess`), Tailwind 4, next-intl 4, Supabase (`@supabase/supabase-js` 2.119, `@supabase/ssr` 0.12), zod 4, Vitest 5, PGlite for database tests, Playwright installed but **not configured**, ESLint 9 with Next config.
- **Environment variables** (names only; see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `CODE_PEPPER` (≥ 32 chars), `TEACHER_EMAILS`, `CRON_SECRET`, and (M4+) `ANTHROPIC_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART`. `lib/env.ts` validates the first six; add the AI variables when M4 starts.
- **Git/deploy:** GitHub repo `Ahmed-Mohsen-2005/baccloreate-ict-platform`. All work is on branch **`m1-foundation`**; `main` contains only the initial commit. Vercel builds the branch. Merge to `main` (via pull request) before production use.

---

## 4. Database (6 migrations, run in order in the Supabase SQL editor)

1. `20261126000001_foundation.sql`: enums; `profiles`, `teacher_allowlist`, `site_settings` (singleton), `grade_levels`, `units`, `lessons`, `topics`, `question_styles`, `groups`, `students`, `parents`, `guardianships`, `account_links`, `consents`, `access_codes`, `join_requests`, `messages` (outbox), `audit_log`, `rate_limits`; helper functions `app.is_teacher()`, `app.current_student_id()`, `app.current_parent_id()`, `app.my_student_ids()`; **RLS enabled and forced on every table**; audit triggers on `access_codes`, `students`, `teacher_allowlist` (code hashes stripped); `app.hit_rate_limit`, `app.purge_rate_limits`.
2. `…0002_onboarding_functions.sql`: `app.import_students`, `app.issue_access_code`, `app.approve_join_request`, `app.confirm_consent`, `app.reorder` (+ thin `public.*` wrappers because PostgREST exposes only `public`).
3. `…0003_service_wrappers.sql`: service-role-only wrappers for the rate-limit helpers.
4. `20261127000004_teaching_core.sql`: `class_sessions`, `attendance`, `announcements`, `materials`, `material_groups`; `app.my_group_ids()`, `app.my_grade_ids()`, `app.material_visible()` (SECURITY DEFINER so RLS on the join table cannot leak), `app.check_in()`; private `materials` Storage bucket (guarded by `to_regclass` so tests on PGlite still run).
5. `…0005_storage_limits.sql`: bucket limited to PDF/PNG/JPG/WebP, 50 MB.
6. `…0006_platform_name.sql`: `site_settings.platform_name_ar/en`.

`supabase/seed.sql` seeds `site_settings`, both grades, all units/lessons (Arabic titles and page numbers for Grade 11 in both editions; English only for Grade 10) and the 23 question styles. **Run once, on a fresh project only.** `lib/db/types.ts` is hand-written to mirror the schema; keep it in sync (or regenerate with the Supabase CLI once linked).

**RLS model:** teacher = full access (except the audit log, read-only); students read only their own rows and the content targeted at them (group, grade, edition, release time); parents read only their children's rows through `app.my_student_ids()`; anonymous visitors read only the public curriculum, site settings and nothing personal. Secrets and plaintext codes never reach tables. The service-role client exists only in `lib/auth/code-login.ts`, `lib/auth/google.ts`, the public join action, the rate-limit calls, signed-URL issuing and storage deletes.

---

## 5. Tests and quality gates

`npm run check` = `tsc --noEmit` + `eslint .` + `vitest run`. Current result: **0 type errors, 0 lint problems, 127 tests passing** (61 RLS/function tests on PGlite, 66 unit tests), and `next build` succeeds. RLS tests boot an in-memory Postgres with a Supabase shim (`tests/rls/supabase-shim.sql`), apply every migration and `seed.sql`, then act as teacher, two students, a parent, an unrelated parent and anonymous visitors, asserting cross-reads and cross-writes fail. **Every new table or policy must come with such tests.**

Custom lint rules to know: a string-literal rule bans physical Tailwind utilities `ml-/mr-/pl-/pr-/left-/right-` (use `ms-/me-/ps-/pe-/start-/end-` for RTL); `react-hooks/purity` rejects `Date.now()` in components (use `new Date().getTime()` or compute server-side); `no-explicit-any` is an error. TypeScript is pinned to 5.9.3 because typescript-eslint does not yet support 6.x.

---

## 6. Known gaps and deviations (the honest list)

Not built from M1/M2 scope of the brief:
- **Parents page** (`/t/parents`, grouped by phone) and **student profile tabs** (attendance, grades, mastery, notes). Students have no notes field yet.
- **Teacher dashboard** shows counts only (students, unassigned, pending requests, unsent codes); no "today's sessions", "ungraded work" or "needs attention".
- **Offline attendance queue** on the teacher's phone (belongs with the PWA work).
- **Unread announcements** and **"continue where you left off"** on the student home.
- **Student-side edition switch** (the field exists; no UI).
- **Teacher photo upload** and rendering of social links and photo on the public page.
- **Arabic names in the PDF watermark** (the stamp uses the student ID because standard PDF fonts have no Arabic glyphs).
- **Data export and deletion flows**, `data_requests`, 30-day purge job, and consent withdrawal UI.
- **Audit coverage**: only access codes, student edits/deletes and the teacher allow-list are audited; the brief also asks for grade changes, exports and deletions.
- **AI on/off switches per feature** (the `site_settings.ai_features` column exists, unused).
- **Playwright**: installed, no config, no tests.
- **Topics deployment**: migration `20261128000007_topics.sql` must be applied to Supabase before the new topic editor is deployed.
- **Cron**: no `/api/cron/*` routes or `vercel.json` yet (the keep-alive for the free Supabase project, rate-limit purge and scheduled work all need it; Vercel Hobby allows daily crons only).
- **Backups**: weekly encrypted dump via GitHub Actions is planned, not built.
- M2 has **never been exercised against the live Supabase project**. The owners must run migrations 4–6 and test a real class (create a group with today's schedule, start check-in, check in as a test student, upload a PDF, open it as a student).

Operational notes learned the hard way:
- Vercel failed the first build on a TypeScript narrowing error that passed locally; always run `next build` before pushing.
- Supabase falls back to the Site URL (`/?code=…`) when the callback URL isn't in **Authentication → URL Configuration → Redirect URLs**; the proxy now handles that, but the setting should still be correct.
- `TEACHER_EMAILS` changes need a Vercel **Redeploy** to take effect. Put both partners' Gmail addresses in it so neither can lock the other out.
- Supabase Free pauses after ~7 idle days and has no backups; both are addressed in M7.

---

## 7. Local setup quick reference

```powershell
npm install
npm run dev
npm run check
```

Copy `.env.example` to `.env.local` and fill it (never commit it, never paste it into a chat). `DEPLOY.md` has the full Supabase/Google/Vercel walkthrough. The copyrighted textbooks and the teachers' study guides live **outside the repo** in `Sec 1/` and `Sec 2/` next to it, and are git-ignored.
