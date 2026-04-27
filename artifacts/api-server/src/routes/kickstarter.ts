import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  projects,
  entities,
  rules,
  players,
  notes,
  kickstarterAssets,
} from "@workspace/db";
import {
  startGeneration,
  getGenerationStatus,
  type GammaGenerateOptions,
} from "../lib/gammaClient";

const router: IRouter = Router();

const KIND_LABELS: Record<string, string> = {
  rulebook: "Rulebook",
  "pitch-deck": "Pitch deck",
  onepager: "One-pager",
  "art-bible": "Art bible",
};

function buildBrief(
  project: {
    name: string;
    description: string | null;
    gameType: string | null;
    genre: string | null;
    playerCount: string | null;
    targetDuration: string | null;
    complexityScore: number | null;
    blueprint: string | null;
  },
  ents: Array<{ name: string; description: string | null; type: string | null }>,
  rls: Array<{ title: string; content: string; category: string | null }>,
  pls: Array<{ name: string; description: string | null; role: string | null }>,
  nts: Array<{ title: string | null; content: string | null }>,
): string {
  const lines: string[] = [];
  lines.push(`# ${project.name}`);
  const stats: string[] = [];
  if (project.gameType) stats.push(`**Type:** ${project.gameType}`);
  if (project.genre) stats.push(`**Genre:** ${project.genre}`);
  if (project.playerCount) stats.push(`**Players:** ${project.playerCount}`);
  if (project.targetDuration) stats.push(`**Time:** ${project.targetDuration}`);
  if (project.complexityScore != null) stats.push(`**Complexity:** ${project.complexityScore}/10`);
  if (stats.length) lines.push(`\n## At a glance\n${stats.join(" · ")}`);
  if (project.description) lines.push(`\n## Concept\n${project.description}`);
  if (project.blueprint) lines.push(`\n## Design blueprint\n${project.blueprint.slice(0, 1500)}`);

  if (ents.length) {
    lines.push(`\n## Components & entities`);
    for (const e of ents.slice(0, 30)) {
      const k = e.type ? ` (${e.type})` : "";
      lines.push(`- **${e.name}**${k}${e.description ? `: ${e.description}` : ""}`);
    }
  }
  if (rls.length) {
    lines.push(`\n## Rules`);
    const byCat = new Map<string, typeof rls>();
    for (const r of rls) {
      const ph = r.category ?? "General";
      const arr = byCat.get(ph) ?? [];
      arr.push(r);
      byCat.set(ph, arr);
    }
    for (const [cat, arr] of byCat) {
      lines.push(`### ${cat}`);
      for (const r of arr.slice(0, 12)) {
        lines.push(`- **${r.title}**: ${r.content.slice(0, 240)}`);
      }
    }
  }
  if (pls.length) {
    lines.push(`\n## Player roles`);
    for (const p of pls.slice(0, 12)) {
      const role = p.role ? ` (${p.role})` : "";
      lines.push(`- **${p.name}**${role}${p.description ? `: ${p.description}` : ""}`);
    }
  }
  if (nts.length) {
    lines.push(`\n## Designer notes`);
    for (const n of nts.slice(0, 8)) {
      const t = n.title ?? "Note";
      lines.push(`- **${t}**${n.content ? `: ${n.content.slice(0, 240)}` : ""}`);
    }
  }
  return lines.join("\n");
}

function gammaOptionsFor(
  kind: string,
  brief: string,
  project: { name: string },
): GammaGenerateOptions {
  if (kind === "rulebook") {
    return {
      inputText: brief,
      textMode: "generate",
      format: "document",
      additionalInstructions:
        `Write a publishable rulebook for the tabletop game "${project.name}". Use clear hierarchical sections: Overview, Components, Setup, Turn Structure, Actions, Scoring, Game End, Variants, Glossary. Use numbered steps and bullet lists. Keep tone instructional and confident. Generate supporting illustrative artwork that matches the game's vibe.`,
      numCards: 14,
      cardSplit: "auto",
      exportAs: "pdf",
      textOptions: { amount: "detailed", tone: "instructional, clear" },
      imageOptions: { source: "aiGenerated" },
      cardOptions: { dimensions: "letter" },
    };
  }
  if (kind === "pitch-deck") {
    return {
      inputText: brief,
      textMode: "generate",
      format: "presentation",
      additionalInstructions:
        `Build a Kickstarter-ready pitch deck for "${project.name}". Slides: Hook, Game at a glance (players/time/age/weight), The world, How to play (3 slides), Why it's different, Components reveal, Stretch goals teaser, Pledge tiers placeholder, About the designer, Call to back. Punchy headlines and confident copy. Generate supporting artwork that matches the game's vibe.`,
      numCards: 12,
      cardSplit: "auto",
      exportAs: "pdf",
      textOptions: { amount: "medium", tone: "confident, energetic" },
      imageOptions: { source: "aiGenerated" },
      cardOptions: { dimensions: "16x9" },
    };
  }
  if (kind === "onepager") {
    return {
      inputText: brief,
      textMode: "generate",
      format: "document",
      additionalInstructions:
        `One-page sell sheet for "${project.name}" aimed at retailers and publishers. Sections: Title + Tagline, At-a-glance stats, 1-paragraph pitch, 3 unique selling points, 3 differentiators vs comparable titles, Designer credit. Tight and confident. Include one hero illustration.`,
      numCards: 1,
      cardSplit: "auto",
      exportAs: "pdf",
      textOptions: { amount: "brief", tone: "confident, professional" },
      imageOptions: { source: "aiGenerated" },
      cardOptions: { dimensions: "letter" },
    };
  }
  // art-bible
  return {
    inputText: brief,
    textMode: "generate",
    format: "presentation",
    additionalInstructions:
      `Visual art bible for "${project.name}". For each major game element generate a labelled board featuring concept art and a short style note. Cover: Box cover hero, Key character art, Component art (cards, tokens, board), Color palette, Typography. Aesthetic must match the game's stated vibe and tone exactly.`,
    numCards: 10,
    cardSplit: "auto",
    exportAs: "pdf",
    textOptions: { amount: "brief", tone: "art-direction, descriptive" },
    imageOptions: { source: "aiGenerated" },
    cardOptions: { dimensions: "16x9" },
  };
}

