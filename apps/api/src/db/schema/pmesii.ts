import { relations } from 'drizzle-orm';
import { uuid, varchar, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

import { assessments } from './core';
import { appSchema } from './organizations';

// PMESII-PT Domain Enum
export const pmesiiDomainEnum = pgEnum('pmesii_domain', [
  'political',
  'military',
  'economic',
  'social',
  'information',
  'infrastructure',
  'physical',
  'time',
]);

export const impactLevelEnum = pgEnum('impact_level', [
  'negligible',
  'minor',
  'moderate',
  'significant',
  'critical',
]);

export const trendEnum = pgEnum('trend', ['improving', 'stable', 'declining']);

// PMESII-PT Factors
export const factors = appSchema.table('factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .references(() => assessments.id, { onDelete: 'cascade' })
    .notNull(),
  domain: pmesiiDomainEnum('domain').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  analysis: text('analysis'),
  impact: impactLevelEnum('impact').default('moderate').notNull(),
  trend: trendEnum('trend').default('stable').notNull(),
  confidence: integer('confidence').default(50).notNull(), // 0-100
  sources: text('sources'), // JSON array of source references
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Factor Evidence (supporting data)
export const factorEvidence = appSchema.table('factor_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  factorId: uuid('factor_id')
    .references(() => factors.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  sourceUrl: text('source_url'),
  sourceType: varchar('source_type', { length: 50 }),
  observedAt: timestamp('observed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const factorsRelations = relations(factors, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [factors.assessmentId],
    references: [assessments.id],
  }),
  evidence: many(factorEvidence),
}));

export const factorEvidenceRelations = relations(factorEvidence, ({ one }) => ({
  factor: one(factors, {
    fields: [factorEvidence.factorId],
    references: [factors.id],
  }),
}));
