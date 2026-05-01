import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const playtestReports = pgTable("playtest_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
  attendees: jsonb("attendees").$type<string[]>().default([]),
  rating: integer("rating"),
  whatWorked: text("what_worked"),
  whatBroke: text("what_broke"),
  actionItems: jsonb("action_items")
    .$type<{ text: string; linkedTaskId?: number | null; done?: boolean | null }[]>()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertPlaytestReportSchema = createInsertSchema(
  playtestReports,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PlaytestReport = typeof playtestReports.$inferSelect;
export type InsertPlaytestReport = z.infer<typeof insertPlaytestReportSchema>;
