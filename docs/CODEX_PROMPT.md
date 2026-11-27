# Work order for Codex: complete the platform (M3 to M7)

You are the lead engineer continuing a production platform that is already running on Vercel + Supabase. M0 (plan), M1 (foundation) and M2 (teaching core) are built and committed. Your job is to deliver **M3 through M7**, plus the leftover gaps listed in `docs/HANDOFF.md` §6, in small, tested, committed vertical slices.

Read, in order: `AGENTS.md` → this file → `docs/HANDOFF.md` → `CLAUDE.md` → `docs/M0-PLAN.md`. If anything here conflicts with `CLAUDE.md` or the owners' decisions in `docs/M0-PLAN.md` §9, **stop and ask**; do not silently pick one.

---

## 0. Who you are building for (so you can judge trade-offs)

- Two partner teachers run it (both full admins). About 15 students today, minors (15–17), mid-range Android phones on mobile data, Arabic-first. Parents are WhatsApp-first and may never open a web app.
- Free tiers only: Vercel Hobby, Supabase Free, GitHub Actions. The Claude API is the only paid service.
- The subject is the Egyptian Baccalaureate "Programming and Artificial Intelligence": Grade 11 has 7 units / 23 lessons, Grade 10 has 13 chapters / 62 lessons (English only).

---

## 1. Non-negotiable rules (violating any of these is a failed task)

1. **No payments, fees, subscriptions, invoices, prices, paid/unpaid states, or money tracking anywhere.** Remove anything a library or template brings in.
2. **Three roles only:** `teacher` (held by both partners, full access), `student`, `parent`. Never add assistant/staff roles.
3. **Minors' data protection.** Guardian consent is recorded; data minimisation (no national ID, address, full birth date); **RLS enabled and forced on every table**; no student data to third parties except the AI provider **through server code only**; never use student data for model training; keep `PRIVACY.md` and the `/privacy` text current whenever you store something new.
4. **AI drafts, teachers approve.** No AI output may change a grade, reach a parent, or be shown to students as official content without a teacher's explicit approval. The only exception is the student tutor, which is always labelled "AI" and grounded in approved material.
5. **Secrets never reach the client or the repo.** AI calls live in `lib/ai/` behind `import "server-only"`. **Never read, print, request or log `.env.local` or any key.** `.env.example` lists names only.
6. **Mobile-first, low-bandwidth, Arabic-first.** Every screen must work at 360 px wide in RTL on a throttled connection. Heavy things (editor, Pyodide, OpenCV, simulations) are lazy-loaded and code-split; nothing heavy on the landing page.
7. **Accessibility:** keyboard reachable, visible focus, WCAG AA contrast in light and dark, `prefers-reduced-motion` respected, labelled controls, `aria-live` for async results, no colour-only meaning.
8. **No dependency that phones home with user data.** Record every new dependency with a one-line reason in `docs/DEPENDENCIES.md`.
9. **Copyright:** the textbooks and the teachers' study guides (`Sec 1/`, `Sec 2/`, outside the repo, git-ignored) are copyrighted. Never commit them or any extract of them. Store ingested text only in the database/private storage. Student-facing output may quote only short passages with page citations.
10. **No hard-coded teacher names, platform name, or curriculum titles in UI code.** Names come from `site_settings`; the curriculum is data. All UI strings live in `messages/ar.json` and `messages/en.json` (parity is enforced by a test). Arabic is plain Egyptian colloquial with English technical terms; write gendered forms from `students.gender` where the text addresses a student or parent.

---

## 2. How to work

- **Vertical slices.** Each slice = migration (if any) + RLS + tests + server code + UI + copy (ar and en) + docs. One commit per slice with a clear message. Keep commits buildable.
- **Before every commit:** `npm run check` (typecheck + lint + all tests) **and** `npx next build` must pass. Vercel previously failed on a narrowing error that passed locally.
- **Tests are mandatory:** unit tests for pure logic; **RLS tests on PGlite for every new table, policy and SECURITY DEFINER function** (see `tests/rls/teaching-core.test.ts` for the pattern: act as teacher, two students in different groups/grades, a parent, an unrelated parent, anonymous; assert cross-reads/writes fail); Playwright E2E for the flows in §10.
- **Migrations:** new numbered files in `supabase/migrations/` (next is `20261128000007_…`). Must run on PGlite (guard Storage/extension-specific SQL with `to_regclass`/`do $$` blocks). SECURITY DEFINER functions use `set search_path = ''`, check the caller inside, and have explicit `revoke … from public, anon` / `grant … to authenticated`. Expose RPCs through thin `public.*` wrappers (PostgREST only exposes `public`). Update `lib/db/types.ts` by hand to match (or regenerate with the Supabase CLI if you link a project) and update `DEPLOY.md`'s migration list.
- **Stop at each milestone checkpoint** (end of M3, M4, M5, M6, M7). At a checkpoint produce a short report: what was built, what was verified and how, screenshots at **360 px and 1280 px in both light and dark** (Playwright can produce them), open issues, and the exact manual steps the owners must do (usually: run new SQL files on Supabase, set env vars on Vercel, redeploy). Then wait for approval. Do not start the next milestone before it.
- **Ask when blocked** instead of guessing, especially for: curriculum content, anything legal, anything that costs money, anything that sends data to a new third party.
- You cannot reach the owners' live Supabase/Vercel. Anything that needs them (running SQL, setting env vars, creating a Google OAuth client) goes in the checkpoint report as numbered steps. Build so the app degrades gracefully (clear Arabic/English message) when an optional env var (e.g. `ANTHROPIC_API_KEY`) is missing.
- Keep `README.md`, `DEPLOY.md`, `PRIVACY.md`, `docs/DEPENDENCIES.md`, `AGENTS.md` and `docs/HANDOFF.md` current (update the status table in `HANDOFF.md` §2 at each checkpoint).

