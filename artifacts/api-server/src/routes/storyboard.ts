import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, storyboardNodes } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/storyboard",
  async (req, res): Promise<void> => {
    const params = schemas.ListStoryboardNodesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(storyboardNodes)
      .where(eq(storyboardNodes.projectId, params.data.projectId))
      .orderBy(asc(storyboardNodes.id));
    res.json(schemas.ListStoryboardNodesResponse.parse(rows));
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
    const [row] = await db
      .insert(storyboardNodes)
      .values({ ...parsed.data, projectId: params.data.projectId })
      .returning();
    res.status(201).json(row);
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
    await db
      .delete(storyboardNodes)
      .where(
        and(
          eq(storyboardNodes.id, params.data.nodeId),
          eq(storyboardNodes.projectId, params.data.projectId),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
