import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  playerType: text("player_type").default("Character").notNull(),
  role: text("role"),
  archetype: text("archetype"),
  description: text("description"),
  strategy: text("strategy"),
  startingResources: text("starting_resources"),
  victoryCondition: text("victory_condition"),
  specialAbility: text("special_ability"),
  playstyle: text("playstyle"),
  // New profile fields (migration 0008)
  faction: text("faction"),
  motivation: text("motivation"),
  flaw: text("flaw"),
  arc: text("arc"),
  displayOrder: integer("display_order").default(0),
  behaviorProfile: jsonb("behavior_profile"),
  relationships: jsonb("relationships"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
