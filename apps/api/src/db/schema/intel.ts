import { relations } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  real,
} from 'drizzle-orm/pg-core';

import { projects } from './core';

export const intelSchema = pgSchema('intel');

export const pirStatusEnum = pgEnum('pir_status', ['draft', 'active', 'answered', 'obsolete']);

export const pirPriorityEnum = pgEnum('pir_priority', [
  'routine',
  'priority',
  'immediate',
  'flash',
]);

export const sourceReliabilityEnum = pgEnum('source_reliability', [
  'A', // Completely reliable
  'B', // Usually reliable
  'C', // Fairly reliable
  'D', // Not usually reliable
  'E', // Unreliable
  'F', // Cannot be judged
]);

export const infoCredibilityEnum = pgEnum('info_credibility', [
  '1', // Confirmed
  '2', // Probably true
  '3', // Possibly true
  '4', // Doubtfully true
  '5', // Improbable
  '6', // Cannot be judged
]);

// Priority Intelligence Requirements
export const pirs = intelSchema.table('pirs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  question: text('question').notNull(),
  context: text('context'),
  status: pirStatusEnum('status').default('draft').notNull(),
  priority: pirPriorityEnum('priority').default('routine').notNull(),
  dueDate: timestamp('due_date'),
  answeredAt: timestamp('answered_at'),
  answer: text('answer'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Named Areas of Interest
export const nais = intelSchema.table('nais', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Geospatial data
  latitude: real('latitude'),
  longitude: real('longitude'),
  radius: real('radius'), // meters
  polygon: text('polygon'), // GeoJSON
  // Metadata
  isActive: boolean('is_active').default(true).notNull(),
  color: varchar('color', { length: 7 }).default('#00ff88'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Sources
export const sources = intelSchema.table('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(), // HUMINT, OSINT, SIGINT, etc.
  description: text('description'),
  reliability: sourceReliabilityEnum('reliability').default('F'),
  contactInfo: text('contact_info'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Collection Tasks
export const collectionTasks = intelSchema.table('collection_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pirId: uuid('pir_id')
    .references(() => pirs.id, { onDelete: 'cascade' })
    .notNull(),
  sourceId: uuid('source_id').references(() => sources.id),
  naiId: uuid('nai_id').references(() => nais.id),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  assignedTo: uuid('assigned_to'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  result: text('result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const pirsRelations = relations(pirs, ({ one, many }) => ({
  project: one(projects, {
    fields: [pirs.projectId],
    references: [projects.id],
  }),
  collectionTasks: many(collectionTasks),
}));

// Note: tripwires relation is defined in indicators.ts to avoid circular imports
// The tripwires table has naiId foreign key pointing to nais
export const naisRelations = relations(nais, ({ one }) => ({
  project: one(projects, {
    fields: [nais.projectId],
    references: [projects.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  project: one(projects, {
    fields: [sources.projectId],
    references: [projects.id],
  }),
  collectionTasks: many(collectionTasks),
}));

export const collectionTasksRelations = relations(collectionTasks, ({ one }) => ({
  pir: one(pirs, {
    fields: [collectionTasks.pirId],
    references: [pirs.id],
  }),
  source: one(sources, {
    fields: [collectionTasks.sourceId],
    references: [sources.id],
  }),
  nai: one(nais, {
    fields: [collectionTasks.naiId],
    references: [nais.id],
  }),
}));
