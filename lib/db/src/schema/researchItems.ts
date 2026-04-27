import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const researchItems = pgTable("research_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  source: text("source"),
  tags: text("tags"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertResearchItemSchema = createInsertSchema(researchItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ResearchItem = typeof researchItems.$inferSelect;
export type InsertResearchItem = z.infer<typeof insertResearchItemSchema>;
