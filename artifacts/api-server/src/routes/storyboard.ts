import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, storyboardNodes } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, tryParseJsonObject } from "../lib/aiRouter";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/storyboard",
  async (req, res): Promise<void> => {
    const params = schemas.ListStoryboardNodesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(storyboardNodes)
        .where(eq(storyboardNodes.projectId, params.data.projectId))
        .orderBy(asc(storyboardNodes.id));
      res.json(schemas.ListStoryboardNodesResponse.parse(rows));
    } catch (err) {
      req.log.error({ err }, "list storyboard nodes failed");
      res.status(500).json({ error: "Failed to load storyboard" });
    }
  },
);

router.post(
  "/projects/:projectId/storyboard",
  async (req, res): Promise<void> => {
    const params = schemas.CreateStoryboardNodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.CreateStoryboardNodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      const [row] = await db
        .insert(storyboardNodes)
        .values({ ...parsed.data, projectId: params.data.projectId })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      req.log.error({ err }, "create storyboard node failed");
      res.status(500).json({ error: "Failed to create storyboard node" });
    }
  },
);

router.patch(
  "/projects/:projectId/storyboard/:nodeId",
  async (req, res): Promise<void> => {
    const params = schemas.UpdateStoryboardNodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.UpdateStoryboardNodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      const [row] = await db
        .update(storyboardNodes)
        .set(parsed.data)
        .where(
          and(
            eq(storyboardNodes.id, params.data.nodeId),
            eq(storyboardNodes.projectId, params.data.projectId),
          ),
        )
        .returning();
      if (!row) {
        res.status(404).json({ error: "Node not found" });
        return;
      }
      res.json(schemas.UpdateStoryboardNodeResponse.parse(row));
    } catch (err) {
      req.log.error({ err }, "update storyboard node failed");
      res.status(500).json({ error: "Failed to update storyboard node" });
    }
  },
);

router.delete(
  "/projects/:projectId/storyboard/:nodeId",
  async (req, res): Promise<void> => {
    const params = schemas.DeleteStoryboardNodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      await db
        .delete(storyboardNodes)
        .where(
          and(
            eq(storyboardNodes.id, params.data.nodeId),
            eq(storyboardNodes.projectId, params.data.projectId),
          ),
        );
      res.sendStatus(204);
    } catch (err) {
      req.log.error({ err }, "delete storyboard node failed");
      res.status(500).json({ error: "Failed to delete storyboard node" });
    }
  },
);

router.post(
  "/projects/:projectId/storyboard/:nodeId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceStoryboardNodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [n] = await db
      .select()
      .from(storyboardNodes)
      .where(
        and(
          eq(storyboardNodes.id, params.data.nodeId),
          eq(storyboardNodes.projectId, params.data.projectId),
        ),
      );
    if (!n) {
      res.status(404).json({ error: "Storyboard node not found" });
      return;
    }
    try {
      const text = await complete(req, {
        prompt: `Tighten this storyboard beat for a tabletop board game's player journey. Make the title vivid and the content concrete: what the player feels, sees, and decides. Keep the node type unchanged.

Existing node:
type: ${n.nodeType}
title: ${n.title}
content: ${n.content ?? ""}

Return ONLY a JSON object: {"title":"...","content":"..."}.
- title under 70 chars.
- content: 2-4 sentences, concrete and player-facing (no rules-speak unless this beat IS a rule turn).
Output JUST the JSON object.`,
        maxTokens: 600,
      });
      const obj = tryParseJsonObject<{ title?: string; content?: string }>(text);
      const update: Record<string, string> = {};
      if (obj?.title) update.title = String(obj.title);
      if (obj?.content) update.content = String(obj.content);
      if (Object.keys(update).length === 0) {
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }
      const [updated] = await db
        .update(storyboardNodes)
        .set(update)
        .where(eq(storyboardNodes.id, n.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance storyboard node failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

export default router;
