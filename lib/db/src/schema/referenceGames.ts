import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referenceGames = pgTable("reference_games", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  gameData: jsonb("game_data"),
  borrowing: text("borrowing"),
  avoiding: text("avoiding"),
  researchId: integer("research_id"),
  position: integer("position"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertReferenceGameSchema = createInsertSchema(referenceGames).omit({
  id: true,
  createdAt: true,
});

export type ReferenceGame = typeof referenceGames.$inferSelect;
export type InsertReferenceGame = z.infer<typeof insertReferenceGameSchema>;
