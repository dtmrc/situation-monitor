import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull } from 'drizzle-orm';

import { db } from '../db';
import { projects, assessments, factors, organizationMembers } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { cacheDelete, cacheKeys } from '../lib/cache';
import type { AppEnv } from '../types';

const assessmentRoutes = new Hono<AppEnv>();

assessmentRoutes.use('*', authMiddleware);

// Schemas
const createAssessmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateAssessmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;

// Helper: verify project access through org membership
async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Verify org membership
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, project.organizationId),
      eq(organizationMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return project;
}

// List assessments for a project
assessmentRoutes.get('/projects/:projectId/assessments', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  await verifyProjectAccess(projectId, user.sub);

  const projectAssessments = await db.query.assessments.findMany({
    where: and(eq(assessments.projectId, projectId), isNull(assessments.deletedAt)),
    orderBy: [desc(assessments.updatedAt)],
  });

  return c.json({ assessments: projectAssessments });
});

// Create assessment
assessmentRoutes.post('/projects/:projectId/assessments', validateBody(createAssessmentSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const body = c.get('validatedBody') as CreateAssessmentInput;

  await verifyProjectAccess(projectId, user.sub);

  const [assessment] = await db
    .insert(assessments)
    .values({
      projectId,
      name: body.name,
      description: body.description,
    })
    .returning();

  return c.json({ assessment }, 201);
});

// Get assessment with factors
assessmentRoutes.get('/assessments/:assessmentId', async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');

  const assessment = await db.query.assessments.findFirst({
    where: and(eq(assessments.id, assessmentId), isNull(assessments.deletedAt)),
    with: {
      project: true,
    },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment');
  }

  // Verify project access
  await verifyProjectAccess(assessment.projectId, user.sub);

  // Get factors grouped by domain
  const assessmentFactors = await db.query.factors.findMany({
    where: eq(factors.assessmentId, assessmentId),
    orderBy: [factors.sortOrder],
  });

  return c.json({
    assessment,
    factors: assessmentFactors,
  });
});

// Update assessment
assessmentRoutes.patch('/assessments/:assessmentId', validateBody(updateAssessmentSchema), async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');
  const body = c.get('validatedBody') as UpdateAssessmentInput;

  const existing = await db.query.assessments.findFirst({
    where: and(eq(assessments.id, assessmentId), isNull(assessments.deletedAt)),
  });

  if (!existing) {
    throw new NotFoundError('Assessment');
  }

  await verifyProjectAccess(existing.projectId, user.sub);

  const [updated] = await db
    .update(assessments)
    .set({
      name: body.name,
      description: body.description,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId))
    .returning();

  // Invalidate cache
  await cacheDelete(cacheKeys.assessment(assessmentId));

  return c.json({ assessment: updated });
});

// Delete assessment (soft delete)
assessmentRoutes.delete('/assessments/:assessmentId', async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');

  const existing = await db.query.assessments.findFirst({
    where: and(eq(assessments.id, assessmentId), isNull(assessments.deletedAt)),
  });

  if (!existing) {
    throw new NotFoundError('Assessment');
  }

  await verifyProjectAccess(existing.projectId, user.sub);

  await db
    .update(assessments)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));

  // Invalidate cache
  await cacheDelete(cacheKeys.assessment(assessmentId));

  return c.json({ success: true });
});

export { assessmentRoutes };
