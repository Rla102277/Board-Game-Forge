import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const designerArtifacts = pgTable(
  "designer_artifacts",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    projectKindUnique: uniqueIndex("designer_artifacts_project_kind_unique").on(t.projectId, t.kind),
    projectIdx: index("designer_artifacts_project_id_idx").on(t.projectId),
  }),
);

export type DesignerArtifact = typeof designerArtifacts.$inferSelect;
