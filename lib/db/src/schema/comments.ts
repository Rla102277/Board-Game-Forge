import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";
import { appUsers } from "./appUsers";

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // "entity", "rule", "note", "task", "general"
  entityId: integer("entity_id"), // null for general comments
  authorId: integer("author_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
