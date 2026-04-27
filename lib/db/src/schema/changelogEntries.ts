import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const changelogEntries = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  actor: text("actor"),
  action: text("action").notNull(),
  entityKind: text("entity_kind"),
  entityRef: text("entity_ref"),
  summary: text("summary").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertChangelogEntrySchema = createInsertSchema(
  changelogEntries,
).omit({
  id: true,
  createdAt: true,
});

export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type InsertChangelogEntry = z.infer<typeof insertChangelogEntrySchema>;
