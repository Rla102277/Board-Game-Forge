import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";

export const kickstarterAssets = pgTable("kickstarter_assets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"),
  generationId: text("generation_id"),
  gammaUrl: text("gamma_url"),
  pdfUrl: text("pdf_url"),
  pptxUrl: text("pptx_url"),
  errorMessage: text("error_message"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertKickstarterAssetSchema = createInsertSchema(kickstarterAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KickstarterAsset = typeof kickstarterAssets.$inferSelect;
export type InsertKickstarterAsset = z.infer<typeof insertKickstarterAssetSchema>;
