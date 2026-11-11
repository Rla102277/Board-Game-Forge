# BoardForge V2 Game Core — First executable slice

This is an intentionally dependency-free, JavaScript ESM proof-of-concept for a deterministic game engine, isolated from the existing app until the baseline build is verified.

Run: `node --test packages/game-core/test/*.test.mjs` (Node 22+).

The original example game Outpost Race uses gather wood, mine gold, and build outpost actions. First player to 9 points wins, or highest score at 40 turns. This proves legal actions, immutable transitions, headless policies, match termination and deterministic replay.

**Limitations:** No seeded random effects are currently used, no hidden information, no state hashing, no general DSL/compiler, no persistence or browser integration. This is NOT the complete canonical engine. Promote to the TypeScript workspace package and add those capabilities after the existing baseline CI is green.
