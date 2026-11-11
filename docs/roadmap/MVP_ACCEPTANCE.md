# MVP Acceptance Gates

- [ ] Clean clone installs with frozen lockfile.
- [ ] Existing typecheck, build and test suites pass or documented failures are fixed.
- [ ] Original Main branch preserved and migration rollback documented.
- [ ] One original game completes legally with 2–4 players.
- [ ] One authorized public-domain/open-license existing game completes legally.
- [ ] Invalid actions never change state.
- [ ] Private player information cannot be observed by other clients or agents.
- [ ] Replaying an action log produces identical hashes and scores.
- [ ] 1,000 simple-game headless matches run without engine errors.
- [ ] Random and heuristic policies run without external AI calls.
- [ ] LLM policy only selects legal actions, with explicit error handling.
- [ ] Tournament reports show seat effects, uncertainty and rule version.
- [ ] Human can finish game against AI in browser.
- [ ] Game package round-trips on clean install.
- [ ] Printable prototype and rulebook export correctly.
- [ ] Project snapshots and legacy data survive migration.
- [ ] Rights metadata blocks unapproved public commercial-game publishing.
- [ ] CI passes and human approves PR before merge.
