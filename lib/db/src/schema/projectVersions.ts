import { integer, pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";
import { appUsers } from "./appUsers";

export const projectVersions = pgTable("project_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  description: text("description"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").notNull(), // Stores entities, rules, players, notes, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertProjectVersionSchema = createInsertSchema(projectVersions).omit({
  id: true,
  createdAt: true,
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = z.infer<typeof insertProjectVersionSchema>;
