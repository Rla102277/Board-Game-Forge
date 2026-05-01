import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: integer("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: text("type").default("blocks").notNull(), // "blocks" | "blocked_by" | "relates_to" | "duplicate_of"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.taskId, t.dependsOnTaskId)],
);

export type TaskDependency = typeof taskDependencies.$inferSelect;
