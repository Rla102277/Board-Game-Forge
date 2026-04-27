import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const playtestSessions = pgTable("playtest_sessions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
  playerCount: integer("player_count"),
  durationMinutes: integer("duration_minutes"),
  rating: integer("rating"),
  notes: text("notes"),
  issues: text("issues"),
  positives: text("positives"),
  suggestions: text("suggestions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertPlaytestSessionSchema = createInsertSchema(
  playtestSessions,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PlaytestSession = typeof playtestSessions.$inferSelect;
export type InsertPlaytestSession = z.infer<typeof insertPlaytestSessionSchema>;
