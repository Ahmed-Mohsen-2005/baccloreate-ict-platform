# PRIVACY.md

What this platform stores about minors (15–17) and their parents, why, and where. Written with Egypt's Personal Data Protection Law (Law 151 of 2020) in mind; this is an engineering record, not legal advice. The student-facing policy is at `/privacy` (text in `messages/*.json` → `privacy`).

## Roles

Teachers (the platform's partners, each with full admin access), students, parents. No other staff role exists. Enforced by Postgres Row-Level Security on every table (`supabase/migrations/*`), tested in `tests/rls/`.

## What is stored, and why

| Data | Table | Why |
| --- | --- | --- |
| Student name, grade, group, book edition, online/offline | `students` | Teaching and grouping |
| Teacher's own student ID | `students.external_id` | So re-importing the teacher's file updates instead of duplicating |
| Gender (optional) | `students.gender` | Only for gendered Arabic copy (جاهز/جاهزة, ابنك/بنتك). Never shown to other students |
| Student mobile, Gmail (optional) | `students` | Contact; Google sign-in when the Gmail matches |
| Parent mobile (required), email (optional) | `parents` | Sending codes and reports on WhatsApp; sibling linking; parent login check (last 4 digits) |
| Family links | `guardianships` | A parent sees only their own children |
| Consent: kind, policy version, method, timestamp, withdrawal | `consents` | Proof of guardian consent (import attestation, sign-up checkbox, or parent portal) |
| Access codes | `access_codes.code_hmac` | **HMAC-SHA256 only**; plaintext exists only in the teacher's browser at send time |
| Join requests | `join_requests` | Self-registration awaiting approval, with the consent timestamp |
| WhatsApp outbox | `messages` | Which family got which message when. **Never contains codes** |
| Audit trail | `audit_log` | Code issuing, student edits/deletions, allow-list changes. Code hashes are stripped |

**Never stored:** national ID, address, full birth date, payment data (the platform has no payments). Unknown Google accounts that match no student or parent are deleted immediately at sign-in.

## Where it lives

- **Supabase** (Postgres + Auth), region Central EU (Frankfurt).
- **Vercel** hosting the web app.
- **Anthropic** (Claude API, US), from M4, only through server routes in `lib/ai/`. Names are removed when not needed; data is not used for training. The teacher reviews AI output before it is used, except the labelled AI tutor.
- **WhatsApp**: messages are sent by the teacher from their own phone through `wa.me` links; the platform has no WhatsApp API access in v1.

Cross-border transfer (Egypt → EU/US) is disclosed in the consent text and the `/privacy` page.

## Data minimisation in code

- Import validation rejects nothing it doesn't need; unknown spreadsheet columns are ignored and never stored.
- Uploaded spreadsheets are parsed in memory and discarded.
- No third-party analytics, fonts loaded from our own domain (`next/font` self-hosting).
- The service-role key is used only in `lib/auth/code-login.ts`, `lib/auth/google.ts` and the public join-request action.

## Rights and deletion

Parents ask the teacher for export, correction or deletion. Deletion is a soft delete (`deleted_at`) followed by permanent purge after 30 days (purge job: M2). Consent can be withdrawn (`consents.withdrawn_at`).
