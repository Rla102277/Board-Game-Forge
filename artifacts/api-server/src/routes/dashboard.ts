import { Router, type IRouter } from "express";
import { desc, sql, isNotNull, eq } from "drizzle-orm";
import {
  db,
  projects,
  entities,
  rules,
  chatMessages,
} from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [{ projectCount }] = await db
    .select({ projectCount: sql<number>`count(*)::int` })
    .from(projects);
  const [{ entityCount }] = await db
    .select({ entityCount: sql<number>`count(*)::int` })
    .from(entities);
  const [{ ruleCount }] = await db
    .select({ ruleCount: sql<number>`count(*)::int` })
    .from(rules);
  const [{ chatMessageCount }] = await db
    .select({ chatMessageCount: sql<number>`count(*)::int` })
    .from(chatMessages);

  const gameTypeBreakdown = await db
    .select({
      gameType: sql<string>`${projects.gameType}`,
      count: sql<number>`count(*)::int`,
    })
    .from(projects)
    .where(isNotNull(projects.gameType))
    .groupBy(projects.gameType)
    .orderBy(desc(sql`count(*)`));

  const genreBreakdown = await db
    .select({
      genre: sql<string>`${projects.genre}`,
      count: sql<number>`count(*)::int`,
    })
    .from(projects)
    .where(isNotNull(projects.genre))
    .groupBy(projects.genre)
    .orderBy(desc(sql`count(*)`));

  res.json(
    schemas.GetDashboardSummaryResponse.parse({
      projectCount,
      entityCount,
      ruleCount,
      chatMessageCount,
      gameTypeBreakdown,
      genreBreakdown,
    }),
  );
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const limit = 20;
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .orderBy(desc(projects.createdAt))
    .limit(limit);

  const entityRows = await db
    .select({
      id: entities.id,
      projectId: entities.projectId,
      name: entities.name,
      createdAt: entities.createdAt,
      projectName: projects.name,
    })
    .from(entities)
    .innerJoin(projects, eq(projects.id, entities.projectId))
    .orderBy(desc(entities.createdAt))
    .limit(limit);

  const ruleRows = await db
    .select({
      id: rules.id,
      projectId: rules.projectId,
      title: rules.title,
      createdAt: rules.createdAt,
      projectName: projects.name,
    })
    .from(rules)
    .innerJoin(projects, eq(projects.id, rules.projectId))
    .orderBy(desc(rules.createdAt))
    .limit(limit);

  const chatRows = await db
    .select({
      id: chatMessages.id,
      projectId: chatMessages.projectId,
      content: chatMessages.content,
      role: chatMessages.role,
      createdAt: chatMessages.createdAt,
      projectName: projects.name,
    })
    .from(chatMessages)
    .innerJoin(projects, eq(projects.id, chatMessages.projectId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const events = [
    ...projectRows.map((p) => ({
      id: `project-${p.id}`,
      projectId: p.id,
      projectName: p.name,
      kind: "project_created",
      title: `Project created: ${p.name}`,
      createdAt: p.createdAt,
    })),
    ...entityRows.map((e) => ({
      id: `entity-${e.id}`,
      projectId: e.projectId,
      projectName: e.projectName,
      kind: "entity_added",
      title: `Entity added: ${e.name}`,
      createdAt: e.createdAt,
    })),
    ...ruleRows.map((r) => ({
      id: `rule-${r.id}`,
      projectId: r.projectId,
      projectName: r.projectName,
      kind: "rule_added",
      title: `Rule added: ${r.title}`,
      createdAt: r.createdAt,
    })),
    ...chatRows.map((c) => ({
      id: `chat-${c.id}`,
      projectId: c.projectId,
      projectName: c.projectName,
      kind: c.role === "assistant" ? "assistant_reply" : "user_message",
      title:
        c.role === "assistant"
          ? `AI replied in ${c.projectName}`
          : `You asked: ${c.content.slice(0, 80)}${c.content.length > 80 ? "…" : ""}`,
      createdAt: c.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  res.json(schemas.GetRecentActivityResponse.parse(events));
});

export default router;
