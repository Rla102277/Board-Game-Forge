import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, playtestReports } from "@workspace/db";
import type { InsertPlaytestReport } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { z } from "zod";

const projectParams = schemas.ListPlaytestReportsParams.extend({
  projectId: schemas.ListPlaytestReportsParams.shape.projectId.int().positive(),
});
const reportParams = schemas.UpdatePlaytestReportParams.extend({
  projectId: projectParams.shape.projectId,
  reportId: schemas.UpdatePlaytestReportParams.shape.reportId.int().positive(),
});
const actionItem = schemas.CreatePlaytestReportBody.shape.actionItems.unwrap().element;
const reportBody = schemas.CreatePlaytestReportBody.extend({
  // OpenAPI dates are JSON strings; generic date coercion also accepts null/numbers.
  date: z.string().datetime({ offset: true }).optional(),
  actionItems: z.array(actionItem.extend({
    linkedTaskId: actionItem.shape.linkedTaskId.unwrap().unwrap().int().nullish(),
  })).optional(),
  rating: schemas.CreatePlaytestReportBody.shape.rating.unwrap().unwrap().int().nullish(),
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
    const parsed = reportBody.refine((body) => Object.keys(body).length > 0, "Provide at least one field").safeParse(req.body);
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
