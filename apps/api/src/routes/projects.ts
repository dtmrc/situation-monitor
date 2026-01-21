import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull } from 'drizzle-orm';

import { db } from '../db';
import { projects, projectMembers, assessments, organizationMembers } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { cacheDelete, cacheKeys } from '../lib/cache';
import type { AppEnv } from '../types';

const projectRoutes = new Hono<AppEnv>();

// All routes require auth
projectRoutes.use('*', authMiddleware);

// Schemas
const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// Helper: verify user has org membership
async function verifyOrgMembership(orgId: string, userId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return membership;
}

// Helper: verify project access
async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check org membership
  await verifyOrgMembership(project.organizationId, userId);

  return project;
}

// List projects (for user's organizations)
projectRoutes.get('/', async (c) => {
  const user = c.get('user');

  // Get user's organization memberships
  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.userId, user.sub),
  });

  const orgIds = memberships.map((m) => m.organizationId);

  if (orgIds.length === 0) {
    return c.json({ projects: [] });
  }

  // Get projects for those organizations
  const userProjects = await db.query.projects.findMany({
    where: and(isNull(projects.deletedAt)),
    orderBy: [desc(projects.updatedAt)],
    with: {
      organization: { columns: { id: true, name: true, slug: true } },
      assessments: { columns: { id: true } },
    },
  });

  // Filter to only org projects
  const filteredProjects = userProjects.filter((p) => orgIds.includes(p.organizationId));

  return c.json({
    projects: filteredProjects.map((p) => ({
      ...p,
      assessmentCount: p.assessments.length,
      assessments: undefined,
    })),
  });
});

// Create project
projectRoutes.post('/', validateBody(createProjectSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody') as CreateProjectInput;

  // Verify org membership
  await verifyOrgMembership(body.organizationId, user.sub);

  const [newProject] = await db
    .insert(projects)
    .values({
      organizationId: body.organizationId,
      name: body.name,
      description: body.description,
      ownerId: user.sub,
    })
    .returning();

  if (!newProject) {
    throw new Error('Failed to create project');
  }

  // Add owner as project member
  await db.insert(projectMembers).values({
    projectId: newProject.id,
    userId: user.sub,
    role: 'owner',
  });

  return c.json({ project: newProject }, 201);
});

// Get single project
projectRoutes.get('/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  await verifyProjectAccess(projectId, user.sub);

  // Get full project with relations
  const fullProject = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      organization: { columns: { id: true, name: true, slug: true } },
      assessments: {
        where: isNull(assessments.deletedAt),
        orderBy: [desc(assessments.updatedAt)],
      },
    },
  });

  return c.json({ project: fullProject });
});

// Update project
projectRoutes.patch('/:projectId', validateBody(updateProjectSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const body = c.get('validatedBody') as UpdateProjectInput;

  await verifyProjectAccess(projectId, user.sub);

  const [updated] = await db
    .update(projects)
    .set({
      name: body.name,
      description: body.description,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  // Invalidate cache
  await cacheDelete(cacheKeys.project(projectId));

  return c.json({ project: updated });
});

// Delete project (soft delete)
projectRoutes.delete('/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProjectAccess(projectId, user.sub);

  // Only owner can delete
  if (project.ownerId !== user.sub) {
    throw new ForbiddenError('Only the project owner can delete this project');
  }

  await db
    .update(projects)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  // Invalidate cache
  await cacheDelete(cacheKeys.project(projectId));
  await cacheDelete(cacheKeys.projectList(user.sub));

  return c.json({ success: true });
});

export { projectRoutes };
