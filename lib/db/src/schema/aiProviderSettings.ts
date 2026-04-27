import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appUsers } from "./appUsers";

export const aiProviderSettings = pgTable("ai_provider_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" })
    .unique(),
  provider: text("provider").default("anthropic").notNull(),
  model: text("model"),
  apiKey: text("api_key"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertAiProviderSettingsSchema = createInsertSchema(
  aiProviderSettings,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AiProviderSettings = typeof aiProviderSettings.$inferSelect;
export type InsertAiProviderSettings = z.infer<
  typeof insertAiProviderSettingsSchema
>;
