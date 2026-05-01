import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";
import { entities } from "./entities";

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  entityId: integer("entity_id").references(() => entities.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  kind: text("kind").default("card").notNull(),
  description: text("description"),
  flavorText: text("flavor_text"),
  imageDataUrl: text("image_data_url"),
  imagePrompt: text("image_prompt"),
  quantity: integer("quantity").default(1).notNull(),
  status: text("status").default("draft").notNull(),
  componentDetails: text("component_details"),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
