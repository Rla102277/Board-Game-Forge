import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, observe, legalActions, transition, replay, runMatch, policies } from '../src/index.mjs';

test('initializes 2-4 players and rejects duplicates', () => {
  assert.equal(initialState(['a','b']).players.length, 2);
  assert.throws(() => initialState(['a','a']));
  assert.throws(() => initialState(['a']));
});
test('illegal action does not mutate game state', () => {
  const state = initialState(['a','b']);
  const before = structuredClone(state);
  assert.throws(() => transition(state, 'b', {type:'gatherWood'}));
  assert.throws(() => transition(state, 'a', {type:'buildOutpost'}));
  assert.deepEqual(state, before);
});
test('actions change only new state', () => {
  const state = initialState(['a','b']);
  const next = transition(state, 'a', {type:'gatherWood'}).state;
  assert.equal(state.players[0].wood, 1);
  assert.equal(next.players[0].wood, 2);
  assert.equal(next.turn, 1);
});
test('replay reproduces state', () => {
  const final = runMatch(['a','b'], {a:policies.builder,b:policies.first}, 42);
  assert.deepEqual(replay(['a','b'],42,final.history),final);
});
test('complete matches are deterministic and terminal', () => {
  const run = () => runMatch(['a','b'], {a:policies.builder,b:policies.builder}, 7);
  assert.deepEqual(run(),run());
  assert.equal(run().ended,true);
  assert.ok(run().turn <= 40);
});
test('1000 headless matches finish legally', () => {
  for (let seed=0;seed<1000;seed++) {
    const state = runMatch(['a','b'],{a:policies.builder,b:policies.first},seed);
    assert.ok(state.ended);
    assert.ok(state.winner);
    assert.equal(state.history.length,state.turn);
  }
});
test('non-current player receives no actions', () => {
  const state=initialState(['a','b']);
  assert.deepEqual(legalActions(state,'b'),[]);
  assert.deepEqual(observe(state,'b').legalActions,[]);
});
