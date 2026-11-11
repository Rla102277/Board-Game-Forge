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
    assert.ok(state.winners.length > 0);
    assert.equal(state.history.length,state.turn);
  }
});
test('non-current player receives no actions', () => {
  const state=initialState(['a','b']);
  assert.deepEqual(legalActions(state,'b'),[]);
  assert.deepEqual(observe(state,'b').legalActions,[]);
});

test('builder gathers missing resources and wins against passive policy', () => {
  const state = runMatch(['a','b'], {a:policies.builder,b:policies.first});
  assert.equal(state.winner, 'a');
  assert.equal(state.players[0].outposts, 3);
  assert.equal(state.players[0].points, 9);
});
test('turn limit gives every seat equal turns and records draws honestly', () => {
  for (let count=2;count<=4;count++) {
    const ids=Array.from({length:count},(_,i)=>String(i));
    const state=runMatch(ids,Object.fromEntries(ids.map(id=>[id,policies.first])));
    assert.equal(state.winner,null);
    assert.deepEqual(state.winners,ids);
    for (const id of ids) assert.equal(state.history.filter(e=>e.playerId===id).length,12);
    assert.deepEqual(legalActions(state,ids[state.active]),[]);
    assert.throws(()=>transition(state,ids[state.active],{type:'gatherWood'}));
  }
});
test('random policies reproduce across 1000 seeds with 2-4 players and resource invariants', () => {
  const histories = new Set();
  for (let seed=0;seed<1000;seed++) {
    const ids=Array.from({length:2+seed%3},(_,i)=>String(i));
    const agents=Object.fromEntries(ids.map((id,i)=>[id,i%2?policies.builder:policies.random]));
    const state=runMatch(ids,agents,seed);
    assert.deepEqual(runMatch(ids,agents,seed),state);
    assert.deepEqual(replay(ids,seed,state.history),state);
    assert.ok(state.ended && state.turn<=state.maxTurns);
    for(const p of state.players) {
      assert.ok(p.wood>=0 && p.gold>=0);
      assert.equal(p.points,p.outposts*3);
      const actions=state.history.filter(e=>e.playerId===p.id);
      assert.equal(p.wood,1+actions.filter(e=>e.action==='gatherWood').length-2*p.outposts);
      assert.equal(p.gold,actions.filter(e=>e.action==='mineGold').length-p.outposts);
    }
    histories.add(JSON.stringify(state.history));
  }
  assert.ok(histories.size>100);
});
test('observations and returned events cannot mutate authoritative state', () => {
  const state=initialState(['a','b']);
  const view=observe(state,'a');
  view.players[0].wood=900;
  view.legalActions.push({type:'buildOutpost'});
  assert.equal(state.players[0].wood,1);
  const result=transition(state,'a',{type:'gatherWood'});
  result.events[0].playerId='tampered';
  assert.equal(result.state.history[0].playerId,'a');
  const next=transition(result.state,'b',{type:'gatherWood'}).state;
  next.history[0].playerId='tampered';
  assert.equal(result.state.history[0].playerId,'a');
});
test('rejects malformed actions and tampered replays without changing inputs', () => {
  const state=initialState(['a','b']);
  for(const action of [null,{}, {type:'gatherWood',extra:1}, Object.create({type:'gatherWood'}), {type:'cheat'}]) {
    assert.throws(()=>transition(state,'a',action));
  }
  assert.equal(state.turn,0);
  assert.throws(()=>replay(['a','b'],1,[{turn:2,playerId:'a',action:'gatherWood'}]));
  assert.throws(()=>replay(['a','b'],1,[{turn:1,playerId:'b',action:'gatherWood'}]));
});