### Codebase conventions you must follow
- Next.js 16 App Router: the request hook file is **`proxy.ts`** (not `middleware.ts`); `params` and `searchParams` are Promises; `cookies()`/`headers()` are async. Use `setRequestLocale(locale)` in pages. Locale routing is `next-intl` "as-needed" (Arabic at `/`, English at `/en`): import `Link`, `redirect`, `usePathname` from `@/i18n/navigation`, never from `next/link`.
- Server actions guard themselves: `await requireRole("teacher" | "student" | "parent", locale)` from `lib/auth/viewer.ts`, then use the **user-scoped** client `createClient()` so RLS applies. Use the service-role client `createAdminClient()` only where unavoidable (code login, Google matching, public join, rate limits, signed URLs/storage deletes, cron jobs, AI logging) and say why in a comment. Never import `lib/supabase/admin` or `lib/ai/*` from a client component (they start with `import "server-only"`).
- Styling: Tailwind 4 with the tokens in `styles/tokens.css` (`bg-paper`, `bg-surface`, `text-ink`, `text-pencil`, `border-ruling`, `text-margin`, `text-accent`). Use `components/ui.tsx` (Button, Input, Select, Textarea, Field, Sheet, Notice, PageTitle). Unit colour = `domainClass(domain)` on an ancestor so `--accent` resolves; mastery = `LessonCode`'s fill. Radius follows hierarchy (4 px chips, 8 px controls, 14 px sheets). **Use logical utilities only** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`); a lint rule fails the build on `ml-/mr-/pl-/pr-/left-/right-`. English terms inside Arabic text go in `<Term>` or `<bdi>`.
- Lint gotchas: `Date.now()` in components fails `react-hooks/purity` (use `new Date().getTime()` or compute server-side); no `any` without an explanatory comment; TypeScript stays pinned to 5.9.3.
- Forms: native `<form action={serverAction}>` or `useActionState` for validation errors; Zod for every server input; return typed `{ ok, error }` states; error copy says what happened and how to fix it (never "something went wrong" alone).
- Timezone: store `timestamptz`; display in `Africa/Cairo`; convert `datetime-local` inputs with `zonedToUtc` from `lib/schedule.ts`.
- Rate limits: `public.hit_rate_limit(key, window_seconds, max)` (service role only). Apply to code login, check-in, uploads, tutor, AI endpoints.
- Audit: extend `app.audit_row()` triggers to new sensitive tables (grades, exports, deletions, code regeneration). Never put code hashes or secrets in audit rows.

---

## 3. Cross-cutting prerequisite slice (do this first, before M3 features)

**3.1 Topics.** The `topics` table exists with no rows or UI, but questions, mastery and reports depend on it. Add: (a) a default topic per lesson created by a trigger/function when a lesson is created and a one-off backfill for existing lessons (title "General" / «عام»); (b) topic CRUD and reorder inside `/t/curriculum` (per lesson); (c) tests. Topics are bilingual (`title_ar` nullable for Grade 10).

**3.2 Playwright setup.** `playwright.config.ts` with projects `desktop-en` (LTR, 1280×800) and `mobile-ar-rtl` (Pixel-class 360×800, locale `ar`, RTL, throttled network profile). A `scripts/seed-demo.ts` (never run in production, clearly labelled demo) that creates a teacher account, groups, students, parents with known codes against a **local Supabase** (Supabase CLI + Docker in CI) or a dedicated free test project selected by env. Document how to run it. Add the first smoke test (landing renders in both projects, login page works) and a screenshot helper that writes to `screenshots/<milestone>/<screen>-<viewport>-<theme>.png`.

**3.3 Cron plumbing.** `vercel.json` with **one daily cron** (Hobby limit) hitting `/api/cron/daily`, authenticated by `CRON_SECRET` (constant-time compare; reject otherwise). The handler fans out to idempotent jobs: Supabase keep-alive query, `app.purge_rate_limits()`, release of scheduled content is **not** a job (visibility is decided in SQL at read time), purge of soft-deleted people older than 30 days (once data-deletion exists), weekly jobs gated by weekday (parent-report drafts, at-risk scores). Each job logs start/end/outcome to a small `job_runs` table (teacher-readable).

