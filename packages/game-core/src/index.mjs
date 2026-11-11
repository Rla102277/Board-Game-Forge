// BoardForge V2: minimal deterministic, dependency-free game kernel.
// Proof-of-concept rules for the ORIGINAL sample game "Outpost Race".
// All state transitions are immutable; no model or network calls in this module.
export function initialState(players, seed = 1) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4 ||
      new Set(players).size !== players.length ||
      players.some(p => typeof p !== 'string' || !p.trim())) {
    throw new Error('Expected 2–4 distinct player IDs');
  }
  if (!Number.isSafeInteger(seed)) throw new Error('Seed must be a safe integer');
  return {
    game: 'outpost-race', version: '0.1.0', seed,
    turn: 0, active: 0, maxTurns: 40,
    players: players.map(id => ({ id, wood: 1, gold: 0, outposts: 0, points: 0 })),
    history: [], winner: null, ended: false
  };
}

export function observe(state, playerId) {
  if (!state.players.some(p => p.id === playerId)) throw new Error('Unknown player');
  return {
    game: state.game, version: state.version, turn: state.turn,
    currentPlayer: state.players[state.active].id, ended: state.ended,
    winner: state.winner,
    players: state.players.map(p => ({ ...p })),
    legalActions: legalActions(state, playerId)
  };
}

export function legalActions(state, playerId) {
  if (state.ended || state.players[state.active].id !== playerId) return [];
  const p = state.players[state.active];
  const actions = [{ type: 'gatherWood' }, { type: 'mineGold' }];
  if (p.wood >= 2 && p.gold >= 1) actions.push({ type: 'buildOutpost' });
  return actions;
}

export function transition(state, playerId, action) {
  const legal = legalActions(state, playerId);
  if (!action || !legal.some(a => a.type === action.type && Object.keys(action).length === 1)) {
    throw new Error('Illegal action');
  }
  const players = state.players.map(p => ({ ...p }));
  const p = players[state.active];
  if (action.type === 'gatherWood') p.wood += 1;
  else if (action.type === 'mineGold') p.gold += 1;
  else if (action.type === 'buildOutpost') {
    p.wood -= 2; p.gold -= 1; p.outposts += 1; p.points += 3;
  }
  const turn = state.turn + 1;
  const winner = p.points >= 9 ? p.id : null;
  const ended = Boolean(winner) || turn >= state.maxTurns;
  const event = { turn, playerId, action: action.type };
  return {
    state: {
      ...state, players, turn, active: (state.active + 1) % players.length,
      winner: winner ?? (ended ? [...players].sort((a,b) => b.points-a.points)[0].id : null),
      ended, history: [...state.history, event]
    },
    events: [event]
  };
}

export function replay(players, seed, events) {
  let state = initialState(players, seed);
  for (const e of events) {
    const result = transition(state, e.playerId, { type: e.action });
    if (result.events[0].turn !== e.turn) throw new Error('Replay turn mismatch');
    state = result.state;
  }
  return state;
}

export function runMatch(playerIds, policies, seed = 1) {
  let state = initialState(playerIds, seed);
  while (!state.ended) {
    const id = state.players[state.active].id;
    const options = legalActions(state, id);
    const policy = policies[id];
    if (typeof policy !== 'function') throw new Error('Missing policy: ' + id);
    const action = policy(observe(state, id), options);
    state = transition(state, id, action).state;
  }
  return state;
}

export const policies = {
  first: (_observation, actions) => actions[0],
  builder: (observation, actions) => {
    const self = observation.players.find(p => p.id === observation.currentPlayer);
    const desired = self.wood < 2 ? 'gatherWood' : self.gold < 1 ? 'mineGold' : 'buildOutpost';
    return actions.find(a => a.type === desired) ?? actions[0];
  }
};
