import { relations } from 'drizzle-orm';
import { uuid, varchar, text, timestamp, integer, pgEnum, real } from 'drizzle-orm/pg-core';

import { assessments } from './core';
import { appSchema } from './organizations';

export const threatCategoryEnum = pgEnum('threat_category', [
  'state_actor',
  'non_state_actor',
  'natural',
  'technological',
  'economic',
  'social',
  'cyber',
  'other',
]);

export const probabilityEnum = pgEnum('probability', [
  'rare', // 1: < 10%
  'unlikely', // 2: 10-30%
  'possible', // 3: 30-50%
  'likely', // 4: 50-80%
  'certain', // 5: > 80%
]);

// Threat Actors
export const threatActors = appSchema.table('threat_actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: threatCategoryEnum('category').notNull(),
  description: text('description'),
  capabilities: text('capabilities'),
  intentions: text('intentions'),
  history: text('history'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Threat Assessments (probability x impact matrix entries)
export const threatAssessments = appSchema.table('threat_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .references(() => assessments.id, { onDelete: 'cascade' })
    .notNull(),
  threatActorId: uuid('threat_actor_id')
    .references(() => threatActors.id)
    .notNull(),
  threatScenario: text('threat_scenario').notNull(),
  probability: probabilityEnum('probability').notNull(),
  probabilityScore: integer('probability_score').notNull(), // 1-5
  impactScore: integer('impact_score').notNull(), // 1-5 for each category
  // Impact breakdown (stored as separate columns for query efficiency)
  impactCasualties: integer('impact_casualties').default(1),
  impactEconomic: integer('impact_economic').default(1),
  impactInfrastructure: integer('impact_infrastructure').default(1),
  impactReputation: integer('impact_reputation').default(1),
  // Calculated risk score (probability × impact)
  riskScore: real('risk_score').notNull(),
  mitigations: text('mitigations'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const threatActorsRelations = relations(threatActors, ({ many }) => ({
  assessments: many(threatAssessments),
}));

export const threatAssessmentsRelations = relations(threatAssessments, ({ one }) => ({
  assessment: one(assessments, {
    fields: [threatAssessments.assessmentId],
    references: [assessments.id],
  }),
  threatActor: one(threatActors, {
    fields: [threatAssessments.threatActorId],
    references: [threatActors.id],
  }),
}));
