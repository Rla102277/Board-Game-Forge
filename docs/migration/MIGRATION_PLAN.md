# BoardForge V2 Migration Plan

## Safety
Main is immutable during discovery. Work in feature/boardforge-v2-audit; no deletes, database writes or dependency upgrades before reproducible baseline and backups. Record commit SHA and schema revision. Export sanitized fixtures only.

## Phase 0 — baseline
Install, typecheck, build, tests, isolated DB, smoke-test and evidence matrix. Investigate the API test-config path and feedback-share token. No runtime pass claims until executed.

## Phase 1 — core
Create packages/game-schema and packages/game-core. Add strict schema validation, seeded PRNG, legal actions, player observation, transitions, terminal state, replay, hash, test vectors.

## Phase 2 — reference games
Implement a small original 2–4 player resource strategy game and an independently verified public-domain/open-license game. Keep rules, fixtures, and licensing provenance in each package.

## Phase 3 — play and simulation
Connect existing frontend to canonical engine through authoritative sessions. Replace simulator analytics with actual recorded games, maintain economy scenario modeling separately. Implement random and heuristic agents before LLM agents.

## Phase 4 — AI creation
Modify wizard to generate validated game schema. Introduce designer/rules/QA/balance agents with structured outputs, cost limits and review gates. Support human edit and retry for unsupported mechanics.

## Phase 5 — imports/publishing
Authorized rules import with ambiguity review, compiler, scenario verification, private/public rights controls. Portable game export and print sheets.

## Release gates
No regressions in existing supported workflows; deterministic replay tests; player-private data never leaks; 1,000 headless simple-game matches without engine errors; one human-vs-AI complete game; tested migration/rollback; user review before merge.
