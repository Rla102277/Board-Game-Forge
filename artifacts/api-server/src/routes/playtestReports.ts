import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, playtestReports } from "@workspace/db";
import type { InsertPlaytestReport } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/playtest-reports",
  async (req, res): Promise<void> => {
    const params = schemas.ListPlaytestReportsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(playtestReports)
      .where(eq(playtestReports.projectId, params.data.projectId))
      .orderBy(desc(playtestReports.date));
    res.json(schemas.ListPlaytestReportsResponse.parse(rows));
  },
);

router.post(
  "/projects/:projectId/playtest-reports",
  async (req, res): Promise<void> => {
    const params = schemas.CreatePlaytestReportParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.CreatePlaytestReportBody.safeParse(req.body);
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
    res.status(201).json(schemas.PlaytestReportItem.parse(row));
  },
);

router.patch(
  "/projects/:projectId/playtest-reports/:reportId",
  async (req, res): Promise<void> => {
    const params = schemas.UpdatePlaytestReportParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.UpdatePlaytestReportBody.safeParse(req.body);
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
    res.json(schemas.PlaytestReportItem.parse(row));
  },
);

router.delete(
  "/projects/:projectId/playtest-reports/:reportId",
  async (req, res): Promise<void> => {
    const params = schemas.DeletePlaytestReportParams.safeParse(req.params);
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
