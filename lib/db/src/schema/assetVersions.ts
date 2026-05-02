import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { assets } from "./assets";

export const assetVersions = pgTable("asset_versions", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  versionLabel: text("version_label"),
  imageDataUrl: text("image_data_url"),
  imagePrompt: text("image_prompt"),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AssetVersion = typeof assetVersions.$inferSelect;
