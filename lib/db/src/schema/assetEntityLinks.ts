import { integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { assets } from "./assets";
import { entities } from "./entities";

export const assetEntityLinks = pgTable(
  "asset_entity_links",
  {
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.entityId] })],
);

export type AssetEntityLink = typeof assetEntityLinks.$inferSelect;
