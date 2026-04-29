import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, entities, entityProperties, rules } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/balance",
  async (req, res): Promise<void> => {
    const params = schemas.GetBalanceReportParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const projectId = params.data.projectId;
    const ents = await db
      .select()
      .from(entities)
      .where(eq(entities.projectId, projectId));
    const props: Array<{
      entityId: number;
      entityName: string;
      name: string;
      value: number;
    }> = [];
    for (const e of ents) {
      const ps = await db
        .select()
        .from(entityProperties)
        .where(eq(entityProperties.entityId, e.id));
      for (const p of ps) {
        if (p.value !== null) {
          props.push({
            entityId: e.id,
            entityName: e.name,
            name: p.name,
            value: p.value,
          });
        }
      }
    }
    const byName = new Map<
      string,
      Array<{ entityId: number; entityName: string; value: number }>
    >();
    for (const p of props) {
      const arr = byName.get(p.name) ?? [];
      arr.push({ entityId: p.entityId, entityName: p.entityName, value: p.value });
      byName.set(p.name, arr);
    }
    const statSeries = Array.from(byName.entries()).map(([statName, entries]) => ({
      statName,
      entries,
    }));

    const rs = await db.select().from(rules).where(eq(rules.projectId, projectId));
    let conflictCount = 0;
    const titles = new Map<string, number>();
    for (const r of rs) {
      const k = r.title.toLowerCase().trim();
      titles.set(k, (titles.get(k) ?? 0) + 1);
    }
    for (const v of titles.values()) if (v > 1) conflictCount += v - 1;

    let balanceScore = 80;
    for (const s of statSeries) {
      const vals = s.entries.map((e) => e.value);
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const spread = max - min;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (mean !== 0 && spread / Math.abs(mean) > 1.5) balanceScore -= 8;
    }
    balanceScore -= conflictCount * 5;
    balanceScore = Math.max(0, Math.min(100, Math.round(balanceScore)));
    const verdict =
      balanceScore > 70
        ? "Well balanced"
        : balanceScore > 40
          ? "Some imbalance — review high-spread stats"
          : "Significant imbalance";

    res.json(
      schemas.GetBalanceReportResponse.parse({
        balanceScore,
        verdict,
        statSeries,
        conflictCount,
      }),
    );
  },
);

export default router;
