# Canonical Game Engine Contract

TypeScript-first, framework-neutral, pure deterministic core.

```ts
interface GameDefinition<S, A, O> {
  id: string;
  version: string;
  initialize(players: string[], seed: number): S;
  observe(state: S, player: string): O;
  legalActions(state: S, player: string): A[];
  transition(state: S, player: string, action: A): {
    state: S;
    events: GameEvent[];
  };
  currentActors(state: S): string[];
  result(state: S): GameResult | null;
}
```

## Guarantees
Seeded RNG state is part of game state. No Math.random, wall clock, network or AI calls inside transitions. Every legal action has validated parameters; invalid actions have no side effects. Replay requires same game package hash, seed and action sequence and compares state hashes. Player observation is the only source for AI policy inputs and client private views.

## DSL
Versioned YAML/JSON with typed setup, phases, actors, resource types, action preconditions/effects, scoring, termination, board geometry and component manifests. Compiler resolves only registered mechanics; unsupported expressions produce explicit errors and human review requests.

## Test strategy
Property-based invariants, example scenarios, replay determinism, seat permutation, invalid-action rejection, hidden information boundaries, event persistence, and performance benchmarks. Add simultaneous-action and interrupt support only through versioned extensions.
