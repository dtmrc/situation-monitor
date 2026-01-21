import { relations } from 'drizzle-orm';
import { pgSchema, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const appSchema = pgSchema('app');

// Organization status
export const orgStatusEnum = pgEnum('org_status', ['active', 'suspended', 'deleted']);
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member', 'viewer']);

// Organizations
export const organizations = appSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  status: orgStatusEnum('status').default('active').notNull(),
  settings: text('settings'), // JSON for org-level settings
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Organization Memberships
export const organizationMembers = appSchema.table('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').notNull(), // Will reference users.id
  role: orgRoleEnum('role').default('member').notNull(),
  invitedBy: uuid('invited_by'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Organization Invitations
export const organizationInvitations = appSchema.table('organization_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: orgRoleEnum('role').default('member').notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  invitedBy: uuid('invited_by').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvitations.organizationId],
    references: [organizations.id],
  }),
}));
