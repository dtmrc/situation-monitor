import { relations } from 'drizzle-orm';
import { uuid, varchar, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

import { assessments } from './core';
import { appSchema } from './organizations';

export const cogTypeEnum = pgEnum('cog_type', ['friendly', 'adversary', 'neutral']);
export const cogElementTypeEnum = pgEnum('cog_element_type', [
  'critical_capability', // CC: What can the CoG do?
  'critical_requirement', // CR: What does the CoG need?
  'critical_vulnerability', // CV: What can be exploited?
]);

// Center of Gravity entities
export const centersOfGravity = appSchema.table('centers_of_gravity', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .references(() => assessments.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: cogTypeEnum('type').notNull(),
  description: text('description'),
  rationale: text('rationale'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CoG Elements (CC, CR, CV)
export const cogElements = appSchema.table('cog_elements', {
  id: uuid('id').primaryKey().defaultRandom(),
  cogId: uuid('cog_id')
    .references(() => centersOfGravity.id, { onDelete: 'cascade' })
    .notNull(),
  type: cogElementTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CoG Element Links (relationships between elements)
export const cogElementLinks = appSchema.table('cog_element_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .references(() => cogElements.id, { onDelete: 'cascade' })
    .notNull(),
  targetId: uuid('target_id')
    .references(() => cogElements.id, { onDelete: 'cascade' })
    .notNull(),
  relationship: varchar('relationship', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const centersOfGravityRelations = relations(centersOfGravity, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [centersOfGravity.assessmentId],
    references: [assessments.id],
  }),
  elements: many(cogElements),
}));

export const cogElementsRelations = relations(cogElements, ({ one, many }) => ({
  cog: one(centersOfGravity, {
    fields: [cogElements.cogId],
    references: [centersOfGravity.id],
  }),
  outgoingLinks: many(cogElementLinks, { relationName: 'sourceLinks' }),
  incomingLinks: many(cogElementLinks, { relationName: 'targetLinks' }),
}));

export const cogElementLinksRelations = relations(cogElementLinks, ({ one }) => ({
  source: one(cogElements, {
    fields: [cogElementLinks.sourceId],
    references: [cogElements.id],
    relationName: 'sourceLinks',
  }),
  target: one(cogElements, {
    fields: [cogElementLinks.targetId],
    references: [cogElements.id],
    relationName: 'targetLinks',
  }),
}));
