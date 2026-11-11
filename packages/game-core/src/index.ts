/** Original, perfect-information reference game. No clocks, network, or model calls. */
export const GAME_VERSION = "0.2.0" as const;
export type ActionType = "gatherWood" | "mineGold" | "buildOutpost";
export interface Action {
  type: ActionType;
}
export interface Player {
  id: string;
  wood: number;
  gold: number;
  outposts: number;
  points: number;
}
export interface GameEvent {
  turn: number;
  playerId: string;
  action: ActionType;
}
export interface State {
  game: "outpost-race";
  version: typeof GAME_VERSION;
  seed: number;
  turn: number;
  active: number;
  maxTurns: number;
  players: Player[];
  history: GameEvent[];
  winner: string | null;
  winners: string[];
  ended: boolean;
}
export interface Observation {
  game: State["game"];
  version: State["version"];
  seed: number;
  turn: number;
  currentPlayer: string;
  ended: boolean;
  winner: string | null;
  winners: string[];
  players: Player[];
  legalActions: Action[];
}
export type Policy = (observation: Observation, actions: Action[]) => Action;
export type Opponent = "builder" | "random";
export interface Replay {
  game: State["game"];
  version: State["version"];
  players: string[];
  seed: number;
  events: GameEvent[];
}

export function initialState(players: string[], seed = 1): State {
  if (
    !Array.isArray(players) ||
    players.length < 2 ||
    players.length > 4 ||
    new Set(players).size !== players.length ||
    players.some((p) => typeof p !== "string" || !p.trim())
  ) {
    throw new Error("Expected 2–4 distinct player IDs");
  }
  if (!Number.isSafeInteger(seed))
    throw new Error("Seed must be a safe integer");
  return {
    game: "outpost-race",
    version: GAME_VERSION,
    seed,
    turn: 0,
    active: 0,
    maxTurns: players.length * 12,
    players: players.map((id) => ({
      id,
      wood: 1,
      gold: 0,
      outposts: 0,
      points: 0,
    })),
    history: [],
    winner: null,
    winners: [],
    ended: false,
  };
}

export function legalActions(state: State, playerId: string): Action[] {
  if (state.ended || state.players[state.active].id !== playerId) return [];
  const p = state.players[state.active];
  const actions: Action[] = [{ type: "gatherWood" }, { type: "mineGold" }];
  if (p.wood >= 2 && p.gold >= 1) actions.push({ type: "buildOutpost" });
  return actions;
}

export function observe(state: State, playerId: string): Observation {
  if (!state.players.some((p) => p.id === playerId))
    throw new Error("Unknown player");
  return {
    game: state.game,
    version: state.version,
    seed: state.seed,
    turn: state.turn,
    currentPlayer: state.players[state.active].id,
    ended: state.ended,
    winner: state.winner,
    winners: [...state.winners],
    players: state.players.map((p) => ({ ...p })),
    legalActions: legalActions(state, playerId),
  };
}

export function transition(
  state: State,
  playerId: string,
  action: Action,
): { state: State; events: GameEvent[] } {
  if (
    !action ||
    typeof action !== "object" ||
    !Object.hasOwn(action, "type") ||
    Reflect.ownKeys(action).length !== 1 ||
    !legalActions(state, playerId).some((a) => a.type === action.type)
  ) {
    throw new Error("Illegal action");
  }
  const players = state.players.map((p) => ({ ...p }));
  const p = players[state.active];
  if (action.type === "gatherWood") p.wood += 1;
  else if (action.type === "mineGold") p.gold += 1;
  else {
    p.wood -= 2;
    p.gold -= 1;
    p.outposts += 1;
    p.points += 3;
  }
  const turn = state.turn + 1;
  const ended = p.points >= 9 || turn >= state.maxTurns;
  const best = Math.max(...players.map((player) => player.points));
  const winners = ended
    ? players
        .filter((player) => player.points === best)
        .map((player) => player.id)
    : [];
  const event: GameEvent = { turn, playerId, action: action.type };
  return {
    state: {
      ...state,
      players,
      turn,
      active: (state.active + 1) % players.length,
      winner: winners.length === 1 ? winners[0] : null,
      winners,
      ended,
      history: [...state.history.map((e) => ({ ...e })), { ...event }],
    },
    events: [event],
  };
}

export function replay(
  players: string[],
  seed: number,
  events: GameEvent[],
): State {
  let state = initialState(players, seed);
  if (!Array.isArray(events) || events.length > state.maxTurns)
    throw new Error("Invalid replay length");
  for (const e of events) {
    if (!e || typeof e !== "object") throw new Error("Invalid replay event");
    const result = transition(state, e.playerId, { type: e.action });
    if (result.events[0].turn !== e.turn)
      throw new Error("Replay turn mismatch");
    state = result.state;
  }
  return state;
}

export function exportReplay(state: State): Replay {
  return {
    game: state.game,
    version: state.version,
    players: state.players.map((p) => p.id),
    seed: state.seed,
    events: state.history.map((e) => ({ ...e })),
  };
}

export function importReplay(input: unknown): State {
  if (!input || typeof input !== "object") throw new Error("Invalid replay");
  const data = input as Replay;
  if (data.game !== "outpost-race" || data.version !== GAME_VERSION)
    throw new Error("Unsupported game or replay version");
  if (!Number.isSafeInteger(data.seed)) throw new Error("Invalid replay seed");
  return replay(data.players, data.seed, data.events);
}

export const policies: Record<Opponent | "first", Policy> = {
  first: (_observation, actions) => actions[0],
  builder: (observation, actions) => {
    const self = observation.players.find(
      (p) => p.id === observation.currentPlayer,
    )!;
    const desired: ActionType =
      self.wood < 2
        ? "gatherWood"
        : self.gold < 1
          ? "mineGold"
          : "buildOutpost";
    return actions.find((a) => a.type === desired) ?? actions[0];
  },
  random: (observation, actions) => {
    // Stateless seed/turn mixing keeps policy results reproducible on replay/resume.
    let hash = 2166136261;
    for (const c of `${observation.seed}:${observation.turn}:${observation.currentPlayer}`) {
      hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    return actions[(hash >>> 0) % actions.length];
  },
};

export function runMatch(
  playerIds: string[],
  opponents: Record<string, Policy>,
  seed = 1,
): State {
  let state = initialState(playerIds, seed);
  while (!state.ended) {
    const id = state.players[state.active].id;
    if (typeof opponents[id] !== "function")
      throw new Error("Missing policy: " + id);
    state = transition(
      state,
      id,
      opponents[id](observe(state, id), legalActions(state, id)),
    ).state;
  }
  return state;
}

/** Complete AI turns until the human can act, or until the game ends. */
export function advanceOpponents(
  state: State,
  humanId: string,
  opponent: Opponent,
): State {
  if (!state.players.some((p) => p.id === humanId))
    throw new Error("Unknown human player");
  if (opponent !== "builder" && opponent !== "random")
    throw new Error("Unknown opponent");
  let next = state;
  while (!next.ended && next.players[next.active].id !== humanId) {
    const id = next.players[next.active].id;
    next = transition(
      next,
      id,
      policies[opponent](observe(next, id), legalActions(next, id)),
    ).state;
  }
  return next;
}
