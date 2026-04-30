import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { entities } from "./entities";
import { rules } from "./rules";

export const entityRules = pgTable(
  "entity_rules",
  {
    id: serial("id").primaryKey(),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    ruleId: integer("rule_id")
      .notNull()
      .references(() => rules.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.entityId, t.ruleId)],
);

export type EntityRule = typeof entityRules.$inferSelect;
