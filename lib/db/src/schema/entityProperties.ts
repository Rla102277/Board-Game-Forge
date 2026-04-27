import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { entities } from "./entities";

export const entityProperties = pgTable("entity_properties", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dataType: text("data_type").default("number").notNull(),
  unit: text("unit"),
  value: real("value"),
  textValue: text("text_value"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  defaultValue: real("default_value"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertEntityPropertySchema = createInsertSchema(entityProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EntityProperty = typeof entityProperties.$inferSelect;
export type InsertEntityProperty = z.infer<typeof insertEntityPropertySchema>;
