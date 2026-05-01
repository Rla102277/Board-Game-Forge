import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projects } from "./projects";
import { appUsers } from "./appUsers";

export const projectShares = pgTable("project_shares", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => appUsers.id, { onDelete: "cascade" }),
  invitedEmail: text("invited_email"),
  role: text("role").default("viewer").notNull(), // "admin" | "editor" | "commenter" | "viewer"
  invitedByUserId: integer("invited_by_user_id").references(() => appUsers.id),
  publicLink: boolean("public_link").default(false).notNull(),
  publicLinkExpiry: timestamp("public_link_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertProjectShareSchema = createInsertSchema(projectShares).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProjectShare = typeof projectShares.$inferSelect;
export type InsertProjectShare = z.infer<typeof insertProjectShareSchema>;
