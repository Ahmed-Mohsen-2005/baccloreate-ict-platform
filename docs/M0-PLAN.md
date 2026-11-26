# M0 Plan: Egyptian Baccalaureate ICT platform

Status: **all §9 questions answered (2026-11-26); waiting for final approval to start M1.** The free-tier revision in §1b supersedes the VPS parts of §1.

---

## 0. What I found in your folder (read before §9)

I read the contents pages of the textbooks in `Sec 1/` and `Sec 2/`, so most curriculum **ASK** items now only need you to confirm them, not type them.

### Grade 11: four units in the brief, seven in the books

Part One (Term 1, units 1–4). The English and Arabic editions have the same lessons; only the page numbers differ:

| Code | English | العربي | Page (EN / AR) |
| --- | --- | --- | --- |
| **1** | Information Technology and Society | تكنولوجيا المعلومات والمجتمع | |
| 1-1 | Development of Information Technology and Social Transformation | تطور تكنولوجيا المعلومات والتحول الاجتماعي | 4 / 4 |
| 1-2 | How AI Works | كيف يعمل الذكاء الاصطناعي | 12 / 12 |
| 1-3 | AI in Daily Life and Industry | الذكاء الاصطناعي في الحياة اليومية والصناعة | 19 / 18 |
| 1-4 | Ethical Issues with AI | القضايا الأخلاقية للذكاء الاصطناعي | 26 / 24 |
| **2** | Cybersecurity | الأمن السيبراني | |
| 2-1 | Cryptographic Technologies and Authentication | تقنيات التشفير والمصادقة | 33 / 31 |
| 2-2 | Network Security Design | تصميم أمن الشبكات | 41 / 38 |
| 2-3 | Incident Response and Risk Management | الاستجابة للحوادث وإدارة المخاطر | 48 / 44 |
| **3** | Web Applications | تطبيقات الويب | |
| 3-1 | The Overall Structure of Web Applications | البنية العامة لتطبيقات الويب | 55 / 50 |
| 3-2 | Web Application Communication Methods | طرق الاتصال في تطبيقات الويب | 62 / 56 |
| 3-3 | Fundamentals of Frontend Technology | أساسيات تكنولوجيا الواجهة الأمامية | 68 / 62 |
| **4** | Web and Media Design | تصميم الويب والوسائط | |
| 4-1 | Types and Characteristics of Media | أنواع الوسائط وخصائصها | 75 / 68 |
| 4-2 | Information Design and User Experience for Websites | تصميم المعلومات وتجربة المستخدم للمواقع | 81 / 74 |
| 4-3 | Methods for Evaluating Websites | أساليب تقييم المواقع الإلكترونية | 88 / 81 |
| 4-4 | The Iterative Improvement Process for Websites | عملية التحسين التكراري للمواقع | 95 / 87 |

Part Two (Term 2, units 5–7) is **not in the brief**:

| Code | English | العربي (to verify\*) |
| --- | --- | --- |
| **5** | Data Collection and Cleaning | جمع البيانات وتنقيتها |
| 5-1 | Methods of Data Collection | طرق جمع البيانات |
| 5-2 | Data Cleaning and Transformation | تنقية البيانات وتحويلها |
| 5-3 | Open Data and APIs | البيانات المفتوحة وواجهات برمجة التطبيقات |
| **6** | Analysis and Communication | التحليل والتواصل |
| 6-1 | Statistical Inference | الاستدلال الإحصائي |
| 6-2 | Use and Evaluation of Regression Analysis | استخدام تحليل الانحدار وتقييمه |
| 6-3 | Data Visualization and Communication | تمثيل البيانات المرئي والتواصل |
| **7** | Machine Learning and Artificial Intelligence | التعلم الآلي والذكاء الاصطناعي |
| 7-1 | The Basics of Machine Learning | أساسيات التعلم الآلي |
| 7-2 | Neural Networks and Deep Learning | الشبكات العصبية والتعلم العميق |
| 7-3 | Large Language Models (LLM) and Generative AI | نماذج اللغة الكبيرة والذكاء الاصطناعي التوليدي |

\* Text extraction from the Part Two Arabic PDF came out with reversed word order, so I rebuilt these titles. Please check the wording.

### Grade 10: all 13 chapters are in `Sec 1/ICT_EN__Sec1_Tr1.pdf`

1 What is Information? (1-1 Information and Media, 1-2 Information Ethics) · 2 Regulations and Rights in the Information Society (2-1…2-3) · 3 Information Security (3-1…3-5) · 4 Information Technology and Society (4-1) · 5 Communication (5-1…5-3) · 6 Information Design (6-1…6-10) · 7 Computers (7-1…7-3) · 8 Networks (8-1…8-5) · 9 Databases (9-1…9-3) · 10 Data Analysis (10-1…10-6) · 11 Simulations (11-1…11-4) · 12 Programming (Python) (12-1…12-5) · 13 AI Programming (13-1…13-12: generative AI, HTML/CSS/JS, a quiz app, a Block Breaker game).

The full lesson list goes into `supabase/seed/curriculum.sql`. Chapter 6 runs to 6-10, not 6-5. **Confirmed: Grade 10 is English only** (no Arabic edition).

### Your quiz spreadsheets already have an import format

`Chapter2_Cybersecurity_Quiz_v2_EN.xlsx` uses the columns `Question Text | Question Type | Option 1–5 | Correct Answer | Time in seconds | Image Link | Answer explanation`, with types *Multiple Choice*, *Checkbox* (multi-select) and *Fill-in-the-Blank*. I'll make the question bank **import and export exactly this format**, so your existing quizzes load on day one and you can still export to the quiz tool you use now. I'm adding `multi_select` and `fill_blank` to the question types.

---

## 1. Architecture

