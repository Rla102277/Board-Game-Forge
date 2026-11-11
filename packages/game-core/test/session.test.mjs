import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  advanceOpponents,
  transition,
  policies,
  observe,
  legalActions,
  exportReplay,
  importReplay,
} from "../src/index.mjs";

test("human-versus-AI sessions complete from every seat with both opponents", () => {
  for (const opponent of ["builder", "random"])
    for (let count = 2; count <= 4; count++)
      for (let seat = 0; seat < count; seat++) {
        const ids = Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
        const human = ids[seat];
        let state = advanceOpponents(initialState(ids, 42), human, opponent);
        while (!state.ended) {
          assert.equal(state.players[state.active].id, human);
          state = transition(
            state,
            human,
            policies.builder(observe(state, human), legalActions(state, human)),
          ).state;
          state = advanceOpponents(state, human, opponent);
        }
        assert.deepEqual(
          importReplay(JSON.parse(JSON.stringify(exportReplay(state)))),
          state,
        );
      }
});
test("rejects unknown seats, opponents and replay versions", () => {
  const state = initialState(["a", "b"]);
  assert.throws(() => advanceOpponents(state, "outsider", "builder"));
  assert.throws(() => advanceOpponents(state, "a", "unknown"));
  assert.throws(() =>
    importReplay({ ...exportReplay(state), version: "0.1.0" }),
  );
  assert.throws(() =>
    importReplay({
      ...exportReplay(state),
      events: [{ turn: 1, playerId: "a", action: "buildOutpost" }],
    }),
  );
});
