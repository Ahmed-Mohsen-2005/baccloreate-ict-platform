# AGENTS.md

You are continuing an existing production codebase. Before changing anything, read in this order:

1. `docs/CODEX_PROMPT.md` — your work order (scope, rules, acceptance criteria, stop points).
2. `docs/HANDOFF.md` — exactly what exists, what does not, and the pitfalls already hit.
3. `CLAUDE.md` — the non-negotiables and conventions (no payments, three roles, minors' privacy, AI drafts need teacher approval, secrets never in client/repo, Arabic-first, accessibility).
4. `docs/M0-PLAN.md` — architecture, data model, route map, design plan, and the owners' decisions (§9).

Hard rules: never read, print or request `.env.local` or any secret; never commit `Sec 1/`, `Sec 2/` or any textbook; every new table has RLS plus tests; `npm run check` and `next build` must pass before every commit.
