import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projects, entities, rules, players } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { stream } from "../lib/aiRouter";

const router: IRouter = Router();

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
  }
  return sorted[base]!;
}

router.post(
  "/projects/:projectId/simulator/run",
  async (req, res): Promise<void> => {
    const params = schemas.RunSimulatorParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.RunSimulatorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const iters = Math.min(Math.max(parsed.data.iterations, 50), 5000);
    const turns = Math.min(Math.max(parsed.data.turns, 5), 100);
    const start = parsed.data.startingResources ?? 10;
    const income = parsed.data.incomePerTurn ?? 3;
    const upkeep = parsed.data.upkeepPerTurn ?? 2;
    const rand = parsed.data.randomness ?? 1.5;

    const perTurn: number[][] = Array.from({ length: turns }, () => []);
    const finals: number[] = [];
    let bankrupt = 0;
    for (let i = 0; i < iters; i += 1) {
      let res2 = start;
      let dead = false;
      for (let t = 0; t < turns; t += 1) {
        const noise = (Math.random() * 2 - 1) * rand;
        res2 += income - upkeep + noise;
        if (res2 < 0) {
          dead = true;
          res2 = 0;
        }
        perTurn[t]!.push(res2);
      }
      finals.push(res2);
      if (dead) bankrupt += 1;
    }
    const finalsSorted = [...finals].sort((a, b) => a - b);
    const meanFinal =
      finalsSorted.reduce((s, v) => s + v, 0) / finalsSorted.length;
    const bankruptRate = bankrupt / iters;
    let healthScore = 100;
    healthScore -= bankruptRate * 80;
    if (meanFinal < 5) healthScore -= 20;
    if (meanFinal < 0) healthScore -= 30;
    if (rand > 4) healthScore -= 10;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
    const verdict =
      healthScore > 70
        ? "Healthy economy"
        : healthScore > 40
          ? "Caution — tighten balance"
          : "Broken — rework parameters";

    const turnsOut = perTurn.map((arr, t) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return {
        turn: t + 1,
        p10: Math.round(quantile(sorted, 0.1) * 100) / 100,
        p50: Math.round(quantile(sorted, 0.5) * 100) / 100,
        p90: Math.round(quantile(sorted, 0.9) * 100) / 100,
      };
    });

    res.json(
      schemas.RunSimulatorResponse.parse({
        healthScore,
        verdict,
        meanFinal: Math.round(meanFinal * 100) / 100,
        bankruptRate: Math.round(bankruptRate * 1000) / 1000,
        turns: turnsOut,
      }),
    );
  },
);

router.post(
  "/projects/:projectId/simulator/playthrough",
  async (req, res): Promise<void> => {
    const params = schemas.SimulatorPlaythroughParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.SimulatorPlaythroughBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const projectId = params.data.projectId;
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [es, rs, ps] = await Promise.all([
      db.select().from(entities).where(eq(entities.projectId, projectId)),
      db.select().from(rules).where(eq(rules.projectId, projectId)),
      db.select().from(players).where(eq(players.projectId, projectId)),
    ]);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const ctx: string[] = [];
    ctx.push(`Game: ${project.name}${project.gameType ? ` (${project.gameType})` : ""}`);
    if (project.description) ctx.push(`Description: ${project.description}`);
    if (es.length)
      ctx.push(
        `Entities: ${es.slice(0, 12).map((e) => `${e.name} [${e.type}]`).join(", ")}`,
      );
    if (rs.length)
      ctx.push(
        `Rules: ${rs.slice(0, 8).map((r) => r.title).join("; ")}`,
      );
    if (ps.length)
      ctx.push(
        `Player archetypes: ${ps.map((p) => p.name).join(", ")}`,
      );

    const system = `You are a board-game playthrough narrator. Write a vivid, turn-by-turn dramatized walkthrough of a single game session that highlights key decisions, dice rolls, and the moment-to-moment tension. Use markdown headings (## Turn N) and short paragraphs. End with a "Designer Notes" section flagging at least 3 specific balance or pacing observations.`;

    const userMsg = `Project context:
${ctx.join("\n")}

${parsed.data.focus ? `Focus on: ${parsed.data.focus}` : ""}

Narrate a complete 6-8 turn playthrough between 2-3 archetypes.`;

    try {
      await stream(req, {
        kind: "narrative",
        system,
        messages: [{ role: "user", content: userMsg }],
        maxTokens: 4096,
        onChunk: (piece) => {
          res.write(`data: ${JSON.stringify({ content: piece })}\n\n`);
        },
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      req.log.error({ err }, "playthrough failed");
      res.write(`data: ${JSON.stringify({ error: "Playthrough failed" })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  },
);

export default router;
