# Outpost Race runtime

`@workspace/game-core` is the shared TypeScript rules engine for the original,
perfect-information reference game Outpost Race. React digital play and headless
matches use the same legal actions and immutable transitions. No external AI keys
are needed. Node 22.18+ can run the source tests directly.

- 2–4 players start with 1 wood and 0 gold.
- Gather 1 wood, mine 1 gold, or build for 2 wood + 1 gold.
- Each outpost scores 3 points; the first player to 9 wins.
- After 12 turns per player, highest score wins; tied leaders draw.
- Builder gathers missing resources. Random uses the seed, turn and acting player
  to select reproducible legal actions. The game rules themselves have no chance.
- Replay bundles pin the game/version, seed, seats and event log. Import validates
  every transition and rejects unsupported versions, illegal moves and turn gaps.
  Version 0.2 changes the prototype's turn limit and tie semantics; 0.1 bundles
  are explicitly unsupported, rather than replayed under different rules.

Run `pnpm test:engine` at the repository root. `pnpm typecheck` includes this package.
The tests cover 2,000 seeded headless games, repeated replay/invariant checks,
policy isolation, and human/AI turn progression from every seat.

In the existing app choose **Playtest → Play vs AI**, or open `/play` for the public
reference game. Games resume from device-local storage; no game state is sent to a
server. Export verifies the replay before download. This reference-game mode does
not yet execute user-authored project rules or provide authoritative multiplayer.

After `pnpm build`, run `pnpm --filter @workspace/gameforge test:e2e` for desktop and
mobile Chromium tests. Install the test browser with
`pnpm --filter @workspace/gameforge exec playwright install chromium`.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an existing Chromium binary.
Database integration tests require an explicit disposable `TEST_DATABASE_URL`.
