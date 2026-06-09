import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, playtestSessions, playtestFeedback, projects } from "@workspace/db";
import type { InsertPlaytestSession } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import crypto from "node:crypto";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/playtest-sessions",
  async (req, res): Promise<void> => {
    const params = schemas.ListPlaytestSessionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(playtestSessions)
        .where(eq(playtestSessions.projectId, params.data.projectId))
        .orderBy(desc(playtestSessions.date));
      res.json(schemas.ListPlaytestSessionsResponse.parse(rows));
    } catch (err) {
      req.log.error({ err }, "list playtest sessions failed");
      res.status(500).json({ error: "Failed to load playtest sessions" });
    }
  },
);

router.post(
  "/projects/:projectId/playtest-sessions",
  async (req, res): Promise<void> => {
    const params = schemas.CreatePlaytestSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.CreatePlaytestSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      const values: InsertPlaytestSession = {
        projectId: params.data.projectId,
        ...parsed.data,
        ...(parsed.data.date ? { date: new Date(parsed.data.date) } : {}),
      };
      const [row] = await db.insert(playtestSessions).values(values).returning();
      res.status(201).json(row);
    } catch (err) {
      req.log.error({ err }, "create playtest session failed");
      res.status(500).json({ error: "Failed to create playtest session" });
    }
  },
);

router.patch(
  "/projects/:projectId/playtest-sessions/:sessionId",
  async (req, res): Promise<void> => {
    const params = schemas.UpdatePlaytestSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.UpdatePlaytestSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      const update: Partial<InsertPlaytestSession> = {
        ...parsed.data,
        ...(parsed.data.date ? { date: new Date(parsed.data.date) } : {}),
      };
      const [row] = await db
        .update(playtestSessions)
        .set(update)
        .where(
          and(
            eq(playtestSessions.id, params.data.sessionId),
            eq(playtestSessions.projectId, params.data.projectId),
          ),
        )
        .returning();
      if (!row) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.json(schemas.UpdatePlaytestSessionResponse.parse(row));
    } catch (err) {
      req.log.error({ err }, "update playtest session failed");
      res.status(500).json({ error: "Failed to update playtest session" });
    }
  },
);

router.delete(
  "/projects/:projectId/playtest-sessions/:sessionId",
  async (req, res): Promise<void> => {
    const params = schemas.DeletePlaytestSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      await db
        .delete(playtestSessions)
        .where(
          and(
            eq(playtestSessions.id, params.data.sessionId),
            eq(playtestSessions.projectId, params.data.projectId),
          ),
        );
      res.sendStatus(204);
    } catch (err) {
      req.log.error({ err }, "delete playtest session failed");
      res.status(500).json({ error: "Failed to delete playtest session" });
    }
  },
);

router.get(
  "/projects/:projectId/playtest-feedback",
  async (req, res): Promise<void> => {
    const params = schemas.ListPlaytestFeedbackParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(playtestFeedback)
        .where(eq(playtestFeedback.projectId, params.data.projectId))
        .orderBy(desc(playtestFeedback.createdAt));
      res.json(schemas.ListPlaytestFeedbackResponse.parse(rows));
    } catch (err) {
      req.log.error({ err }, "list playtest feedback failed");
      res.status(500).json({ error: "Failed to load playtest feedback" });
    }
  },
);

router.get(
  "/projects/:projectId/playtest-feedback/share",
  async (req, res): Promise<void> => {
    const params = schemas.GetPlaytestShareLinkParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, params.data.projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    // Deterministic share token per project
    const token = crypto
      .createHash("sha256")
      .update(`gameforge-feedback-${project.id}`)
      .digest("hex")
      .slice(0, 16);
    const url = `/feedback/${token}`;
    res.json(schemas.GetPlaytestShareLinkResponse.parse({ token, url }));
  },
);

export default router;
