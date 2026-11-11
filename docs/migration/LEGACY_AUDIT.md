# Legacy Code Audit — Evidence and Limits

Date: 2026-11-11
Repository: Rla102277/Board-Game-Forge, default branch Main
Status: source inspection only; no local build, database, or browser smoke test completed.

## Verified by source inspection
- pnpm workspace with React/Vite UI and Express server.
- Frontend package uses React, Tailwind, shadcn ecosystem, TanStack Query and Fabric.
- API package uses Express, Drizzle-backed workspace DB, Zod-generated contracts, Clerk, and AI provider adapters.
- Quick Start wizard source exists at artifacts/gameforge/src/components/wizard/quick-start-wizard.tsx, with five-step flow and project population actions.
- Simulator endpoint artifacts/api-server/src/routes/simulator.ts calculates a stochastic resource trajectory using Math.random(); it does not execute a canonical game's legal actions.
- The same simulator's playthrough endpoint prompts an LLM to narrate a 6–8 turn game; this is not a verified game execution.
- Balance endpoint artifacts/api-server/src/routes/balance.ts begins with score 80, subtracts penalties for numeric property spread and duplicate rule titles; it is not a statistically validated game balance metric.
- Playtest endpoint artifacts/api-server/src/routes/playtest.ts stores sessions and feedback. Its feedback-share token is deterministically derived from project ID; review link authorization and revocation semantics before using it for private projects.
- Server package declares a test script pointing to vitest.config.ts; verify configuration existence and actual test invocation in CI.

## Keep candidates (require runtime verification)
React design workspace, card/component studios, rulebook editor, project management, AI router, asset pipeline, snapshots, collaboration, publishing exporters, existing API contracts.

## Rework candidates
Quick Start should produce compiler-valid game definitions, not only prose/entities. Rules editor should connect to executable DSL. Snapshots should pin game package hashes. Playtesting should support verified game replays.

## Replace or relabel
Resource Monte Carlo should be labeled 'economy scenario model' until replaced with engine-driven simulation. AI dramatized playthrough should be labeled 'fictional design walkthrough'. Balance score should be labeled 'static heuristic review' rather than a competitive balance score.

## Unverified
Actual application startup; dependency install; TypeScript/build status; DB migrations; auth flow; route authorization; all frontend interaction; generated project integrity; existing-game legality; gameplay completeness; print outputs; production deployment; full security assessment.

## Audit procedure
1. Clone exact Main SHA, capture dependency/runtime versions and secret-free environment requirements.
2. pnpm install --frozen-lockfile, pnpm typecheck, pnpm build; run all test scripts.
3. Provision isolated PostgreSQL and run migrations on test data.
4. Exercise sign-in, project creation, wizard, component editing, rules, snapshot/restore, simulator, playtest, export.
5. Check tenant authorization, shared links, prompt injection, input validation, secrets and data preservation.
6. Record each feature as PASS/FAIL/BLOCKED with logs and screenshots; only then finalize removal decisions.