router.get(
  "/projects/:projectId/kickstarter",
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const rows = await db
      .select()
      .from(kickstarterAssets)
      .where(eq(kickstarterAssets.projectId, projectId))
      .orderBy(desc(kickstarterAssets.createdAt))
      .limit(100);
    res.json(rows);
  },
);

router.post(
  "/projects/:projectId/kickstarter/generate",
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const kind = String(req.body?.kind ?? "");
    if (!["rulebook", "pitch-deck", "onepager", "art-bible"].includes(kind)) {
      res.status(400).json({ error: "Invalid kind" });
      return;
    }
    if (!process.env.GAMMA_API_KEY) {
      res.status(503).json({ error: "Gamma is not configured. Set GAMMA_API_KEY." });
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [es, rs, ps, ns] = await Promise.all([
      db.select().from(entities).where(eq(entities.projectId, projectId)),
      db.select().from(rules).where(eq(rules.projectId, projectId)),
      db.select().from(players).where(eq(players.projectId, projectId)),
      db.select().from(notes).where(eq(notes.projectId, projectId)),
    ]);

    const brief = buildBrief(project, es, rs, ps, ns);
    const title = `${project.name} — ${KIND_LABELS[kind] ?? kind}`;

    const [row] = await db
      .insert(kickstarterAssets)
      .values({
        projectId,
        kind,
        title,
        status: "pending",
      })
      .returning();

    try {
      const opts = gammaOptionsFor(kind, brief, project);
      const gen = await startGeneration(opts);
      const [updated] = await db
        .update(kickstarterAssets)
        .set({
          generationId: gen.generationId,
          status: "processing",
          meta: { brief: brief.slice(0, 4000) },
        })
        .where(eq(kickstarterAssets.id, row.id))
        .returning();
      res.json(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const [updated] = await db
        .update(kickstarterAssets)
        .set({ status: "failed", errorMessage: msg })
        .where(eq(kickstarterAssets.id, row.id))
        .returning();
      res.status(502).json(updated ?? { error: msg });
    }
  },
);

router.post(
  "/projects/:projectId/kickstarter/:assetId/refresh",
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    const assetId = Number(req.params.assetId);
    if (!Number.isFinite(projectId) || !Number.isFinite(assetId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(kickstarterAssets)
      .where(eq(kickstarterAssets.id, assetId));
    if (!row || row.projectId !== projectId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (row.status === "completed" || row.status === "failed" || !row.generationId) {
      res.json(row);
      return;
    }
    try {
      const status = await getGenerationStatus(row.generationId);
      const completed = status.status === "completed";
      const failed = status.status === "failed";
      const [updated] = await db
        .update(kickstarterAssets)
        .set({
          status: completed ? "completed" : failed ? "failed" : "processing",
          gammaUrl: status.gammaUrl ?? row.gammaUrl,
          pdfUrl: status.pdfUrl ?? row.pdfUrl,
          pptxUrl: status.pptxUrl ?? row.pptxUrl,
          errorMessage: status.error?.message ?? row.errorMessage,
          completedAt: completed || failed ? new Date() : row.completedAt,
        })
        .where(eq(kickstarterAssets.id, assetId))
        .returning();
      res.json(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const [updated] = await db
        .update(kickstarterAssets)
        .set({
          status: "failed",
          errorMessage: msg,
          completedAt: new Date(),
        })
        .where(eq(kickstarterAssets.id, assetId))
        .returning();
      res.status(502).json(updated ?? { ...row, status: "failed", errorMessage: msg });
    }
  },
);

router.delete(
  "/projects/:projectId/kickstarter/:assetId",
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    const assetId = Number(req.params.assetId);
    if (!Number.isFinite(projectId) || !Number.isFinite(assetId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const deleted = await db
      .delete(kickstarterAssets)
      .where(
        and(
          eq(kickstarterAssets.id, assetId),
          eq(kickstarterAssets.projectId, projectId),
        ),
      )
      .returning({ id: kickstarterAssets.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  },
);

export default router;
