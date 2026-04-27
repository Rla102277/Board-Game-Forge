import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, changelogEntries } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/changelog",
  async (req, res): Promise<void> => {
    const params = schemas.ListChangelogParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(changelogEntries)
      .where(eq(changelogEntries.projectId, params.data.projectId))
      .orderBy(desc(changelogEntries.createdAt))
      .limit(200);
    res.json(schemas.ListChangelogResponse.parse(rows));
  },
);

export default router;
