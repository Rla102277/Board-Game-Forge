import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const projectSnapshots = pgTable("project_snapshots", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  description: text("description"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  payloadVersion: integer("payload_version").default(1).notNull(),
  isAutoSnapshot: boolean("is_auto_snapshot").default(false).notNull(),
  createdByUserId: integer("created_by_user_id"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertProjectSnapshotSchema = createInsertSchema(
  projectSnapshots,
).omit({
  id: true,
  createdAt: true,
});

export type ProjectSnapshot = typeof projectSnapshots.$inferSelect;
export type InsertProjectSnapshot = z.infer<typeof insertProjectSnapshotSchema>;
