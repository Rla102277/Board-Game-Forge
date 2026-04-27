import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "./workspaces";

export const workspaceAiSettings = pgTable(
  "workspace_ai_settings",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    encryptedKey: text("encrypted_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    wsProviderUnique: uniqueIndex("workspace_ai_settings_ws_provider_unique").on(
      t.workspaceId,
      t.provider,
    ),
  }),
);

export const insertWorkspaceAiSettingsSchema = createInsertSchema(
  workspaceAiSettings,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkspaceAiSettings = typeof workspaceAiSettings.$inferSelect;
export type InsertWorkspaceAiSettings = z.infer<
  typeof insertWorkspaceAiSettingsSchema
>;
