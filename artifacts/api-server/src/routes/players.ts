import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, players } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:projectId/players", async (req, res): Promise<void> => {
  const params = schemas.ListPlayersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.projectId, params.data.projectId))
    .orderBy(desc(players.createdAt));
  res.json(schemas.ListPlayersResponse.parse(rows));
});

router.post("/projects/:projectId/players", async (req, res): Promise<void> => {
  const params = schemas.CreatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(players)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:projectId/players/:playerId", async (req, res): Promise<void> => {
  const params = schemas.UpdatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(players)
    .set(parsed.data)
    .where(
      and(
        eq(players.id, params.data.playerId),
        eq(players.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(schemas.UpdatePlayerResponse.parse(row));
});

router.delete("/projects/:projectId/players/:playerId", async (req, res): Promise<void> => {
  const params = schemas.DeletePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(players)
    .where(
      and(
        eq(players.id, params.data.playerId),
        eq(players.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

export default router;