```
 Student / parent phone (PWA)            Teacher phone + laptop
        │  HTTPS                                 │
        ▼                                        ▼
 ┌──────────────────────── Vercel: Next.js App Router ────────────────────────┐
 │ RSC pages  ·  Server Actions  ·  Route handlers (/api/*)  ·  Vercel Cron    │
 │                                                                             │
 │  lib/auth      code login, Google (teacher allow-list), role guard          │
 │  lib/ai        the only place that talks to Anthropic (server-only)         │
 │  lib/import    CSV/XLSX parse → validate → preview → commit                 │
 │  lib/mastery   BKT + adaptive selection (pure TS, unit-tested)              │
 │  lib/messaging outbox → WhatsAppDeepLinkProvider (v1) | BusinessAPI (later) │
 └───────┬───────────────────────┬───────────────────────┬─────────────────────┘
         │ user JWT (RLS)        │ service role (server)  │ HTTPS, server only
         ▼                       ▼                        ▼
 ┌──────────── Supabase ───────────────┐      ┌─────────── Anthropic API ──────┐
 │ Postgres + RLS + pgvector           │      │ claude-haiku-5-5 (fast)        │
 │ Auth (Google, code-issued sessions) │      │ claude-sonnet-5-5 (smart)      │
 │ Storage (private buckets, signed)   │      └────────────────────────────────┘
 └─────────────────────────────────────┘
         ▲
         │ jobs (no student identity; code + tests only)
 ┌───────┴──────────── Small VPS (needs your OK, §9 Q7) ─────────────┐
 │ Judge0 CE (no network, CPU/mem/time limits)                       │
 │ Embedding worker (multilingual-e5-small, ONNX)                    │
 │ Optional: faster-whisper for the lesson recorder                  │
 └───────────────────────────────────────────────────────────────────┘
```

**In the browser:** Pyodide (Python), a sandboxed `<iframe sandbox="allow-scripts">` with no network for JavaScript, OpenCV.js for OMR (teacher scan screen only), and simulations. Everything heavy is lazy-loaded per route.

### Stack changes that need your approval

The brief says to explain any change and wait. Each item below is a concrete reason, not a preference.

1. **CodeMirror 6 instead of Monaco.** Monaco doesn't officially support mobile browsers: touch selection and the Android keyboard both break, and it ships about 2–3 MB of JS. CodeMirror 6 works on phones, is about 300 KB, and handles RTL pages and bidi properly. Everything else in §5.6 stays: Python and JS, starter code, visible and hidden tests, saved attempts, similarity check.
2. **Embeddings run on our own server, not through a third-party API.** Anthropic has no embeddings endpoint. Calling Voyage or OpenAI would send students' tutor questions to a third party, which breaks non-negotiable 3. I propose `multilingual-e5-small` (handles Arabic, about 120 MB, runs on CPU) on the VPS, writing into `pgvector`.
3. **The tutor reads the whole lesson instead of searching vector chunks.** A lesson is about 6–9 textbook pages plus your study guide, which fits easily in context. The tutor gets the lesson's full approved material with prompt caching on, so later messages read it from cache cheaply. It grounds better, it can always cite the page, and there's no retrieval to tune. Embeddings are still used where they're needed: near-duplicate question detection and cross-lesson search for the question generator.
4. **The lesson recorder needs a speech-to-text engine, which Claude doesn't provide.** Either self-host `faster-whisper` on the VPS (private, slower, weaker on Egyptian dialect), or use a hosted STT API (better quality, but class audio with students' voices goes to a third party). See §9 Q8.

Everything else follows the brief: Next.js, TS strict, Tailwind, Radix, Supabase, Anthropic via `lib/ai/`, Judge0, Vitest and Playwright, Vercel.

### 1b. Free-tier revision (supersedes the VPS parts of §1)

You chose free tier everywhere and no server (§9 Q7, Q10, Q14). This works at 15 students. Here is what changes and what it costs in capability:

| Brief / §1 | Free-tier replacement | Trade-off |
| --- | --- | --- |
| Judge0 on a VPS for graded code | **WASM sandboxes inside a Vercel function**: Pyodide for Python, QuickJS for JavaScript. No network, time limit, memory limit, hidden tests run on the server. | Slower cold start (a few seconds per grading run) and fewer languages than Judge0. Fine for Grade 10–11 Python/JS tasks. Judge0 can be added later behind the same interface. |
| `pgvector` + embedding worker | **No embeddings in v1.** Near-duplicate questions are caught with Postgres `pg_trgm` text similarity; the tutor already reads the whole lesson, so it needs no retrieval. | Duplicate detection catches near-identical wording, not paraphrases. The schema keeps a slot to add embeddings later. |
| Lesson recorder + speech-to-text | **Removed** (no recorded sessions). | None now. |
| Supabase Pro backups | Supabase Free has no backups, so a **weekly encrypted `pg_dump` runs through GitHub Actions** (free) into a private GitHub repo. | You need a free GitHub account (also needed for Vercel). The restore steps go in `DEPLOY.md`. |
| Supabase Free pauses after 7 idle days | A **daily Vercel cron** touches the database. | None. |
| Vercel Pro crons (any schedule) | Vercel Hobby allows **daily** crons only, so one daily job dispatches whatever is due (weekly reports, at-risk scores, releases, purges). | Scheduled material releases happen at the daily run, or at the moment a student opens the page (the release time is checked in SQL), so nobody sees anything early. |
| Custom domain | The free `*.vercel.app` address. | You can add a domain any time later. |

