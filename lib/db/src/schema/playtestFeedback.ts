import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const playtestFeedback = pgTable("playtest_feedback", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  shareToken: text("share_token").notNull(),
  respondentName: text("respondent_name"),
  funScore: integer("fun_score"),
  balanceScore: integer("balance_score"),
  clarityScore: integer("clarity_score"),
  whatWorked: text("what_worked"),
  whatDidNot: text("what_did_not"),
  suggestions: text("suggestions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertPlaytestFeedbackSchema = createInsertSchema(
  playtestFeedback,
).omit({
  id: true,
  createdAt: true,
});

export type PlaytestFeedback = typeof playtestFeedback.$inferSelect;
export type InsertPlaytestFeedback = z.infer<
  typeof insertPlaytestFeedbackSchema
>;
