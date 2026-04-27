import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id"),
    workspaceId: integer("workspace_id"),
    slug: text("slug"),
    name: text("name").notNull(),
    description: text("description"),
    gameType: text("game_type"),
    genre: text("genre"),
    playerCount: text("player_count"),
    targetDuration: text("target_duration"),
    complexityScore: integer("complexity_score"),
    blueprint: text("blueprint"),
    narrative: text("narrative"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    workspaceSlugUnique: uniqueIndex("projects_workspace_slug_unique").on(t.workspaceId, t.slug),
  }),
);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
