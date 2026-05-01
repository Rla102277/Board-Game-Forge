import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { appUsers } from "./appUsers";
import { tasks } from "./tasks";

export const taskAssignees = pgTable(
  "task_assignees",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.taskId, t.userId)],
);

export type TaskAssignee = typeof taskAssignees.$inferSelect;