**3.4 Leftover M1/M2 gaps (small, do them early):** `/t/parents` (parents grouped by phone with their children and a "send codes" shortcut); student notes (`student_notes`: teacher-only text per student, timestamped, author = teacher user); teacher dashboard (today's sessions with attendance state, ungraded work count, "needs attention" placeholder wired later to M5, recent activity from `audit_log`/`messages`); student edition switch (persisted on `students.edition`, only for grades whose `editions` has more than one entry; the student may change their own edition through a narrow SECURITY DEFINER function, not a broad UPDATE grant); unread announcements (`announcement_reads (announcement_id, user_id)`, badge on home); "continue where you left off" (last opened lesson per student); render teacher photo/social links on the landing "About the teachers" section and allow multiple teacher cards via a `teacher_profiles` table (name_ar/en, title, bio_ar/en, years, photo_key, socials) edited in Settings; photo upload through the same signed-upload pattern as materials (public-read bucket `public-assets` for the photo only).

---

## 4. M3: Assessment (question bank, quizzes, exams, homework, grade book, paper OMR, live quiz, code playground and tasks)

### 4.1 Data model (new migration; RLS on all; student-readable subsets only through functions/views)
- `questions`: `id`, `style_id → question_styles`, `type` enum (`mcq`, `multi_select`, `true_false`, `fill_blank`, `short_answer`, `explain_why`, `code_tracing`, `find_bug`), `language` (`ar`/`en`/`bilingual`), `stem` text, `options` jsonb (array of `{id, text}`), `answer` jsonb (type-specific), `explanation` text, `rubric` jsonb (for open answers: criteria with points and model points), `difficulty` smallint 1–5, `time_seconds`, `image_key`, `lesson_id`, `source_chunk_id` (null until M4), `status` (`draft`/`approved`/`rejected`), `origin` (`teacher`/`import`/`ai`), `created_by`. Join table `question_topics (question_id, topic_id)`.
- **Students must never be able to read `answer`, `explanation` or `rubric` of a question before release.** Therefore `questions` is **teacher-only**; students get questions through SECURITY DEFINER functions/RPCs that return only the public columns (stem, options, type, time, image) for items in a submission they own and that is open, and return answers/explanations only after `assessments.released_at`. Write RLS tests that prove a student cannot read answers by any path (direct select, join, RPC on someone else's submission, after the window closes).
- `assessments` (`kind` quiz/exam/homework/code_task/live, `mode` online/paper, `title`, `grade_level_id`, `blueprint` jsonb, `opens_at`, `closes_at`, `duration_seconds`, `shuffle`, `released_at`, `created_by`), `assessment_variants` (`assessment_id`, `label`), `assessment_items` (`variant_id`, `question_id`, `position`, `points`), `assessment_targets` (`assessment_id`, `group_id` or `student_id`).
- `submissions` (`assessment_id`, `variant_id`, `student_id`, `started_at`, **`server_deadline`**, `submitted_at`, `status`, `total_score`, `max_score`), `submission_items` (`submission_id`, `question_id`, `answer` jsonb, `score`, `max_score`, `graded_by` auto/ai/teacher, `ai_rationale`, `ai_evidence` jsonb, `confidence`, `approved_at`, `approved_by`). Unique `(assessment_id, student_id)` unless re-attempts are allowed by a flag.
- Paper/OMR: `omr_scans` (`assessment_id`, `variant_id`, `student_id`, `image_key`, `detected_answers` jsonb, `confidence`, `needs_review`, `resolved_by`).
- Code: `code_tasks` (`lesson_id`, `title`, `statement`, `language` python/javascript, `starter_code`, `time_limit_ms`, `memory_limit_mb`), `test_cases` (`task_id`, `stdin`, `expected_stdout`, `hidden`, `points`), `code_attempts` (`task_id`, `student_id`, `language`, `source`, `result` jsonb, `ast_fingerprint`, `created_at`), `similarity_flags` (`task_id`, `attempt_a`, `attempt_b`, `score`, `reviewed`), RLS: students read only their own attempts and **visible** tests; hidden tests are teacher/server only.
- Live quiz: `live_rooms` (`assessment_id`, `code` 6 digits, `status`, `current_item`, `item_started_at`), `live_answers` (`room_id`, `student_id`, `question_id`, `answer`, `answered_at`, `points`). Use **Supabase Realtime** (free tier) broadcast/presence for pushing the current question to students and answer counts to the teacher; the answer itself is written through a server action/RPC that checks the room, the item window and the student's group. Never broadcast the correct answer before the reveal event.
- Audit triggers for grade changes (`submission_items.score`, `submissions.total_score`, `released_at`).

### 4.2 Features
1. **Question bank** (`/t/questions`): list/filter (grade, unit, lesson, style, type, difficulty, status, language), create/edit with live preview, topic tagging, bilingual stems, image upload (same signed-upload pattern), approve/reject. **Import and export the teachers' existing Excel quiz format exactly**: columns `Question Text | Question Type | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 | Correct Answer | Time in seconds | Image Link | Answer explanation`; types `Multiple Choice` (Correct Answer = 1-based option number), `Checkbox` (comma-separated 1-based numbers, e.g. `1,3,5`), `Fill-in-the-Blank` (the expected text, matched case-insensitively with whitespace/diacritics/Arabic-Indic-digit normalisation and optional alternates separated by `|`). Import previews with row-level errors like the student importer; the user picks lesson and style per file or per row. Reuse `exceljs`.
2. **Assessments**: builder for quiz, exam, homework; pick questions manually or by **blueprint** (topics × difficulty counts) with a "fill from approved bank" action; per-group or per-student targeting; open/close window; duration; shuffle questions and options; points. **Variants**: deterministic seeded shuffle plus equivalent-item swapping within the same topic and difficulty; each student gets a fixed variant (hash of student id) so refreshes don't change it.
3. **Online attempt** (`/s/assess/[id]`): server-side timer (`server_deadline`; the client clock is only a display); autosave every few seconds and on blur; submission rejected after the deadline plus a 5-second grace; one open attempt per student; resilient to reload and flaky mobile data (retry queue). Auto-grade MCQ/multi-select/true-false/fill-blank on submit in a SECURITY DEFINER function; open answers are left `ungraded` for M4. Results and explanations appear only after the teacher releases.
4. **Printable exams**: do **not** use pdf-lib for Arabic text (no shaping). Render a print-optimised HTML page (`@media print`, A4, Arabic/English fonts, QR + answer bubbles for OMR variants) that teachers print to PDF from the browser. Exam sheets for OMR are an SVG/HTML layout with four corner fiducial markers and a QR encoding `{assessmentId, variantId, studentId}`.
5. **Paper OMR** (`/t/assessments/[id]/scan`): camera capture in the browser; **lazy-load OpenCV.js (WASM) only on this route**; detect fiducials → perspective-correct → read QR → sample bubble fill ratios → answers with per-question confidence; low-confidence or ambiguous sheets go to a manual-review screen showing the cropped region; teacher confirms. Keep the scoring/detection core as **pure functions with unit tests on synthetic generated sheets** (render a sheet to a canvas/image with known fills, rotate/skew/noise it, assert detection). No LLM involved.
6. **Grade book** (`/t/gradebook`): per assessment and per student, per-topic breakdown, filters by group/grade, manual override of any score with an audit entry, release control, **Excel export** (`exceljs`; Arabic RTL sheet, English headers selectable). Parents and students see only released results.
7. **Live quiz** ("live class kit"): teacher starts a room from any approved quiz (uses each question's `time_seconds`); students join with a 6-digit code (or a link/QR) from their phone; teacher screen shows the question, a countdown and live answer counts; reveal shows the distribution and the correct answer; points favour correctness then speed; final summary saved as a `live` assessment with `submissions` so it feeds mastery. Must work with ≤ 30 concurrent students on free-tier Realtime; degrade to short polling if Realtime is unavailable.
8. **Code playground and programming tasks** (`/s/code/[task]`, `/s/playground`):
   - Editor: **CodeMirror 6** (not Monaco; mobile-friendly and small), lazy-loaded, Python and JavaScript modes, RTL page with an LTR editor surface, consistent with the app (not a dark IDE takeover). Starter code, run, reset, saved attempts (autosave).
   - Python in a **Web Worker running Pyodide** (lazy, cached by the service worker later); JavaScript in a **sandboxed iframe** (`sandbox="allow-scripts"` without `allow-same-origin`, no network, `postMessage`, kill on timeout). Visible tests run client-side for practice.
   - **Server-side grading of hidden tests** (no Judge0 on free tier): a route handler on the Node runtime running Pyodide (Python) or `quickjs-emscripten` (JavaScript) inside a worker thread with `resourceLimits`, wall-clock timeout, output cap, no filesystem/network exposure; the interface is `lib/judge/runner.ts` so Judge0 can replace it later. Document cold-start cost and set `maxDuration` appropriately. Never run student code in the main server thread.
   - **"Variable boxes" visualiser** (instead of an IDE-like debugger): for Python, trace with `sys.settrace` inside Pyodide and render each step as labelled boxes (name → value) with the current line highlighted, step forward/back. This is the signature "programming object" UI.
   - **Copy detection**: AST-normalised fingerprints (Python via the `ast` module in Pyodide; JavaScript via `acorn`): strip comments, rename identifiers canonically, hash n-gram shingles, compare within a group by Jaccard similarity; flag ≥ 0.8 for **teacher review only; never auto-penalise**.
9. **Simulation/mastery hooks** are added in M4/M6; in M3 just record completion events table `simulation_events (student_id, lesson_id, sim_key, kind, score, created_at)` with RLS.

### 4.3 M3 acceptance
- Teacher imports an existing Excel quiz, builds a 10-question quiz with two variants, targets a group, a test student takes it online on a 360 px RTL viewport with a ticking server timer, the teacher grades/overrides, releases results, the student sees answers only after release, the parent sees the score.
- A paper exam is printed, a synthetic scan is graded by the OMR core with confidence reporting, low-confidence rows reach manual review.
- A live quiz runs end to end with two simulated students.
- A Python task passes visible tests in the browser and hidden tests on the server; an infinite loop and a memory bomb are killed safely; two near-identical attempts are flagged.
- RLS tests prove: no student can read answers/rubrics/hidden tests early; no student can read another student's submission/attempt; parents see only released results of their own children.
- E2E (Playwright, both viewports): import students → send codes → student login → open lesson → attempt quiz → teacher grades → parent sees result; plus the self-registration approval flow.
- Screenshots of the new screens at 360/1280 in both themes.

---

## 5. M4: AI layer

### 5.1 `lib/ai/` (the only code that talks to Anthropic)
Files: `client.ts` (SDK client, `import "server-only"`), `models.ts` (reads `AI_MODEL_FAST` default `claude-haiku-5-5`, `AI_MODEL_SMART` default `claude-sonnet-5-5`; **no model ID anywhere else**), `run.ts` (`runFeature(feature, input)`: build prompt → call → validate → log), `guard.ts` (document wrapping + moderation), `cost.ts` (price table per model, computes `cost_usd` from `usage` incl. cache read/write tokens), `cache.ts` (prompt-caching breakpoints), `features/<name>/{prompt.ts,schema.ts,golden/*.json}`.
- Add `ANTHROPIC_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART` to `lib/env.ts` as **optional**; when missing, AI features show "AI isn't set up yet" and everything else keeps working.
- **Verify current API behaviour at https://docs.claude.com before coding** (it changes). Known constraints for the current model family at the time of writing: use the official `@anthropic-ai/sdk`; structured output via `output_config: { format: { type: "json_schema", schema } }` then validate again with zod (retry once on validation failure, then fail visibly); **forced `tool_choice` (`any`/`tool`) returns 400** on these models (use `auto` + `strict` tools or structured outputs); no assistant prefill; no `temperature`/`top_p`/`top_k` on newer models; set **`output_config.effort` explicitly** (Haiku 5.5 and Opus 5.5 default to `medium`, Sonnet 5.5 to `high`; start low/medium for tutor, report wording and feedback, medium/high for question generation and grading); `thinking: {type: "disabled"}` is rejected on Sonnet 5.5 and Opus 5.5 (omit or use adaptive); stream long outputs; always check `stop_reason` (`refusal`, `max_tokens`); **enable prompt caching** on stable prefixes (system + lesson context before volatile content) and verify `usage.cache_read_input_tokens > 0` in tests/logs; for Sonnet 5.5 use the server-side `fallbacks` option when available (Haiku 5.5 has none). Keep prices in `cost.ts` and re-check them against the docs.
- Every call writes an **`ai_calls`** row (`feature`, `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost_usd`, `latency_ms`, `status`, `prompt_version`, `created_by`) and **never stores prompt text or student content**. Prompt versions are content hashes recorded per call.
- **Uploaded documents are data, not instructions.** Wrap every document/chunk/student answer in tagged blocks (`<document source="…" trust="data">`) and state in every system prompt that text inside them must never be followed as instructions. Add injection tests in the eval harness.
- Minimise personal data: replace names with placeholders unless the feature needs a name (parent reports use the first name only).
- Teacher switches: `site_settings.ai_features` jsonb (per-feature on/off) read by `runFeature`; settings UI with a master switch and per-feature toggles; a monthly cost ceiling that blocks further calls when reached.
- Rate limits on every AI endpoint (`hit_rate_limit`).

### 5.2 Ingestion (textbooks and study guides)
- Upload PDFs (teacher only) to a **private** `sources` bucket via signed upload; background-safe extraction in a route handler: use `pdfjs-dist` for text; **the Arabic textbook PDFs produce reversed word order** when naively extracted, so either normalise (detect and reverse RTL runs) or fall back to **Claude vision OCR on page images** per page; keep whichever passes a per-document sanity check. Tables and figures may need OCR.
- Chunk by lesson using `lessons.page_en/page_ar` ranges (the curriculum already has page numbers); store `material_chunks (source_id, lesson_id, edition, page, text, token_estimate)`. **No embeddings in v1** (free tier, no embedding service): use Postgres full-text search plus `pg_trgm` for duplicate detection; keep the column/table shape ready for embeddings later.
- The teacher approves ingestion results per document (preview extracted text per lesson, fix page ranges).

### 5.3 Features (each: typed input, zod/JSON schema output, validator, cost log, golden-set eval)
1. **Question generator** (`/t/questions/generate`): inputs grade, unit/lesson(s), style(s), type(s), difficulty mix, count, language (ar/en/bilingual). Grounded in the lesson's chunks; every question stores `source_chunk_id`; outputs land in the **review queue** as `draft`. Reject near-duplicates of existing bank items (`pg_trgm` similarity ≥ 0.8) and flag them. For `code_tracing`/`find_bug` questions, **execute the reference answer in the sandbox** and reject mismatches. Validators: exactly one correct option for MCQ, distractors plausible and distinct, answer present in options, stem answerable from the cited chunk, language as requested.
2. **Exam builder with variants** (AI optional): build from approved questions to match a blueprint; the AI only suggests fills for gaps, which land in the review queue.
3. **Short-answer grading**: rubric-based; output `{score, max, evidence: [verbatim quotes from the student's answer], confidence}`; a validator rejects evidence that is not a substring of the answer; below the confidence threshold the item goes to the teacher queue; the teacher **approves the batch before grades are released**; the AI never writes `approved_at`.
4. **Programming feedback**: correctness comes only from sandbox test results. For the **first failing test**, explain in simple Egyptian Arabic with English terms and give a hint; **never the full solution** (validator rejects replies containing the reference solution or code blocks beyond a few lines).
5. **Mastery (Bayesian Knowledge Tracing)** per student per topic: pure function `bktUpdate(state, correct, params)` with documented defaults (init 0.2, learn 0.15, slip 0.1, guess depends on question type), updated for every graded `submission_item`; `mastery (student_id, topic_id, p_known, attempts, updated_at)` with RLS (student/parent read own, teacher all); wire `LessonCode`'s fill to the mean `p_known` of the lesson's topics (student portal and parent summary). Item analysis: difficulty (p-value) and discrimination (point-biserial) per question once n ≥ 10; flag questions with discrimination < 0.1 or p < 0.1 / > 0.95 to the teacher. Unit tests with hand-computed cases.
4b. **Adaptive homework**: for each student pick approved items within the teacher's count and deadline: ~60% from the weakest topics (lowest `p_known`), ~25% spaced review (topics not seen for the longest, forgetting curve), ~15% stretch (just above current difficulty), never repeating items already answered, deterministic given a seed; creates a per-student homework assessment target. Pure function with unit tests.
5. **Parent weekly reports**: assemble a **facts JSON** (attendance counts, results, mastery changes, teacher notes) from the database; the model only verbalises it in warm Egyptian Arabic in a **fixed shape: one strength, one area to improve, one concrete action at home**, using the child's gender. A deterministic **number checker** extracts every number (Western and Arabic-Indic digits, percentages, fractions, "3 of 5") from the text and blocks the report on any value not present in the facts. The teacher previews the first batch; then may switch to "approve all". Delivery = `wa.me` deep links via the existing `messages` outbox (`template = 'weekly_report'`), one tap per parent with the existing "next family" flow. Weekly drafting runs from the daily cron gated by weekday.
6. **Review queue** (`/t/review`): single inbox for every AI draft (questions, grading batches, feedback, reports) with approve / edit / reject, keyboard shortcuts (`j`/`k` move, `a` approve, `e` edit, `r` reject, `?` help), bulk approve for high-confidence items, and a log of who approved what (either partner).
7. **Cost visibility** starts here: `/t/costs` can wait for M5 but `ai_calls` logging must exist from the first AI call.

### 5.4 AI evaluation harness (CI)
`evals/` with a runner (`npm run eval`), golden sets under each feature, results saved per prompt hash in `evals/results/<feature>/<hash>.json`. Gates: question generation (schema validity 100%, single correct answer, grounded in the cited chunk), short-answer grading (agreement with teacher-supplied grades above a stated threshold), parent-report factuality (**zero** number mismatches), tutor refusal of open-homework answers (M5), prompt-injection resistance (documents containing "ignore previous instructions"). A GitHub Actions workflow runs it **only when `lib/ai/**` or `evals/**` change**, using a repository secret for the key and a hard cost cap; fixtures contain no real student data and no textbook text beyond short synthetic passages.

### 5.5 M4 acceptance
Eval harness passes; first parent reports can be generated and sent (with a real preview) after review; AI features all respect the on/off switches and cost ceiling; RLS tests for every new table; unit tests for BKT, adaptive selection, the number checker and the validators; E2E for the review queue.

---

## 6. M5: Tutor and insight

1. **Student tutor** (`/s/lessons/[lesson]` panel; label it clearly "AI", and name it from `site_settings`, not hard-coded teacher names, e.g. «اسأل المساعد»). Per-lesson context = the lesson's approved materials (notes, extracted PDFs) **plus the textbook pages for that lesson**, placed in the cached prefix; replies in the student's language and edition; **Socratic by default** (hints and guiding questions); cites the page or material; **refuses full answers to any currently open homework/exam/quiz item** (detect by similarity of the student's message to open items' stems via `pg_trgm` and by a classifier pass; refuse politely and offer a hint instead); **moderation pass on input and output** (Haiku) for minors' safety, self-harm, sexual content, personal data requests; daily message cap per student (table + `hit_rate_limit`); **requires the `ai_tutor` consent** (`consents.kind = 'ai_tutor'`; add the parent-portal consent step and block until given); stores `tutor_threads`/`tutor_messages` (student-readable own, teacher-readable anonymised top questions per lesson via a view that strips identity; parents cannot read threads). Eval: refusal of open-homework answers must be 100% on the golden set.
2. **At-risk prediction** (`/t/insights`, teacher-only RLS; never shown to students or parents): weekly job over attendance streaks, score trend, homework completion, inactivity; start with a transparent weighted score or logistic model with **stored top reasons per student** (e.g. "missed 2 of last 3 sessions"), thresholds configurable, unit-tested; feeds the dashboard "needs attention" list.
3. **Teacher copilot** (`/t/copilot`): natural-language questions answered by choosing from an **allow-listed registry of parameterised read-only queries** (≈10–15, e.g. students by missed sessions and mastery threshold, assessment results by group, unsent codes, ungraded items); the model returns `{queryName, params}` via structured output; the server validates against zod, runs the named query with the teacher's RLS context, renders a table; **the model never writes or executes raw SQL**; log every question and query name; eval that malicious prompts cannot reach non-allow-listed queries.
4. **Cost dashboard** (`/t/costs`): AI cost per feature, per month, per active student, vs. the ceiling.
5. (Removed from scope: lesson recorder/speech-to-text.)

M5 acceptance: tutor refuses open-homework answers in tests and in the eval; copilot only runs allow-listed queries; at-risk reasons are explainable; RLS proves students/parents cannot read at-risk, copilot logs or other students' threads; E2E for tutor refusal and copilot.

---

## 7. M6: Simulations, PWA, polish

**7.1 Simulation framework.** `lib/simulations/registry.ts`: a typed registry `{ key, lessonCodes, grade, domain, titles(ar,en), load: () => import(...) }`; each simulation is a lazy-loaded, self-contained, **offline-capable** client component with a consistent frame (title, instructions, reset, "mark complete"), keyboard operable, reduced-motion aware, works at 360 px, bilingual copy in `messages/*`. Completion (and a score where meaningful) is written to `simulation_events` and can feed mastery. Mount them in the lesson page. **Before building, list the planned simulation per lesson (below, refined by reading the textbook text) and get the owners' approval at a mini-checkpoint.**

Proposed set (refine against the books; the owners said "build what the chapters contain"):
- Grade 11 U1: 1-1 timeline of IT eras + Moore's-law chart; 1-2 tiny classifier/perceptron playground; 1-3 AI-in-industry matching; 1-4 branching ethics scenarios.
- U2 Cybersecurity: 2-1 **Caesar and Vigenère encoder/decoder, hashing avalanche demo (Web Crypto SHA-256), password-strength and brute-force-time estimator, symmetric vs public-key exchange walkthrough (toy RSA)**; 2-2 **drag-and-drop network with zones (DMZ/internal/guest) and firewall rules tested against simulated traffic**; 2-3 **branching tabletop incident scenario + likelihood × impact risk matrix**.
- U3 Web: 3-1 client → server → database flow stepper; 3-2 **request/response inspector** (method, URL, headers, status codes); 3-3 HTML/CSS/JS live preview in a sandboxed iframe.
- U4 Web and media design: 4-1 image format/compression trade-off explorer; 4-2 layout grid builder; 4-3 **WCAG colour-contrast checker**; 4-4 A/B iteration exercise. Unit pages openly show their own grid and colour tokens.
- U5 Data: 5-1 sampling-bias demo; 5-2 data-cleaning exercise (the dirty-table object, interactive); 5-3 mock API explorer.
- U6 Analysis: 6-1 confidence interval/sample-size demo; 6-2 drag-to-fit regression line with least-squares overlay; 6-3 chart chooser.
- U7 ML/AI: 7-1 train/test split and overfitting; 7-2 neural-net forward pass; 7-3 tokenisation and next-token probability demo (mock data, no API calls).
- Grade 10: ch 3 reuse the security sims; ch 6 binary/hex converters, character-encoding explorer, sound sampling, image pixels/bit depth, compression; ch 7 logic-circuit builder; ch 8 IP/subnet and DNS/protocol handshake steppers; ch 9 mini table/query explorer; ch 10 data-analysis charts; ch 11 queue simulation; ch 12 Python tasks (use the playground); ch 13 HTML/CSS/JS mini-projects (sandboxed preview).

**7.2 One orchestrated motion moment per unit**, triggered by the student's action: society = a new link draws when a lesson completes; cipher = decrypt reveal (exists on the unit page; extend to "keys earned"); protocol = the `GET /lessons/3-2 → 200 OK` status line as loading/transition language; swatch = grid overlay toggle; data = cleaned cells settle; signal = regression line refits; neuron = forward-pass pulse. All disabled under `prefers-reduced-motion`.

**7.3 PWA/offline.** Installable (manifest, icons, theme colours), service worker via `serwist` (check it phones nothing home): cache the app shell, already-opened lesson pages, downloaded materials (opt-in "save for offline"), simulation chunks and the Pyodide bundle on first use. **Offline attendance queue** for the teacher's phone: queue taps in IndexedDB with `offline_client_id`, sync when online, conflict rule = latest tap wins, visible "N pending" indicator. Never cache authenticated API JSON for other users; clear caches on sign-out.

**7.4 Performance.** Lighthouse mobile **≥ 90 performance and accessibility** on the landing page and on the student lesson page. The landing page's particle canvas, orbit and showcase must not blow the budget: measure LCP/INP/CLS; defer `ParticleField` until idle, cap its work on low-end devices, ship no layout shift, inline critical CSS; keep route JS small and verify with `next build` output and a bundle report. Document the numbers.

**7.5 Accessibility pass.** axe-core in Playwright on every main screen in both themes and both locales; fix violations; check focus order, labels, contrast tokens, target sizes ≥ 44–48 px, RTL arrows/chevrons, bidi of mixed Arabic/English strings, screen-reader labels on unit objects and lesson codes.

**7.6 Theming polish.** Apply every unit theme fully (object, colour, motif) across the student map, lesson pages and unit pages; ensure the student map shows mastery fill; both themes designed, not inverted.

M6 acceptance: simulations for every known lesson (or an owner-approved reduced list) with completion events; screenshots at 360/1280 in both themes reviewed; Lighthouse numbers recorded; offline demo (open lesson, go offline, reopen; queued attendance syncs).

---

## 8. M7: Launch

1. **Privacy/data rights:** teacher-initiated **export** (JSON + Excel of one student/family) and **deletion** flows with `data_requests` (`export`/`delete`, subject, status, `purge_after = +30 days`); soft delete (`deleted_at`) then permanent purge by the daily cron after 30 days; consent withdrawal UI (teacher records it, `consents.withdrawn_at`); audit entries for exports and deletions; update `PRIVACY.md` and `/privacy`.
2. **Backups:** GitHub Actions weekly `pg_dump` of the Supabase database (connection string in a repository secret), **encrypted** (age or GPG) and stored as a private artifact/branch with 8-week retention; a documented, tested **restore** procedure in `DEPLOY.md`.
3. **Keep-alive and monitoring:** daily cron prevents Supabase free-tier pausing; `/api/health` (no secrets) for uptime checks; structured server logs for auth failures/AI errors/job runs; a teacher-facing "system status" card (last cron run, last backup, AI cost this month). No third-party analytics or error trackers that receive user data.
4. **Production deploy:** merge `m1-foundation` into `main` via pull request after the owners approve; production env vars on Vercel; custom domain (optional) with Supabase redirect/Site URL updated; Google OAuth consent screen published or test users configured; `TEACHER_EMAILS` includes both partners. Final `DEPLOY.md` walkthrough covering every step from a clean account.
5. **Hardening review:** re-run all RLS tests, add a "no table without RLS" test (exists; keep it), review every `createAdminClient()` usage, rate limits on all public endpoints, security headers (already set in `next.config.ts`; add a CSP that permits only required origins, including Supabase and the Pyodide CDN if used, then test), dependency audit (`npm audit --omit=dev` clean).
6. **Handover docs:** final `README.md`, `DEPLOY.md`, `PRIVACY.md`, `docs/HANDOFF.md` update, an operator's guide in Arabic and English for the two teachers (weekly routine: attendance, grading, review queue, parent reports).

M7 acceptance: live on the owners' domain with real students; a restore from backup rehearsed; an export and a deletion rehearsed; final screenshots and Lighthouse report attached.

---

## 9. Data, security and privacy checklist (apply to every slice)

- New table → RLS enabled + forced, teacher policy, minimal student/parent policies, tests; `updated_at` trigger; audit trigger if it holds grades, consent, codes, exports or deletions.
- Anything a student could read must be proven not to leak answers, rubrics, hidden tests, other students' data, AI scores before approval, risk scores, or tutor threads of others.
- Server inputs validated with zod; file uploads limited by type/size and stored under random keys; signed URLs short-lived; no user-controlled paths.
- Logs never contain codes, keys, student answers or AI prompts.
- WhatsApp: only `wa.me` links in v1; outbox rows never contain access codes; keep `messages` ready for a Business-API provider (channel `whatsapp_api`).
- Egypt's Personal Data Protection Law: consent text names what is stored, where (EU/US) and why; data minimisation; deletion within 30 days on request.

---

## 10. Definition of done (per milestone)

1. All slices committed; `npm run check` and `npx next build` green.
2. New migrations numbered and documented; `lib/db/types.ts` and `DEPLOY.md` updated.
3. RLS/function tests for every new table and policy; unit tests for every pure algorithm; Playwright E2E for the milestone's flows in the `desktop-en` and `mobile-ar-rtl` projects; AI evals green where relevant.
4. ar/en strings complete (parity test passes); no hard-coded names or curriculum titles.
5. Screenshots at 360 px and 1280 px in light and dark attached to the checkpoint report; self-critique against `docs/M0-PLAN.md` §5 (visual structure carries information; one bold thing per screen; no template look; no code-editor look).
6. Checkpoint report posted: built / verified / not verified / owner steps / risks. **Then stop and wait.**

---

## 11. Things you must not do

- Do not push to `main`, force-push, rewrite history, or change repository settings without the owners' explicit approval. Work on branches and open pull requests.
- Do not run migrations against any real project, read or write real student data, or call the Anthropic API with real student content outside the app's own server paths.
- Do not add analytics, session replay, chat widgets or any SaaS script to pages.
- Do not weaken RLS, loosen `SECURITY DEFINER` checks, widen grants, or add a service-role code path to avoid writing a policy.
- Do not reduce accessibility or the Arabic/RTL support for speed.
- Do not invent curriculum titles, teacher names, statistics, prices, or legal claims.
- Do not leave TODOs for security-relevant work; if you can't finish it, say so in the checkpoint report.

---

## 12. Order of work (recommended)

1. §3 prerequisites (topics, Playwright, cron plumbing, leftover gaps).
2. M3 in this order: question bank + Excel import/export → assessments/variants → online attempts + grading + grade book → printable exams + OMR → live quiz → code playground/tasks/visualiser/similarity. **Checkpoint.**
3. M4: `lib/ai` + `ai_calls` + switches → ingestion → question generator + review queue → mastery + adaptive homework → short-answer grading + code feedback → parent reports + number checker → eval harness in CI. **Checkpoint.**
4. M5: tutor (+ consent) → at-risk → copilot → cost dashboard. **Checkpoint.**
5. M6: simulation framework + approved list → motion moments → PWA/offline → performance and accessibility passes → theming polish. **Checkpoint.**
6. M7: data rights → backups → monitoring → production deploy and hardening → handover docs. **Final checkpoint.**
