import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  projects,
  rules,
  entities,
  entityProperties,
  players,
  playtestSessions,
  playtestFeedback,
  changelogEntries,
  assets,
  notes,
  referenceGames,
} from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import {
  complete,
  AiProviderDisabledError,
  tryParseJsonObject,
} from "../lib/aiRouter";

const router: IRouter = Router();

router.post(
  "/projects/:projectId/design-advisor",
  async (req, res): Promise<void> => {
    const params = schemas.RunDesignAdvisorParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
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

    const [
      projectRules,
      projectEntities,
      projectPlayers,
      projectPlaytests,
      projectFeedback,
      projectChangelog,
      projectAssets,
      projectNotes,
      projectRefGames,
    ] = await Promise.all([
      db.select().from(rules).where(eq(rules.projectId, projectId)),
      db.select().from(entities).where(eq(entities.projectId, projectId)),
      db.select().from(players).where(eq(players.projectId, projectId)),
      db.select().from(playtestSessions).where(eq(playtestSessions.projectId, projectId)),
      db.select().from(playtestFeedback).where(eq(playtestFeedback.projectId, projectId)),
      db.select().from(changelogEntries).where(eq(changelogEntries.projectId, projectId)),
      db.select().from(assets).where(eq(assets.projectId, projectId)),
      db.select().from(notes).where(eq(notes.projectId, projectId)),
      db.select().from(referenceGames).where(eq(referenceGames.projectId, projectId)),
    ]);

    // Single JOIN query to get all entity properties - avoids N+1 pattern
    const allProps = projectEntities.length > 0
      ? await db
          .select({
            id: entityProperties.id,
            entityId: entityProperties.entityId,
            name: entityProperties.name,
            dataType: entityProperties.dataType,
            unit: entityProperties.unit,
            value: entityProperties.value,
            textValue: entityProperties.textValue,
            minValue: entityProperties.minValue,
            maxValue: entityProperties.maxValue,
            defaultValue: entityProperties.defaultValue,
          })
          .from(entityProperties)
          .innerJoin(entities, eq(entities.id, entityProperties.entityId))
          .where(eq(entities.projectId, projectId))
          .orderBy(asc(entityProperties.id))
      : [];

    let balanceScore = 80;
    const byName = new Map<string, number[]>();
    for (const p of allProps) {
      if (p.value !== null) {
        const arr = byName.get(p.name) ?? [];
        arr.push(p.value);
        byName.set(p.name, arr);
      }
    }
    for (const vals of byName.values()) {
      if (vals.length < 2) continue;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const spread = max - min;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (mean !== 0 && spread / Math.abs(mean) > 1.5) balanceScore -= 8;
    }
    balanceScore = Math.max(0, Math.min(100, Math.round(balanceScore)));

    const experimentalRules = projectRules.filter(
      (r) =>
        r.category?.toLowerCase().includes("experimental") ||
        r.category?.toLowerCase().includes("draft"),
    );

    const avgFun =
      projectFeedback.length > 0
        ? (
            projectFeedback.reduce((s, f) => s + (f.funScore ?? 0), 0) /
            projectFeedback.length
          ).toFixed(1)
        : "N/A";
    const avgBalance =
      projectFeedback.length > 0
        ? (
            projectFeedback.reduce((s, f) => s + (f.balanceScore ?? 0), 0) /
            projectFeedback.length
          ).toFixed(1)
        : "N/A";

    const gameContext = `
PROJECT: "${project.name}"
Design Phase: ${project.designPhase ?? "concept"}
Game Type: ${project.gameType ?? "not set"}
Genre: ${project.genre ?? "not set"}
Player Count: ${project.playerCount ?? "not set"}
Duration: ${project.targetDuration ?? "not set"}
Win Condition: ${project.winCondition ?? "not set"}
Narrative: ${(project.narrative ?? "").slice(0, 500)}

RULES (${projectRules.length} total, ${experimentalRules.length} experimental/draft):
${projectRules
  .slice(0, 30)
  .map((r) => `- [${r.category ?? "core"}] ${r.title}: ${(r.content ?? "").slice(0, 120)}`)
  .join("\n")}

COMPONENTS (${projectEntities.length} total):
${projectEntities
  .slice(0, 30)
  .map(
    (e) =>
      `- ${e.name} (${e.type ?? "unknown"}${e.subtype ? "/" + e.subtype : ""}): ${(e.description ?? "").slice(0, 100)}`,
  )
  .join("\n")}

PLAYERS (${projectPlayers.length} defined):
${projectPlayers
  .slice(0, 10)
  .map(
    (p) =>
      `- ${p.name} (${p.role ?? "player"}): strategy=${p.strategy ?? "?"}, archetype=${p.archetype ?? "?"}`,
  )
  .join("\n")}

ASSETS (${projectAssets.length} total):
${projectAssets
  .slice(0, 20)
  .map((a) => `- ${a.name} (${a.kind}) qty=${a.quantity ?? 1} status=${a.status ?? "draft"}`)
  .join("\n")}

PLAYTESTS (${projectPlaytests.length} sessions):
${projectPlaytests
  .slice(0, 10)
  .map(
    (s) =>
      `- ${s.date ? new Date(s.date).toLocaleDateString() : "?"}: ${s.playerCount ?? "?"} players, ${s.durationMinutes ?? "?"}min, rating=${s.rating ?? "?"}${s.issues ? ", issues: " + String(s.issues).slice(0, 80) : ""}`,
  )
  .join("\n")}

FEEDBACK (${projectFeedback.length} responses, avg fun=${avgFun}, avg balance=${avgBalance}):
${projectFeedback
  .slice(0, 8)
  .map(
    (f) =>
      `- ${f.respondentName ?? "anon"}: fun=${f.funScore ?? "?"}, balance=${f.balanceScore ?? "?"}, clarity=${f.clarityScore ?? "?"}: ${(f.whatWorked ?? "").slice(0, 80)}`,
  )
  .join("\n")}

BALANCE SCORE: ${balanceScore}/100

REFERENCE GAMES (${projectRefGames.length}):
${projectRefGames
  .slice(0, 5)
  .map((g) => `- ${g.name}: borrowing="${g.borrowing ?? ""}", avoiding="${g.avoiding ?? ""}"`)
  .join("\n")}

NOTES (${projectNotes.length}):
${projectNotes
  .slice(0, 5)
  .map((n) => `- ${n.title ?? "Untitled"}: ${(n.content ?? "").slice(0, 100)}`)
  .join("\n")}

RECENT CHANGES (${projectChangelog.length} entries):
${projectChangelog
  .slice(0, 10)
  .map((c) => `- ${c.action} ${c.entityKind ?? ""}: ${c.summary ?? ""}`)
  .join("\n")}
`.trim();

    const prompt = `You are an expert board game design consultant. Analyze this game design comprehensively and provide actionable feedback.

${gameContext}

Provide your analysis as a single JSON object with exactly this structure (no markdown, no preamble, just the JSON):
{
  "strengths": ["strength 1", "strength 2", ...],
  "issues": [
    {
      "title": "Short issue title",
      "description": "Why this is a problem and what to do about it",
      "priority": "high" | "medium" | "low",
      "estimatedHours": number (estimate of design hours to resolve),
      "suggestedTab": "rules" | "entities" | "players" | "playtest" | "assets" | "balance" | "overview" (which part of the studio to work in)
    }
  ],
  "recommendations": [
    {
      "action": "What to do",
      "why": "Why this matters for the game",
      "hoursNeeded": number,
      "priority": 1 (highest priority first),
      "suggestedTab": "rules" | "entities" | "players" | "playtest" | "assets" | "balance" | "overview"
    }
  ],
  "nextMilestone": {
    "name": "e.g. Move to Beta",
    "requirements": ["requirement 1", "requirement 2", ...],
    "progressPercentage": number (0-100, how close the game is to this milestone)
  }
}

Guidelines:
- Be specific and actionable — reference actual rules, components, and players by name.
- Strengths should highlight what's working well based on actual data (playtest feedback, balance scores, game structure).
- Issues should be prioritized by impact on player experience.
- Recommendations should be ordered by priority (1 = most important).
- The next milestone should reflect the current design phase and what's needed to advance.
- If there is little data (few rules, no playtests), focus on what foundational work is needed.
- Keep strengths to 3-5 items, issues to 3-6 items, recommendations to 4-6 items.
- Each recommendation should include a realistic time estimate.

Output ONLY the JSON object.`;

    try {
      const text = await complete(req, { prompt, maxTokens: 3000 });
      const parsed = tryParseJsonObject<{
        strengths?: string[];
        issues?: Array<{
          title?: string;
          description?: string;
          priority?: string;
          estimatedHours?: number;
          suggestedTab?: string;
        }>;
        recommendations?: Array<{
          action?: string;
          why?: string;
          hoursNeeded?: number;
          priority?: number;
          suggestedTab?: string;
        }>;
        nextMilestone?: {
          name?: string;
          requirements?: string[];
          progressPercentage?: number;
        };
      }>(text);

      if (!parsed || (!parsed.strengths && !parsed.issues && !parsed.recommendations)) {
        req.log.warn(
          { aiTextSnippet: text.slice(0, 500) },
          "design-advisor: AI returned no usable fields",
        );
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }

      const response = {
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((s): s is string => typeof s === "string")
          : [],
        issues: Array.isArray(parsed.issues)
          ? parsed.issues
              .filter((i) => i && typeof i.title === "string" && typeof i.description === "string")
              .map((i) => ({
                title: i.title!,
                description: i.description!,
                priority: (["high", "medium", "low"].includes(i.priority ?? "") ? i.priority : "medium") as "high" | "medium" | "low",
                ...(typeof i.estimatedHours === "number" ? { estimatedHours: i.estimatedHours } : {}),
                ...(typeof i.suggestedTab === "string" ? { suggestedTab: i.suggestedTab } : {}),
              }))
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
              .filter((r) => r && typeof r.action === "string" && typeof r.why === "string")
              .map((r) => ({
                action: r.action!,
                why: r.why!,
                priority: typeof r.priority === "number" ? r.priority : 99,
                ...(typeof r.hoursNeeded === "number" ? { hoursNeeded: r.hoursNeeded } : {}),
                ...(typeof r.suggestedTab === "string" ? { suggestedTab: r.suggestedTab } : {}),
              }))
              .sort((a, b) => a.priority - b.priority)
          : [],
        nextMilestone: parsed.nextMilestone
          ? {
              name: parsed.nextMilestone.name ?? "Next Phase",
              requirements: Array.isArray(parsed.nextMilestone.requirements)
                ? parsed.nextMilestone.requirements.filter((r): r is string => typeof r === "string")
                : [],
              progressPercentage:
                typeof parsed.nextMilestone.progressPercentage === "number"
                  ? Math.max(0, Math.min(100, Math.round(parsed.nextMilestone.progressPercentage)))
                  : 0,
            }
          : { name: "Define game foundations", requirements: ["Add rules", "Define components"], progressPercentage: 0 },
      };

      res.json(response);
    } catch (err) {
      if (err instanceof AiProviderDisabledError) {
        res.status(503).json({
          error: err.message,
          provider: err.provider,
          providerDisabled: true,
        });
        return;
      }
      req.log.error({ err }, "design-advisor failed");
      res.status(500).json({ error: "Design analysis failed" });
    }
  },
);

export default router;
