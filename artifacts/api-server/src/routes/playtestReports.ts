import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, playtestReports } from "@workspace/db";
import type { InsertPlaytestReport } from "@workspace/db";
import { z } from "zod/v4";

// These endpoints are not yet represented in the generated OpenAPI schemas.
// Validate locally until the API spec and generated clients are synchronized.
const projectParams = z.object({ projectId: z.coerce.number().int().positive() });
const reportParams = projectParams.extend({ reportId: z.coerce.number().int().positive() });
const actionItem = z.object({
  text: z.string(),
  linkedTaskId: z.number().int().nullable().optional(),
  done: z.boolean().nullable().optional(),
});
const reportBody = z.object({
  date: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  whatWorked: z.string().nullable().optional(),
  whatBroke: z.string().nullable().optional(),
  actionItems: z.array(actionItem).optional(),
}).strict();

const router: IRouter = Router();

router.get(
  "/projects/:projectId/playtest-reports",
  async (req, res): Promise<void> => {
    const params = projectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(playtestReports)
      .where(eq(playtestReports.projectId, params.data.projectId))
      .orderBy(desc(playtestReports.date));
    res.json(rows);
  },
);

router.post(
  "/projects/:projectId/playtest-reports",
  async (req, res): Promise<void> => {
    const params = projectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = reportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { date: dateStr, ...rest } = parsed.data;
    const values: InsertPlaytestReport = {
      projectId: params.data.projectId,
      ...rest,
      ...(dateStr ? { date: new Date(dateStr) } : {}),
    };
    const [row] = await db.insert(playtestReports).values(values).returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/projects/:projectId/playtest-reports/:reportId",
  async (req, res): Promise<void> => {
    const params = reportParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = reportBody.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { date: dateStr, ...rest } = parsed.data;
    const update: Partial<InsertPlaytestReport> = {
      ...rest,
      ...(dateStr ? { date: new Date(dateStr) } : {}),
    };
    const [row] = await db
      .update(playtestReports)
      .set(update)
      .where(
        and(
          eq(playtestReports.id, params.data.reportId),
          eq(playtestReports.projectId, params.data.projectId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/projects/:projectId/playtest-reports/:reportId",
  async (req, res): Promise<void> => {
    const params = reportParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(playtestReports)
      .where(
        and(
          eq(playtestReports.id, params.data.reportId),
          eq(playtestReports.projectId, params.data.projectId),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
