# Board Game Forge 2.0 — Target Architecture

Status: proposed, pending build/runtime verification. Existing Main must remain untouched.

## Mission
Extend the original GameForge design IDE into a complete agent-native tabletop platform: original-game creation, authorized existing-game import, executable rules, AI simulation, digital play, reproducible analysis, and print/digital exports.

## Architectural decision records
1. Preserve pnpm monorepo, React 19/Vite/Tailwind/shadcn, Express 5, Drizzle/PostgreSQL, contract-first OpenAPI/Zod, and existing multi-provider AI adapters until benchmarked alternatives demonstrate value.
2. Add a framework-neutral TypeScript game-core package shared by digital play and headless simulation. The engine alone validates actions and changes game state.
3. Store game definitions as portable, versioned, declarative packages with validated mechanics and bounded effects. Do not execute generated arbitrary JavaScript.
4. Use seeded RNG, player-scoped observations, immutable transitions, event logs, state hashes, and replay tests.
5. AI design agents produce structured proposals and patches; AI play agents receive only legal actions and authorized observations. Human review gates govern release changes.
6. Keep Git as source of truth for definitions, agent configurations, tests, and design decisions; PostgreSQL remains the operational store. Large artifacts belong outside Git.
7. Keep existing project snapshot UI and migrate to Git-linked version references incrementally, with tested backwards compatibility.
8. Prefer local-first runtime and optional cloud providers; Tauri packaging follows stable browser play.
9. Preserve existing collaborative SaaS features if functional, but defer expansion until core gameplay is proven.
10. Imported commercial games require rights metadata; private analysis is separate from public distribution.

## Components
- Existing React Studio: game design, component editors, rules editor, projects, exports.
- Game schema/compiler: validated definitions and restricted mechanics registry.
- Game core: initialize, observe, legalActions, transition, currentActors, result.
- Session service: authoritative turns, revision checks, persistence, access control.
- Arena: seeded parallel matches, policy adapters (random/heuristic/search/LLM), tournament jobs.
- Analytics: win rates, confidence intervals, seat advantage, pacing, illegal actions, resource distributions.
- Agent orchestrator: design, rules, QA, playtest, balance, creative, publisher roles.
- Digital tabletop: 2D board/cards/tokens, private hands, event history, hot-seat and human-vs-AI.
- Import workbench: ingest authorized source, extract, human resolve ambiguity, compile, verify.
- Publishing: portable game bundle, printable component sheets, rulebook.

## Data and security
No model-generated code execution in trusted app process. Uploaded text is untrusted. Secrets use secure storage. Hidden information is filtered server-side before transmission. Every run pins package hash, policy versions, seat assignment, seed and action log.

## Migration order
Audit and reproducible baseline -> core engine -> playable original game -> simulator replacement -> digital play -> agent design workflow -> authorized existing-game import -> exports and desktop.

## No-go criteria
Do not claim existing Monte Carlo metrics measure actual game balance. Do not replace working code without regression coverage. Do not merge without CI and manual review.
