# BoardForge Product Specification

## Product
An integrated tabletop game IDE and runtime, supporting design, existing-game import, simulation, digital play, analytics and publishing.

## User journeys
1. Creator describes theme, player count, duration and mechanics -> design agents draft a game -> compiler validates -> creator resolves ambiguities -> play against AI -> simulate and improve -> export.
2. Player opens an authorized game package -> selects human/AI opponents -> plays in browser -> inspects history/replay.
3. Researcher compares strategies and rules versions using seeded tournaments, seating rotation and confidence intervals.
4. Publisher exports rulebook, cards, board, tokens, BOM and portable package with rights checks.

## MVP
One complete original game; one legally distributable existing game; schema/compiler; deterministic engine; random, heuristic and LLM opponent adapters; seeded tournaments; simple analytics; local hot-seat and human-vs-AI; portable packages; basic print export; Git version references.

## Deferred
Public matchmaking, 3D physics, marketplace, native mobile, arbitrary commercial-game distribution, reinforcement learning infrastructure, untrusted plugin execution, voice and campaign-scale narratives.

## Success criteria
A new user can generate or edit a valid game, play a complete legal match, inspect replay, run a seeded tournament, review balance metrics and export a portable prototype without needing to write code.
