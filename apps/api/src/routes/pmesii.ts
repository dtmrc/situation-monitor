import { eq, and, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db';
import { assessments, factors, factorEvidence, organizationMembers } from '../db/schema';
import { cacheDelete, cacheKeys } from '../lib/cache';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import type { AppEnv } from '../types';

const pmesiiRoutes = new Hono<AppEnv>();

pmesiiRoutes.use('*', authMiddleware);

// Schemas
const domainEnum = z.enum([
  'political',
  'military',
  'economic',
  'social',
  'information',
  'infrastructure',
  'physical',
  'time',
]);

const createFactorSchema = z.object({
  domain: domainEnum,
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  analysis: z.string().optional(),
  impact: z.enum(['negligible', 'minor', 'moderate', 'significant', 'critical']).optional(),
  trend: z.enum(['improving', 'stable', 'declining']).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

const updateFactorSchema = createFactorSchema.partial();

const createEvidenceSchema = z.object({
  content: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string().optional(),
  observedAt: z.string().datetime().optional(),
});

type CreateFactorInput = z.infer<typeof createFactorSchema>;
type UpdateFactorInput = z.infer<typeof updateFactorSchema>;
type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;

// Helper: verify assessment access through project -> org membership
async function verifyAssessmentAccess(assessmentId: string, userId: string) {
  const assessment = await db.query.assessments.findFirst({
    where: and(eq(assessments.id, assessmentId), isNull(assessments.deletedAt)),
    with: { project: true },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment');
  }

  // Verify org membership
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, assessment.project.organizationId),
      eq(organizationMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return assessment;
}

// Get all factors for an assessment (grouped by domain)
pmesiiRoutes.get('/assessments/:assessmentId/factors', async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');

  await verifyAssessmentAccess(assessmentId, user.sub);

  const allFactors = await db.query.factors.findMany({
    where: eq(factors.assessmentId, assessmentId),
    with: {
      evidence: true,
    },
    orderBy: [factors.domain, factors.sortOrder],
  });

  // Group by domain
  const byDomain: Record<string, typeof allFactors> = {};
  for (const factor of allFactors) {
    if (!byDomain[factor.domain]) {
      byDomain[factor.domain] = [];
    }
    byDomain[factor.domain]!.push(factor);
  }

  return c.json({ factors: byDomain });
});

// Create factor
pmesiiRoutes.post(
  '/assessments/:assessmentId/factors',
  validateBody(createFactorSchema),
  async (c) => {
    const user = c.get('user');
    const assessmentId = c.req.param('assessmentId');
    const body = c.get('validatedBody') as CreateFactorInput;

    await verifyAssessmentAccess(assessmentId, user.sub);

    // Get count for sort order
    const existingCount = await db.query.factors.findMany({
      where: and(eq(factors.assessmentId, assessmentId), eq(factors.domain, body.domain)),
    });

    const [factor] = await db
      .insert(factors)
      .values({
        assessmentId,
        domain: body.domain,
        title: body.title,
        description: body.description,
        analysis: body.analysis,
        impact: body.impact,
        trend: body.trend,
        confidence: body.confidence,
        sortOrder: existingCount.length,
      })
      .returning();

    // Invalidate cache
    await cacheDelete(cacheKeys.factors(assessmentId));

    return c.json({ factor }, 201);
  }
);

// Update factor
pmesiiRoutes.patch('/factors/:factorId', validateBody(updateFactorSchema), async (c) => {
  const user = c.get('user');
  const factorId = c.req.param('factorId');
  const body = c.get('validatedBody') as UpdateFactorInput;

  const existing = await db.query.factors.findFirst({
    where: eq(factors.id, factorId),
    with: { assessment: { with: { project: true } } },
  });

  if (!existing) {
    throw new NotFoundError('Factor');
  }

  // Verify access
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, existing.assessment.project.organizationId),
      eq(organizationMembers.userId, user.sub)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  const [updated] = await db
    .update(factors)
    .set({
      domain: body.domain,
      title: body.title,
      description: body.description,
      analysis: body.analysis,
      impact: body.impact,
      trend: body.trend,
      confidence: body.confidence,
      updatedAt: new Date(),
    })
    .where(eq(factors.id, factorId))
    .returning();

  // Invalidate cache
  await cacheDelete(cacheKeys.factors(existing.assessmentId));

  return c.json({ factor: updated });
});

// Delete factor
pmesiiRoutes.delete('/factors/:factorId', async (c) => {
  const user = c.get('user');
  const factorId = c.req.param('factorId');

  const existing = await db.query.factors.findFirst({
    where: eq(factors.id, factorId),
    with: { assessment: { with: { project: true } } },
  });

  if (!existing) {
    throw new NotFoundError('Factor');
  }

  // Verify access
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, existing.assessment.project.organizationId),
      eq(organizationMembers.userId, user.sub)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  await db.delete(factors).where(eq(factors.id, factorId));

  // Invalidate cache
  await cacheDelete(cacheKeys.factors(existing.assessmentId));

  return c.json({ success: true });
});

// Add evidence to factor
pmesiiRoutes.post('/factors/:factorId/evidence', validateBody(createEvidenceSchema), async (c) => {
  const user = c.get('user');
  const factorId = c.req.param('factorId');
  const body = c.get('validatedBody') as CreateEvidenceInput;

  const existingFactor = await db.query.factors.findFirst({
    where: eq(factors.id, factorId),
    with: { assessment: { with: { project: true } } },
  });

  if (!existingFactor) {
    throw new NotFoundError('Factor');
  }

  // Verify access
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, existingFactor.assessment.project.organizationId),
      eq(organizationMembers.userId, user.sub)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  const [evidence] = await db
    .insert(factorEvidence)
    .values({
      factorId,
      content: body.content,
      sourceUrl: body.sourceUrl,
      sourceType: body.sourceType,
      observedAt: body.observedAt ? new Date(body.observedAt) : null,
    })
    .returning();

  return c.json({ evidence }, 201);
});

// Delete evidence
pmesiiRoutes.delete('/evidence/:evidenceId', async (c) => {
  const user = c.get('user');
  const evidenceId = c.req.param('evidenceId');

  const evidence = await db.query.factorEvidence.findFirst({
    where: eq(factorEvidence.id, evidenceId),
    with: {
      factor: {
        with: { assessment: { with: { project: true } } },
      },
    },
  });

  if (!evidence) {
    throw new NotFoundError('Evidence');
  }

  // Verify access
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, evidence.factor.assessment.project.organizationId),
      eq(organizationMembers.userId, user.sub)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  await db.delete(factorEvidence).where(eq(factorEvidence.id, evidenceId));

  return c.json({ success: true });
});

export { pmesiiRoutes };
