import { useState } from "react";
import { Link } from "wouter";
import {
  Gamepad2,
  Trees,
  Coins,
  Castle,
  Download,
  RotateCcw,
} from "lucide-react";
import {
  initialState,
  advanceOpponents,
  legalActions,
  transition,
  exportReplay,
  importReplay,
  type State,
  type Action,
  type Opponent,
} from "@workspace/game-core";
import { Button } from "@/components/ui/button";

const labels = {
  gatherWood: "Gather wood",
  mineGold: "Mine gold",
  buildOutpost: "Build outpost",
};
interface Session {
  state: State;
  humanId: string;
  opponent: Opponent;
}
function newSession(
  count: number,
  seat: number,
  seed: number,
  opponent: Opponent,
): Session {
  const ids = Array.from({ length: count }, (_, i) =>
    i === seat ? "You" : `AI ${i + 1}`,
  );
  return {
    state: advanceOpponents(initialState(ids, seed), "You", opponent),
    humanId: "You",
    opponent,
  };
}
function restore(key: string): Session {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      const state = importReplay(saved.replay);
      if (saved.opponent !== "builder" && saved.opponent !== "random")
        throw new Error("Unknown opponent");
      return {
        state: advanceOpponents(state, "You", saved.opponent),
        humanId: "You",
        opponent: saved.opponent,
      };
    }
  } catch {
    /* A stale or invalid local save cannot enter the engine. */
  }
  return newSession(2, 0, 42, "builder");
}

export function DigitalPlay({ projectId }: { projectId?: number }) {
  const storageKey = `boardforge:outpost-race:0.2:${projectId ?? "demo"}`;
  const [session, setSession] = useState<Session>(() => restore(storageKey));
  const [count, setCount] = useState(session.state.players.length);
  const [seat, setSeat] = useState(
    session.state.players.findIndex((p) => p.id === "You"),
  );
  const [seed, setSeed] = useState(String(session.state.seed));
  const [opponent, setOpponent] = useState<Opponent>(session.opponent);
  const [notice, setNotice] = useState("");
  const { state, humanId } = session;
  const actions = legalActions(state, humanId);
  const save = (next: Session) => {
    setSession(next);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          replay: exportReplay(next.state),
          opponent: next.opponent,
        }),
      );
      setNotice("Game saved on this device.");
    } catch {
      setNotice("Game continues, but this browser could not save it.");
    }
  };
  const act = (action: Action) => {
    try {
      const next = transition(state, humanId, action).state;
      save({
        ...session,
        state: advanceOpponents(next, humanId, session.opponent),
      });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to play action",
      );
    }
  };
  const start = () => {
    if (!seed.trim() || !Number.isSafeInteger(Number(seed))) {
      setNotice("Enter a whole-number seed.");
      return;
    }
    save(newSession(count, Math.min(seat, count - 1), Number(seed), opponent));
  };
  const download = () => {
    const replay = exportReplay(state);
    if (JSON.stringify(importReplay(replay)) !== JSON.stringify(state)) {
      setNotice("Replay verification failed.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(replay, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `outpost-race-${state.seed}-turn-${state.turn}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Replay verified and exported.");
  };
  const result = state.ended
    ? state.winner
      ? `${state.winner === "You" ? "You win" : `${state.winner} wins`}!`
      : `Draw: ${state.winners.join(", ")}`
    : "Your turn";
  return (
    <section
      className="mx-auto max-w-5xl space-y-6 p-4 md:p-8"
      aria-label="Outpost Race game"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-500">
            <Gamepad2 size={18} /> BOARDFORGE · DIGITAL PLAY
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Outpost Race</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Gather resources. Build your frontier. Race the AI to three
            outposts.
          </p>
        </div>
        {projectId === undefined && (
          <Link href="/" className="text-sm underline">
            Back to BoardForge
          </Link>
        )}
      </header>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <h2 className="font-semibold">How to play</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each turn, gather 1 wood, mine 1 gold, or spend 2 wood + 1 gold to
          build an outpost worth 3 points. First to 9 points wins. After 12
          turns per player, the highest score wins; tied leaders draw. All
          resources are public.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Original reference game · Local human-versus-AI · This plays Outpost
          Race, not your project's authored rules.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label className="space-y-1 text-sm">
          Players
          <select
            aria-label="Players"
            className="block rounded border bg-background p-2"
            value={count}
            onChange={(e) => {
              setCount(Number(e.target.value));
              setSeat(0);
            }}
          >
            {[2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Your seat
          <select
            aria-label="Your seat"
            className="block rounded border bg-background p-2"
            value={seat}
            onChange={(e) => setSeat(Number(e.target.value))}
          >
            {Array.from({ length: count }, (_, i) => (
              <option value={i} key={i}>
                Seat {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Opponent
          <select
            aria-label="Opponent"
            className="block rounded border bg-background p-2"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value as Opponent)}
          >
            <option value="builder">Builder</option>
            <option value="random">Seeded random</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Seed
          <input
            aria-label="Seed"
            className="block w-28 rounded border bg-background p-2"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
        </label>
        <Button variant="outline" onClick={start}>
          <RotateCcw className="mr-2 h-4 w-4" />
          New game
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Setup changes apply when you start a new game. Starting again replaces
          this device's saved match.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="status" aria-live="polite">
          <h2 className="text-xl font-semibold">{result}</h2>
          <p className="text-sm text-muted-foreground">
            Turn {state.turn} / {state.maxTurns} ·{" "}
            {session.opponent === "builder" ? "Builder AI" : "Seeded random AI"}{" "}
            · Seed {state.seed}
          </p>
        </div>
        <Button variant="outline" onClick={download}>
          <Download className="mr-2 h-4 w-4" />
          Export verified replay
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {state.players.map((player, i) => (
          <article
            key={player.id}
            aria-label={`${player.id} resources`}
            className={`rounded-xl border p-5 ${player.id === humanId ? "border-emerald-500/50 bg-emerald-500/5" : "bg-card"}`}
          >
            <div className="flex justify-between">
              <h3 className="font-semibold">
                {player.id}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · Seat {i + 1}
                </span>
              </h3>
              <strong>{player.points} / 9 points</strong>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                [Trees, "Wood", player.wood],
                [Coins, "Gold", player.gold],
                [Castle, "Outposts", player.outposts],
              ].map(([Icon, label, value]) => {
                const ResourceIcon = Icon as typeof Trees;
                return (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-background/60 p-3"
                  >
                    <ResourceIcon className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                    <dt className="text-xs text-muted-foreground">
                      {String(label)}
                    </dt>
                    <dd className="text-2xl font-semibold">{String(value)}</dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-3" aria-label="Your actions">
        {(["gatherWood", "mineGold", "buildOutpost"] as const).map((type) => (
          <Button
            key={type}
            onClick={() => act({ type })}
            disabled={!actions.some((a) => a.type === type)}
          >
            {labels[type]}
            {type === "buildOutpost" ? " · 2 wood + 1 gold" : ""}
          </Button>
        ))}
      </div>
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {notice}
      </p>
      <details className="rounded-xl border p-4" open>
        <summary className="cursor-pointer font-semibold">
          Turn history ({state.history.length})
        </summary>
        <ol className="mt-3 max-h-60 space-y-1 overflow-y-auto text-sm text-muted-foreground">
          {state.history.length === 0 ? (
            <li>No moves yet. You go first.</li>
          ) : (
            [...state.history].reverse().map((e) => (
              <li key={e.turn}>
                {e.turn}. {e.playerId}: {labels[e.action]}
              </li>
            ))
          )}
        </ol>
      </details>
    </section>
  );
}
