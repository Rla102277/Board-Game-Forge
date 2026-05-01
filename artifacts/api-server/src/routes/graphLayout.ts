import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, graphLayouts } from "@workspace/db";

const router: IRouter = Router();

function isValidPositions(val: unknown): val is Record<string, { x: number; y: number }> {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
  for (const v of Object.values(val as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null) return false;
    const pos = v as Record<string, unknown>;
    if (typeof pos.x !== "number" || typeof pos.y !== "number") return false;
  }
  return true;
}

router.get("/projects/:projectId/graph-layout", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: "Invalid projectId" });
    return;
  }
  const [row] = await db
    .select()
    .from(graphLayouts)
    .where(eq(graphLayouts.projectId, projectId));
  if (!row) {
    res.json({ projectId, positions: {} });
    return;
  }
  res.json({ projectId: row.projectId, positions: row.positions });
});

router.put("/projects/:projectId/graph-layout", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: "Invalid projectId" });
    return;
  }
  const positions = req.body?.positions;
  if (!isValidPositions(positions)) {
    res.status(400).json({ error: "Invalid positions payload" });
    return;
  }
  const [row] = await db
    .insert(graphLayouts)
    .values({ projectId, positions })
    .onConflictDoUpdate({
      target: graphLayouts.projectId,
      set: { positions, updatedAt: new Date() },
    })
    .returning();
  res.json({ projectId: row.projectId, positions: row.positions });
});

export default router;
