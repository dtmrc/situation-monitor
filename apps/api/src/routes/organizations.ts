import { randomBytes } from 'crypto';

import { eq, and } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db';
import { organizations, organizationMembers, organizationInvitations, users } from '../db/schema';
import { ForbiddenError, NotFoundError, ConflictError } from '../lib/errors';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import type { AppEnv } from '../types';

const orgRoutes = new Hono<AppEnv>();

orgRoutes.use('*', authMiddleware);

// Schemas
const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

type CreateOrgInput = z.infer<typeof createOrgSchema>;
type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// Helper functions
async function verifyOrgMembership(orgId: string, userId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return membership;
}

async function verifyOrgAdmin(orgId: string, userId: string) {
  const membership = await verifyOrgMembership(orgId, userId);

  if (!['owner', 'admin'].includes(membership.role)) {
    throw new ForbiddenError('Admin access required');
  }

  return membership;
}

async function verifyOrgOwner(orgId: string, userId: string) {
  const membership = await verifyOrgMembership(orgId, userId);

  if (membership.role !== 'owner') {
    throw new ForbiddenError('Owner access required');
  }

  return membership;
}

// List user's organizations
orgRoutes.get('/', async (c) => {
  const user = c.get('user');

  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.userId, user.sub),
    with: {
      organization: true,
    },
  });

  return c.json({
    organizations: memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    })),
  });
});

// Create organization
orgRoutes.post('/', validateBody(createOrgSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody') as CreateOrgInput;

  // Check slug uniqueness
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, body.slug),
  });

  if (existing) {
    throw new ConflictError('Organization slug already exists');
  }

  // Create org and add creator as owner
  const [org] = await db
    .insert(organizations)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description,
    })
    .returning();

  if (!org) {
    throw new Error('Failed to create organization');
  }

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: user.sub,
    role: 'owner',
    invitedBy: user.sub,
  });

  return c.json({ organization: org }, 201);
});

// Get organization
orgRoutes.get('/:orgId', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');

  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, user.sub)
    ),
    with: { organization: true },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return c.json({
    organization: membership.organization,
    role: membership.role,
  });
});

// List organization members
orgRoutes.get('/:orgId/members', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');

  await verifyOrgMembership(orgId, user.sub);

  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.organizationId, orgId),
  });

  // Get user details separately (since no direct relation)
  const memberUserIds = members.map((m) => m.userId);
  const memberUsers = await db.query.users.findMany({
    where: (users, { inArray }) => inArray(users.id, memberUserIds),
    columns: { id: true, name: true, email: true, avatarUrl: true },
  });

  const userMap = new Map(memberUsers.map((u) => [u.id, u]));

  return c.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: userMap.get(m.userId),
    })),
  });
});

// Invite member
orgRoutes.post('/:orgId/invitations', validateBody(inviteMemberSchema), async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const body = c.get('validatedBody') as InviteMemberInput;

  await verifyOrgAdmin(orgId, user.sub);

  // Check if already member
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, body.email),
  });

  if (existingUser) {
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, existingUser.id)
      ),
    });

    if (existingMember) {
      throw new ConflictError('User is already a member');
    }
  }

  // Generate invitation token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  const [invitation] = await db
    .insert(organizationInvitations)
    .values({
      organizationId: orgId,
      email: body.email,
      role: body.role,
      token,
      invitedBy: user.sub,
      expiresAt,
    })
    .returning();

  // TODO: Send invitation email
  console.log(`[Org] Invitation token for ${body.email}: ${token}`);

  return c.json({ invitation }, 201);
});

// Accept invitation
orgRoutes.post('/invitations/:token/accept', async (c) => {
  const user = c.get('user');
  const token = c.req.param('token');

  const invitation = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.token, token),
      eq(organizationInvitations.email, user.email)
    ),
    with: { organization: true },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation');
  }

  if (invitation.acceptedAt) {
    throw new ConflictError('Invitation already accepted');
  }

  if (new Date() > invitation.expiresAt) {
    throw new ConflictError('Invitation expired');
  }

  // Create membership
  await db.insert(organizationMembers).values({
    organizationId: invitation.organizationId,
    userId: user.sub,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
  });

  // Mark invitation as accepted
  await db
    .update(organizationInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvitations.id, invitation.id));

  return c.json({ success: true, organization: invitation.organization });
});

// Update member role
orgRoutes.patch('/:orgId/members/:memberId', validateBody(updateMemberRoleSchema), async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const memberId = c.req.param('memberId');
  const body = c.get('validatedBody') as UpdateMemberRoleInput;

  await verifyOrgOwner(orgId, user.sub);

  // Prevent changing own role
  const memberToUpdate = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, memberId),
  });

  if (!memberToUpdate) {
    throw new NotFoundError('Member');
  }

  if (memberToUpdate.userId === user.sub) {
    throw new ForbiddenError('Cannot change your own role');
  }

  const [updated] = await db
    .update(organizationMembers)
    .set({ role: body.role })
    .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Member');
  }

  return c.json({ member: updated });
});

// Remove member
orgRoutes.delete('/:orgId/members/:memberId', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const memberId = c.req.param('memberId');

  await verifyOrgAdmin(orgId, user.sub);

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, memberId),
  });

  if (!member) {
    throw new NotFoundError('Member');
  }

  // Prevent removing the owner
  if (member.role === 'owner') {
    throw new ForbiddenError('Cannot remove organization owner');
  }

  // Prevent removing yourself
  if (member.userId === user.sub) {
    throw new ForbiddenError('Cannot remove yourself');
  }

  await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

  return c.json({ success: true });
});

export { orgRoutes };