**Limits to watch** (all far above 15 students' needs): Supabase Free has a 500 MB database, 1 GB file storage (the four textbook PDFs take about 100 MB, your materials about 100 MB) and 5 GB download traffic a month.

**Two things to know:**

- **Vercel Hobby is officially for non-commercial use.** Paid private tutoring may count as commercial under Vercel's terms. It works technically; whether to accept that is your call, and moving to Pro later is a settings change, not a rebuild.
- **The Claude API has no free tier.** It's the only thing with a cost: pay-as-you-go from a small prepaid credit. At 15 students on Haiku 5.5 with prompt caching, I expect a few US dollars a month at most. The cost dashboard (M5) will show the real figure, and every AI feature can be switched off in settings.

---

## 2. Data model (refined)

Every table has `id uuid pk`, `created_at`, `updated_at` (trigger), and RLS enabled. Soft delete uses `deleted_at`. Each change from the brief has a reason in *italics*.

### Identity and people

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | `user_id → auth.users`, `role` (teacher/student/parent), `locale`, `theme` | one row per auth user |
| `students` | `profile_id?`, `external_id` **unique** (your studentID), `display_name`, `grade_level_id`, `group_id?`, `edition` (ar/en), `venue` (online/offline), `gender` (m/f, for gendered Arabic copy only), `phone?`, `google_email?`, `status` (active/pending/archived), `deleted_at` | no national ID, address or birth date |
| `parents` | `profile_id?`, `display_name?`, `phone_e164` **unique**, `email?` | one phone links every child (siblings) |
| `guardianships` | `parent_id`, `student_id`, `relation` | |
| `consents` | `student_id`, `parent_id?`, `kind` (guardian_data, ai_tutor), `policy_version`, `given_at`, `method` (import_attested / signup_checkbox / parent_portal), `withdrawn_at?` | *a table, not one column: keeps the version and history, and lets consent be withdrawn* |
| `access_codes` | `subject_type` (student/parent), `subject_id`, `code_hmac`, `issued_at`, `revoked_at?`, `last_used_at?` | *HMAC-SHA256 with a server pepper lets us look a student up by code alone without storing the code. Regenerating revokes the old row.* |
| `join_requests` | name, grade, edition, phones, parent name, `consent_given_at`, `status`, `decided_at`, `group_id?` | |
| `site_settings` | singleton: teacher display name, title, bio, photo key, years, socials, WhatsApp number, feature flags per AI feature | *no hard-coded name* |
| `teacher_allowlist` | `email` | merged with `TEACHER_EMAILS` env |

### Curriculum (bilingual)

`grade_levels` (*renamed from `grades` so it can't be confused with scores*; `editions` text[]: Grade 11 = {ar, en}, Grade 10 = {en}) → `units` (`code`, `title_ar?`, `title_en`, `term`, `domain`, `position`) → `lessons` (`code` like "2-1", titles, `page_en`, `page_ar`, `position`) → `topics` (titles, `position`). The `domain` column drives the visual theme (§5).

### Teaching

`groups` (name, grade_level, edition, `schedule_rrule`, timezone Africa/Cairo) · `class_sessions` (*renamed from `sessions` to avoid a clash with auth sessions*: group, starts_at, lesson_id?, status) · `attendance` (session, student, status present/late/absent, method tap/qr/override, marked_by, offline_client_id) · `attendance_qr_tokens` (session, rotating nonce, expires_at) · `materials` (storage_key, kind pdf/image/video_link/link/note, edition, lesson_id, topic_ids[], `release_at`, watermark bool) · `material_visibility` (material, group) · `announcements` (audience: group / grade / all_students / all_parents, body, publish_at).

### Content and AI

`question_styles` (key, label_ar, label_en, source: g11_book / g11_book_2026 / g10_book / house, grade_levels[], kind: question / content_block, position) · `material_chunks` (material, lesson, text, page, `embedding vector(384)`) · `questions` (style_id → `question_styles`, type: mcq / multi_select / true_false / fill_blank / short_answer / explain_why / code_tracing / find_bug, stem, options jsonb, answer jsonb, rubric jsonb, explanation, difficulty, topic_ids[], lesson_id, language, `time_seconds`, `image_key?`, `source_chunk_id?`, `status` draft/approved/rejected, `origin` ai/teacher/import, `embedding`) · `ai_drafts` (*the review queue*: feature, payload jsonb, target table/id, status, reviewer notes, prompt_version) · `prompt_versions` (feature, version, hash) · `eval_runs`.

### Assessment

`assessments` (kind quiz/exam/homework/code_task, mode online/paper, blueprint jsonb, opens_at, closes_at, duration_s, `released_at`) · `assessment_variants` · `assessment_items` (variant, question, position, points) · `assessment_targets` (assessment, group, or an individual student for adaptive homework) · `submissions` (assessment, variant, student, started_at, submitted_at, `server_deadline`, total score, status) · `submission_items` (*per question; needed for item analysis and per-topic mastery*: answer, score, graded_by auto/ai/teacher, ai_rationale, ai_evidence, confidence, `approved_at`) · `omr_scans` (image key, detected answers, confidence, needs_review) · `code_tasks`, `test_cases` (hidden bool), `code_attempts` (source, language, result, ast_fingerprint) · `similarity_flags`.

### Progress and insight

`mastery` (student, topic, p_known, attempts, updated_at) · `item_stats` (question, p_value, discrimination, flagged) · `simulation_events` (student, lesson, sim_id, kind completed/score, score?) · `risk_scores` (student, week, score, reasons jsonb; **RLS: teacher only**).

### Messaging, tutor, ops

`messages` (outbox: channel whatsapp_link/whatsapp_api, audience, recipient_parent_id, template, payload, status draft/approved/opened/sent, `provider_ref`) · `parent_reports` (student, week, facts jsonb, text, checker_result, status) · `tutor_threads`, `tutor_messages` (with moderation flags; daily cap enforced in SQL) · `ai_calls` (feature, model, input/output/cache tokens, cost_usd, latency_ms, status, prompt_version; **no prompt text stored**) · `audit_log` (actor, action, entity, before, after) · `rate_limits` (key, window, count) · `data_requests` (export/delete, subject, status, `purge_after` = +30 days).

### RLS model

- SQL helpers: `app.role()`, `app.my_student_ids()` (a student gets their own id; a parent gets their children through `guardianships`), `app.is_teacher()`.
- **Teacher:** full access to everything.
- **Student:** reads their own rows. Curriculum is readable by everyone signed in. Materials and assessments are readable only if they're targeted at the student's group and `release_at <= now()`. Writes are limited to their own submission and attempt rows, and only while the assessment is open (the deadline is checked in SQL).
- **Parent:** reads only `app.my_student_ids()` data through narrow views: attendance, released results, mastery summary, announcements. Parents can't see answers, tutor threads or risk scores.
- **Tests:** `tests/rls/*.test.ts` sign in as student A, student B, parent of A, and an unrelated parent, then assert that every cross read and write returns 0 rows or is rejected. They run in CI against local Supabase.

---

## 3. Auth and onboarding flows

- **Teacher:** Supabase Google OAuth. The `/auth/callback` handler rejects any email not in `TEACHER_EMAILS` or `teacher_allowlist` and signs that user out straight away.
- **Code login:** `POST /api/auth/code` normalises the code (uppercase, ambiguous characters removed), looks it up by HMAC, and rate-limits per IP and per code prefix (5 tries per 10 min, then a growing lockout). On success the server creates a Supabase session for that student or parent's auth user (internal synthetic email, never shown) by minting a one-time magic-link token and verifying it server-side. The cookie is set and no token reaches the URL. Alphabet: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 characters, so 6 characters gives about 887 million combinations).
- **Link Google later:** Supabase manual identity linking from the settings page. Google is only for convenience and never replaces the code.
- **Bulk import** (columns in §9 "Importer"): upload → parse (CSV/XLSX) → normalise phones to E.164 Egypt (`01xxxxxxxxx` → `+201xxxxxxxxx`) → validate (bad phone, bad email, missing or repeated studentID, unknown grade or venue) → assign groups and the edition → preview table with row-level errors and a "fix and re-upload" note → commit in one transaction → generate codes. Consent rows are recorded as `import_attested` with the teacher's attestation and a timestamp, and the parent confirms in the portal at first login (§9 Q5).
- **Send codes:** a per-parent list with a "Send" button that opens `wa.me/<+20…>?text=<Arabic template with the student and parent codes and the login link>`, then marks the outbox row as opened. A "next parent" flow lets you go through the whole list with one tap each.
- **Self-registration:** `/join` form → `join_requests` (consent checkbox required, timestamp stored) → you approve and assign a group → codes are generated → the same send-codes flow.

---

## 4. Route map

Locale: Arabic at `/`, English under `/en/…` (`next-intl`, prefix only when needed). Every authenticated area is guarded by middleware and RLS.

**Public:** `/` landing · `/grades/[grade]` curriculum overview · `/login` (student / parent / teacher tabs) · `/join` · `/privacy`

**Student (`/s`):** `/s` home · `/s/map` curriculum map · `/s/lessons/[lesson]` (e.g. `g11-2-1`): materials, simulation, practice, homework, tutor · `/s/lessons/[lesson]/sim` · `/s/assess/[id]` attempt · `/s/assess/[id]/result` · `/s/code/[task]` · `/s/playground` · `/s/progress` · `/s/settings` (edition, language, theme, link Google)

**Parent (`/p`):** `/p` (goes straight to the child if there's only one) · `/p/[student]`

**Teacher (`/t`):** `/t` dashboard · `/t/groups[/id]` · `/t/students[/id]` · `/t/students/import` · `/t/join-requests` · `/t/parents` · `/t/attendance[/session]` (+ `/t/attendance/[session]/qr` projector view) · `/t/curriculum` · `/t/materials` · `/t/questions` (bank, import/export) · `/t/assessments[/id]` (builder, variants, print, `/scan` OMR) · `/t/gradebook` · `/t/code-tasks` · `/t/announcements` · `/t/review` (AI queue, keyboard shortcuts) · `/t/reports` (parent reports) · `/t/recorder` · `/t/insights` (at-risk) · `/t/copilot` · `/t/costs` · `/t/settings`

**API (route handlers, server-only):** `/api/auth/code` · `/auth/callback` · `/api/import/{preview,commit}` · `/api/attendance/checkin` · `/api/materials/[id]/url` (signed, expiring, optional watermark) · `/api/ai/{generate-questions, grade-short, code-feedback, tutor, parent-report, summarise, copilot}` · `/api/judge/{submit,callback}` · `/api/cron/{release, weekly-reports, at-risk, purge}` (Vercel Cron, secret header)

---

## 5. Design plan: "the curriculum is the interface"

### Concept

Two surfaces every Egyptian student knows: **the notebook page** (light theme) and **the classroom blackboard** (dark theme). Dark mode is designed as the board, not an inverted page: chalk-white text on deep green-slate, with accents in coloured-chalk tones. On both surfaces, each unit's colour comes from its **domain**: what the unit teaches. Domains are shared across grades, so Grade 10 chapters reuse the same visual worlds (and simulations) as the Grade 11 units they lead into.

### Palette (all accents pass WCAG AA as text; ratios measured)

| Token | Light (notebook) | Dark (blackboard) |
| --- | --- | --- |
| `--paper` page base | Chalk paper `#F3F5F6` | Board `#15231F` |
| `--surface` sheets | Sheet `#FFFFFF` | Board raised `#1C2D28` |
| `--ink` text | Board ink `#15212B` (14.9:1) | Chalk `#E9EFEB` (13.9:1) |
| `--pencil` secondary text | Pencil `#52606B` (5.9:1) | Chalk dust `#A9B8B1` (7.9:1) |
| `--ruling` lines and dividers | Ruling `#D3DAE0` | Chalk line `#2F443D` |
| `--margin` exam trap, errors | Margin red `#B92828` | Red chalk `#F48A86` |

Domain accents (light / dark), one per unit world. Text contrast: 5.6–7.6:1 on light surfaces, 6.7–9.9:1 on dark ones.

| Domain | Used by | Light | Dark |
| --- | --- | --- | --- |
| `society` (Network teal) | G11 U1; G10 ch 1, 2, 4, 5 | `#0D6E6A` | `#6CD0C6` |
| `cipher` (Key violet) | G11 U2; G10 ch 3 | `#5B3DBF` | `#B6A6F8` |
| `protocol` (Status blue) | G11 U3; G10 ch 8, 9 | `#1C5AB2` | `#8FB6F6` |
| `swatch` (Swatch rose) | G11 U4; G10 ch 6, 7 | `#A8224E` | `#F593B0` |
| `data` (Sample olive) | G11 U5; G10 ch 10 | `#4D6B0E` | `#B5D57A` |
| `signal` (Trend amber) | G11 U6; G10 ch 11 | `#8A5300` | `#EDBF5E` |
| `neuron` (Layer plum) | G11 U7; G10 ch 13-1 | `#8A2B86` | `#E59DDF` |
| programming (no accent) | code tasks; G10 ch 12, 13 | `--ink` on `--surface` | same |

Colour is never the only signal: every unit chip also shows its code ("2-1"), and every error has an icon and text.

### Type

- **Display:** *Alexandria* (variable, Arabic + Latin, by the Egyptian type designer Mohamed Gaber). A geometric Kufi construction with a matched Latin, so "2-1 Cryptographic Technologies" and "تقنيات التشفير" read as one voice. Used for lesson codes, unit titles and page titles only.
- **Text and UI:** *IBM Plex Sans Arabic*, designed for bilingual technical text, with a Latin (Plex Sans) drawn to sit beside it. That matters because almost every sentence has English terms inside Arabic. 16 px base, line-height 1.7 for Arabic and 1.5 for English, measure ≤ 70 characters.
- **Code only:** *IBM Plex Mono* (editor, code questions, and the Web Applications status line, where the monospace *is* the motif).
- **Scale** (classical ratio 1.25, mobile → desktop): 13 · 16 · 20 · 25 · 31 · 39 · 49 (desktop display only). Weights: Alexandria 600 / 800; Plex Arabic 400 / 600.
- Fonts are self-hosted through `next/font`, subsetted to Arabic + Latin, with no runtime calls to Google. Each font is about 25–40 KB.

### Signature: the lesson code fills with ink

The textbook's lesson code ("2-1", "6-3") is how students already name lessons. On the curriculum map and lesson headers, each code is set large in Alexandria, and **its glyphs fill with the domain colour from the baseline up, in proportion to mastery** (`p_known`). An empty outline means not started; a solid code means mastered. This is the one bold element on the map screen, and it carries data. Everything around it stays quiet: ruled dividers, no shadows, no cards-in-cards.

### Unit motifs (one action-triggered motion moment each)

| Unit / domain | Static motif | The one motion moment (on the student's action) |
| --- | --- | --- |
| IT and Society | Lessons are nodes; completed lessons draw a link to the previous one, so the unit becomes a network | A new link draws when a lesson is completed |
| Cybersecurity | Locked lesson titles show as cipher text; keys earned = lessons passed | **Decrypt reveal**: the title resolves letter by letter into Arabic/English when the student unlocks it |
| Web Applications | A status line `GET /lessons/3-2 → 200 OK` is the loading and transition language; diagrams show client / server / database | The status line ticks `…` → `200 OK` when the page arrives |
| Web and Media Design | The unit page shows its own 4-column grid lines and colour tokens as swatches with hex labels | The grid overlay toggles on (student taps "show grid") |
| Data Collection and Cleaning *(proposed)* | A table whose dirty cells (blank, duplicate) get cleaned as lessons complete | Cleaned cells settle into place |
| Analysis and Communication *(proposed)* | Scatter points with a regression line | The line refits when a new result arrives |
| Machine Learning and AI *(proposed)* | Layer columns of nodes; mastery lights up activations | A forward-pass pulse runs across the layers |

With `prefers-reduced-motion`, every moment jumps straight to its end state.

### Layout (360 px first; RTL; content aligned to the start edge, never centred blocks of body text)

Landing (`/`): the hero **is the textbook's contents page**. Students and parents recognise a فهرس instantly, and it shows the curriculum rather than generic "learn coding" copy.

```
┌──────────────────────────────┐
│ [logo]            دخول  ☰    │
│                              │
│ البرمجة والذكاء الاصطناعي   │  ← Alexandria 31
│ منهج البكالوريا، درس بدرس   │
│ ─────────────────────────    │
│ [ثانية ثانوي] [أولى ثانوي]  │  ← grade switch
│                              │
│ 1 تكنولوجيا المعلومات…  ▸    │  ← each unit row in its accent,
│ 2 الأمن السيبراني       ▸    │    lessons expand inline
│   2-1 تقنيات التشفير…        │
│   2-2 تصميم أمن الشبكات      │
│ 3 تطبيقات الويب          ▸   │
│ …                            │
│ ─────────────────────────    │
│ [ابدأ بالكود]  [اطلب انضمام] │
├──────────────────────────────┤
│ هتاخد إيه: ملازم، محاكاة،    │  ← plain list, not icon cards
│ كويز أسبوعي، مستواك في كل    │
│ جزء، متابعة ولي الأمر        │
├──────────────────────────────┤
│ [photo] Teacher name, title  │  ← from site_settings
│ bio, years, socials          │
└──────────────────────────────┘
```

Student map (`/s/map`):

```
┌──────────────────────────────┐
│ خريطة المنهج       [AR|EN]  │
│ ┃ 2  الأمن السيبراني   🔑 1/3│  ← rule in domain colour
│ ┃  ┌────┐ ┌────┐ ┌────┐      │
│ ┃  │2-1 │ │2-2 │ │2-3 │      │  ← codes fill with ink = mastery
│ ┃  └────┘ └────┘ └────┘      │
│ ┃  كمل من: 2-2 تصميم أمن…  ›│
│ ┃ 3  تطبيقات الويب           │
│ ┃  [3-1] [3-2] [3-3]         │
└──────────────────────────────┘
```

Lesson page (`/s/lessons/g11-2-1`): the start-edge margin rule (a nod to the notebook margin) carries the lesson code and section labels (*Try*, *Exercise*, *EXAM TRAP*). The margin is where information sits, not decoration.

```
┌──────────────────────────────┐
│ 2-1 ║ تقنيات التشفير والمصادقة│
│     ║ ص 33، English edition   │
│     ║ [ملزمة PDF] [ملاحظات]   │
│ Try ║ محاكاة Caesar/Vigenère  │
│     ║ أسئلة تدريب (5)        │
│ HW  ║ واجب لحد الخميس 9م      │
│ AI  ║ اسأل المستر  (AI)       │
└──────────────────────────────┘
```

Teacher attendance (`/t/attendance/[session]`): one-handed, thumb-zone controls.

```
┌──────────────────────────────┐
│ مجموعة السبت 4م، درس 2-2     │
│ [كله حاضر]   [QR]   ⟳ offline│
│ أحمد …        [ح] [ت] [غ]    │  ← 48px targets
│ مريم …        [ح] [ت] [غ]    │
└──────────────────────────────┘
```

Parent (`/p/[student]`): one column, big type, no navigation to learn. In order: attendance this month (one sentence + dots), the latest result, a mastery sentence in plain Egyptian Arabic, the next exam, announcements, and a large WhatsApp button.

### Shape and depth rules

Radius follows hierarchy: 4 px chips, 8 px controls, 14 px sheets, nothing fully rounded except avatars. Depth comes from ruling lines and the `--surface` / `--paper` step. Shadows only on overlays (menus, dialogs). No gradients as decoration.

### Principles

1. The curriculum is the navigation: lesson codes are the primary handle everywhere.
2. Colour means *which unit*; fill means *how well you know it*. Nothing else gets colour.
3. One bold thing per screen. Everything else is ruled, quiet and aligned to the start edge.
4. Motion only answers an action, one moment per unit.
5. Write like the teacher talks: plain Egyptian Arabic, English terms intact, active verbs.

### Self-review against the brief (what I changed and why)

- **First instinct: a dark code-editor look with a green accent.** Rejected: the brief forbids it, and it's the "near-black + acid green" default. Replaced it with the blackboard theme, which comes from the classroom, not from IDEs.
- **First instinct: a hero with a big headline and three feature cards with icons.** That's the SaaS template. Replaced it with the contents-page hero, because the curriculum is the product and Egyptian parents read a فهرس fluently.
- **First instinct: Cairo or Tajawal.** They're the default Arabic web fonts and would make this look like every other teacher platform. Replaced them with Alexandria (an Egyptian design, distinctive at display sizes) plus Plex Arabic (built for mixed Arabic/English technical text).
- **First instinct: a notebook-ruled background on every page.** Rejected as kitsch, and noisy at 360 px. I kept only the margin rule on lesson pages, where it holds the lesson code and section labels.
- **First instinct: progress bars for mastery.** Generic. Replaced them with the ink-filled lesson code, so mastery lives in the element students already use to name lessons.
- **Checked against the brief's ban list:** no cream/terracotta, no acid green, no identical shadowed cards, no gradient washes, no all-caps eyebrows, no "→" on every link, numbering only on real sequences (lesson codes), no middle-dot meta strings in the UI.

---

## 6. `lib/ai/` design

```
lib/ai/
  client.ts        Anthropic SDK client, `import "server-only"`
  models.ts        AI_MODEL_FAST / AI_MODEL_SMART + per-feature effort
  run.ts           runFeature(feature, input): build prompt → call → validate → log ai_calls
  guard.ts         wraps uploaded docs in <document source=… trust="data"> blocks; moderation (Haiku classifier)
  cost.ts          price table per model; cost_usd per call; monthly rollups
  cache.ts         prompt-caching breakpoints (stable system + lesson context first)
  features/<name>/ prompt.ts · schema.ts (zod → JSON schema) · golden/*.json
evals/             runner; results saved under evals/results/<feature>/<prompt_hash>.json
```

- **Structured outputs** through `output_config.format` from the zod schema, then zod validation. One retry on validation failure, then the call fails visibly. (These models reject forced `tool_choice`.)
- **Model routing:** Haiku for the tutor, moderation, code feedback and report wording. Sonnet for question generation, short-answer grading and lesson summaries. Effort is set explicitly per feature (Haiku 5.5 defaults to `medium`).
- **Number checker** for parent reports is deterministic code, not an LLM: it extracts every number in the text (Arabic and Western digits, percentages, fractions) and matches each against the facts JSON. Any mismatch blocks sending.
- **Copilot:** the model picks from an allow-list of named, parameterised read-only queries (a typed registry in code) and fills in the parameters. It never writes SQL.
- Student names are replaced with placeholders before any prompt where the name isn't needed. The only feature that needs a name is parent reports, and it gets the first name only.

---

## 7. Dependencies (proposed, one line each; none phone home with user data)

`next`, `react`, `typescript`, `tailwindcss`: the brief's stack · `@supabase/supabase-js`, `@supabase/ssr`: data, auth, cookies · `@anthropic-ai/sdk`: Claude API (server only) · `zod`: input/output validation · `next-intl`: AR/EN messages, RTL · `@radix-ui/react-*`: accessible primitives · `libphonenumber-js`: Egyptian phone validation · `exceljs`, `papaparse`: XLSX/CSV import and export · `pdfjs-dist`: PDF viewer · `pdf-lib`: name watermark on download · `@codemirror/*`: code editor (see §1) · `pyodide` (lazy, cached): Python in the browser and in the server grading sandbox · `quickjs-emscripten`: isolated JavaScript grading sandbox on the server (§1b) · `@techstark/opencv-js` (lazy, teacher only): OMR · `qrcode`, `jsqr`: attendance and OMR QR codes · `serwist`: PWA / offline · `vitest`, `@playwright/test`, `supabase` CLI: testing. No third-party analytics.

---

## 8. M1 slice order (each one runnable, tested, committed)

1. Repo, tooling, CI, tokens, fonts, i18n scaffold, `.gitignore` (excluding `Sec 1/`, `Sec 2/`), `.env.example`, `PRIVACY.md`, `DEPLOY.md` skeleton.
2. Schema + RLS helpers + RLS test harness (identity, curriculum, groups).
3. Teacher Google sign-in with the allow-list; teacher shell.
4. Curriculum seed (confirmed titles) + curriculum editor (edit, reorder, add).
5. Groups CRUD with weekly schedule.
6. Bulk import: parse → preview with errors → commit → codes.
7. Code login for students and parents; minimal student and parent home; sibling linking.
8. Send codes through the WhatsApp outbox; code regeneration with audit log.
9. Self-registration → approval.
10. Checkpoint: your real list imported, a test student and parent signed in, screenshots at 360 / 1280 in both themes.

---

## 9. Questions for you (I'm waiting on these)

### Answers so far (2026-11-26)

| Q | Answer | What changes in the plan |
| --- | --- | --- |
| 1 | Grade 11 titles confirmed. **All 7 units are in scope** (Term 1: units 1–4, Term 2: units 5–7). | All 23 Grade 11 lessons go in the seed (Grade 10 has 62). Units 5–7 get the `data`, `signal` and `neuron` worlds and need simulations in M6 (candidates in §5; I'll confirm them with you before building). The Part Two Arabic titles count as confirmed. |
| 2 | Grade 10 titles confirmed. **No Arabic edition: Grade 10 is English only.** | Grade 10 lessons are seeded with English titles only (`title_ar` nullable). Grade 10 groups and students have their edition fixed to `en` and see no edition switch. The **UI stays Arabic-first** for Grade 10 too: only the curriculum content is English. Simulations, tutor and question generation for Grade 10 use English content; the tutor can still explain in Egyptian Arabic. *Still open: is Grade 10 split by term?* |
| 3 | **Use both lists**: the brief's styles and the 2026 book's. | The style list becomes a `question_styles` lookup table, grouped by source (see below), so you can add more later from the curriculum editor without code changes. |
| 2b | **Grade 10 is one book for the whole year** (no terms). | Grade 10 units have `term = null`; the map shows all 13 chapters in one list. |
| 1b | **Unit 5–7 themes approved. Simulations: build what the chapters contain.** | M6 builds simulations from each lesson's actual content for Grade 11 units 1–7 **and** Grade 10 (this answers the brief's Grade 10 ASK). I'll pick them from the book and list them at the M6 checkpoint. |
| 4 | Real file columns: `studentID, Name, grade, phone number, gmail, parent's email, parent's phone number, venue (online or offline), gender` | Importer rebuilt around these columns. See "Importer (from your real file)" below. |
| 9 | **Textbooks may be used everywhere.** | The textbook PDFs are ingested for question generation, tutor grounding and lesson summaries. Copyright responsibility is your decision, recorded here. The safeguards stay anyway: the PDFs live in a private bucket and are never downloadable by students unless you upload them as a material, and the tutor quotes short passages and cites page numbers instead of pasting pages. |

| 5 | Yes | Existing students' consent is recorded as `import_attested`; the parent confirms in the portal at first login. |
| 6 | Approve all four | CodeMirror 6; whole-lesson tutor context. (Self-hosted embeddings and STT are then replaced by the free-tier answers below.) |
| 7, 14 | **Free tier for everything** (15 students, one teacher) | See §1b. Supabase Free (a separate free project for dev/testing, no Docker), Vercel Hobby, no paid VPS. |
| 8 | No recorded sessions | **Lesson recorder (5.5 #10) removed from scope.** No speech-to-text is needed. |
| 10 | No server needed now | No VPS. Data location: Supabase in the EU (Frankfurt) and Anthropic in the US. I'll draft consent wording that says so plainly, for you to review at the M1 checkpoint (not legal advice). |
| 11 | Weekly parent reports through WhatsApp | Tap-through "next parent" flow with `wa.me` links, as planned. |
| 12 | Do the recommended | Parent code login also asks for the **last 4 digits of the parent's phone**. Students use the code only. |
| 13 | مستر احمد | Set as the teacher title in `site_settings` at setup (not in code). The tutor is labelled «اسأل مستر أحمد» from that setting. |
| 15 | Yes | Students and parents can sign in with Google **when the Google account's verified email matches** the imported `gmail` / `parent's email`. Codes are still issued and still work. The teacher role stays restricted to the allow-list. |
| 16 | Google Meet for online groups; some groups offline | `groups.venue` (online/offline) + `groups.meet_url`. Online students get a "Join Meet" button at session time. Online attendance uses a **rotating 4-digit check-in code** you show on your screen share (valid only during the session); offline groups use tap or QR. You can override either. |
| 17 | Default edition: **English** | The import preview defaults Grade 11 rows to `en`; you can change any row. |

### Importer (from your real file)

| Your column | Stored as | Validation and notes |
| --- | --- | --- |
| `studentID` | `students.external_id` (unique) | **Re-importing the same file updates students instead of duplicating them.** A missing or repeated ID is a row error. |
| `Name` | `students.display_name` | Required. |
| `grade` | `grade_level_id` | Accepts `10`/`11`, `1st sec`/`2nd sec`, `أولى`/`تانية`/`ثانية`. Anything else is a row error. |
| `phone number` | `students.phone` (optional) | Normalised to `+20…`. Fixes numbers where Excel dropped the leading 0 (`1012345678` → `+201012345678`). |
| `gmail` | `students.google_email` (optional) | Lowercased, checked for format. Used to let the student sign in with Google (see Q15). |
| `parent's email` | `parents.email` (optional) | Same as above, for the parent. |
| `parent's phone number` | `parents.phone_e164` | **Required**: it receives the codes on WhatsApp and links siblings. If two students share it, they get the same parent automatically. |
| `venue` | `students.venue` (online / offline) | Accepts `online`/`offline`/`أونلاين`/`سنتر`. Used to choose groups and how attendance is taken (Q16). |
| `gender` | `students.gender` (m / f) | Kept only because Egyptian Arabic copy is gendered (جاهز/جاهزة, ابنك/بنتك in parent messages). Listed in `PRIVACY.md` with that reason. Never shown to other students. |

**Not in your file, so the importer asks for them in the preview step:**

- **Group:** after the upload, the preview lets you assign a group per row, or for every row at once by grade + venue (e.g. "all Grade 11 offline → Saturday 4pm"). Rows without a group can still be imported and show up as "needs a group" on the dashboard.
- **Edition (Grade 11 only):** one default for the whole import (Q17), changeable per row. Grade 10 is always English.
- **Parent name:** not required. WhatsApp messages and the parent portal say «ولي أمر <student name>» instead.


**Question styles (seed for `question_styles`):**

- *Grade 11 book (brief):* Worked Example (with Solution), Try, Think as an Engineer, In a New Context, Exercise, Lesson Question.
- *Grade 11 book (2026 edition):* Explore (in pairs), PAUSE & THINK, Point!, Key Fact, KEY TERMS.
- *Grade 10 book:* Warm Up, Explanation, Try, Exercise.
- *Teacher's house styles:* DEFINITION, NOTE, EXAM TRAP («حاسب تقع فيه»), MEMORY TRICK, Key Terms Glossary, «ملخص الدرس كقصة واحدة», graded HOMEWORK, critical thinking.

Each style records which grade(s) it applies to, so the question generator only offers styles that fit the selected lesson. *Point!*, *Key Fact* and *KEY TERMS* are mostly content blocks, not questions; the generator uses them to make recall questions (for example, "complete the Key Fact") and to build the Key Terms Glossary.

**Curriculum**
1. Are the Grade 11 lesson titles in §0 right, and should **Units 5–7 (Term 2)** be in scope? If they are, are the proposed visual worlds (data table, regression line, neural layers) fine?
2. Are the Grade 10 chapter and lesson titles in §0 right? Is there an **Arabic edition** of the Grade 10 book (I didn't find one), and is Grade 10 split by term?
3. The brief's Grade 11 question styles (Worked Example, Try, Think as an Engineer, In a New Context, Exercise, Lesson Question) don't match what I see in the 2026 book: *Explore (in pairs)*, *PAUSE & THINK*, *Point!*, *Key Fact*, *KEY TERMS*. Should I add these to the style list, or keep yours only?

**Import and onboarding**
4. Please send a sample of your real student file's **column headers** (headers only, or 2 rows with fake names). Do your group names look like "Saturday 4pm", or something else?
5. For students you import, how was guardian consent given? I propose recording it as "attested by teacher on import", and the parent confirms in the portal at first login. Is that acceptable?

**Stack and hosting**
6. Do you approve the four stack changes in §1 (CodeMirror instead of Monaco, self-hosted embeddings, a whole-lesson tutor context, an STT engine for the recorder)?
7. Running costs (infrastructure, not anything students pay): Judge0 and the embedding worker need a small VPS (~US$10–20/month). Supabase Free pauses idle projects and has no backups, so for minors' data I recommend Supabase Pro (US$25/month). Vercel Hobby is non-commercial only, so private tutoring likely needs Vercel Pro (US$20/month). Are these OK? Do you have accounts already, and a domain name?
8. Lesson recorder speech-to-text: self-hosted Whisper (private, weaker on Egyptian dialect) or a hosted STT API (better, but class audio leaves our system)? Or should I move the recorder to later?

**Privacy and copyright**
9. Copyright: the textbooks' notice forbids storing them "in a retrieval system" without written permission from the Ministry. Using them to ground the question generator and the tutor is exactly that. Options: (a) use only your own study guides for grounding, and cite textbook page numbers without storing the text; (b) store the textbook privately for AI grounding only, never showing students more than short quotes, at your own judgement; (c) get permission first. Which one?
10. Data location: Supabase/Vercel servers would be in the EU (Frankfurt), and Anthropic is in the US. Egypt's PDPL restricts cross-border transfer, so the consent text should say this plainly. Is that OK, and do you have a lawyer or school policy to check the consent wording against? (I'll draft it; this isn't legal advice.)

**Product**
11. Parent weekly reports through `wa.me` links need one tap from you per parent (WhatsApp opens with the text ready, and you press send). With ~N parents, is a "next parent" tap-through flow acceptable for v1?
12. Should code login for parents also ask for the last 4 digits of their phone? It's cheap extra protection if a code leaks. Students would stay code-only.
13. Your teacher title as students say it (e.g. "مستر …"), for the tutor's name "اسأل المستر"? I'll keep the name itself in settings.
14. Local development needs Docker (for local Supabase), or a separate free Supabase dev project. Which do you prefer?

**New, from your file**

15. Your file has the students' and parents' Gmail addresses. Should students and parents be able to **sign in with Google straight away** when their Google account matches the imported email? (Codes would still be issued and still work.) The brief only allows Google for them as an optional link added after a code login.
16. **Online students:** are online sessions live (Zoom/Meet) at a fixed time, or recorded? This decides how their attendance is taken: a join check-in at session time, or watching the recording.
17. **Grade 11 edition:** your file has no edition column. Are most Grade 11 students on the Arabic or the English edition, so I can set the default?
