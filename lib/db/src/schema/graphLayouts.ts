import { integer, jsonb, pgTable, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const graphLayouts = pgTable(
  "graph_layouts",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    positions: jsonb("positions").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    projectUnique: uniqueIndex("graph_layouts_project_id_unique").on(t.projectId),
  }),
);

export type GraphLayout = typeof graphLayouts.$inferSelect;
