import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appUsers } from "./appUsers";

export const workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ownerUserId: integer("owner_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    isPersonal: integer("is_personal").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    inviteCode: text("invite_code").unique(),
  },
  (t) => ({
    slugUnique: uniqueIndex("workspaces_slug_unique").on(t.slug),
    // At most one personal workspace per owner.
    personalPerOwnerUnique: uniqueIndex("workspaces_personal_owner_unique")
      .on(t.ownerUserId)
      .where(sql`${t.isPersonal} = 1`),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => appUsers.id, { onDelete: "cascade" }),
    invitedEmail: text("invited_email"),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("active"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    workspaceUserUnique: uniqueIndex("workspace_members_ws_user_unique").on(t.workspaceId, t.userId),
    // Prevent duplicate pending email invites per workspace.
    workspaceInvitedEmailUnique: uniqueIndex("workspace_members_ws_invited_email_unique")
      .on(t.workspaceId, t.invitedEmail)
      .where(sql`${t.invitedEmail} is not null`),
  }),
);

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
