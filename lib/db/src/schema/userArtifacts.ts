import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { appUsers } from "./appUsers";

export const userArtifacts = pgTable(
  "user_artifacts",
  {
    id: serial("id").primaryKey(),
    appUserId: integer("app_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userKindUnique: uniqueIndex("user_artifacts_user_kind_unique").on(t.appUserId, t.kind),
    userIdx: index("user_artifacts_app_user_id_idx").on(t.appUserId),
  }),
);

export type UserArtifact = typeof userArtifacts.$inferSelect;
