# Programming and AI — teaching platform

A platform for one teacher of the Egyptian Baccalaureate subject **"Programming and Artificial Intelligence"** (Grade 10 and Grade 11), their students and the students' parents. Arabic-first (RTL, Egyptian colloquial UI), English as the second locale.

- Plan and decisions: [docs/M0-PLAN.md](docs/M0-PLAN.md)
- Conventions and non-negotiables: [CLAUDE.md](CLAUDE.md)
- Setup and deployment: [DEPLOY.md](DEPLOY.md)
- What data is stored and why: [PRIVACY.md](PRIVACY.md)
- Dependencies and why each exists: [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)

## Stack

Next.js 16 (App Router) + TypeScript strict + Tailwind 4 · Supabase (Postgres + RLS + Auth) · next-intl · Vitest (+ PGlite for RLS tests, no Docker) · Playwright.

## Commands

```powershell
npm install
```

```powershell
npm run dev
```

```powershell
npm run check
```

`check` runs typecheck, lint and every test (unit + RLS).

## Status

M1 (foundation) in progress: auth (teacher Google, student/parent codes, Google match), RLS, curriculum seed and editor, groups, bulk import with preview, send codes via WhatsApp, self-registration.
