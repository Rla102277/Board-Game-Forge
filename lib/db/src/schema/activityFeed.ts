import { integer, pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";
import { appUsers } from "./appUsers";

export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "created", "updated", "deleted", "commented", "resolved", "mentioned"
  entityType: text("entity_type").notNull(), // "project", "entity", "rule", "note", "task", "comment"
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActivityFeedSchema = createInsertSchema(activityFeed).omit({
  id: true,
  createdAt: true,
});

export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type InsertActivityFeedItem = z.infer<typeof insertActivityFeedSchema>;
