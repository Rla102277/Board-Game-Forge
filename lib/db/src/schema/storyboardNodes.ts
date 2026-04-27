import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const storyboardNodes = pgTable("storyboard_nodes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  title: text("title").notNull(),
  content: text("content"),
  nodeType: text("node_type").default("idea").notNull(),
  status: text("status").default("idea").notNull(),
  color: text("color"),
  positionX: real("position_x").default(0).notNull(),
  positionY: real("position_y").default(0).notNull(),
  linkedRuleId: integer("linked_rule_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertStoryboardNodeSchema = createInsertSchema(
  storyboardNodes,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StoryboardNode = typeof storyboardNodes.$inferSelect;
export type InsertStoryboardNode = z.infer<typeof insertStoryboardNodeSchema>;
