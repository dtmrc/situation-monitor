import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { organizations, organizationMembers } from '../schema';
import type * as schema from '../schema';

type DB = NodePgDatabase<typeof schema>;

interface DemoOrganization {
  key: string;
  name: string;
  slug: string;
  description: string;
  members: { userKey: string; role: 'owner' | 'admin' | 'member' | 'viewer' }[];
}

const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  {
    key: 'acme_intel',
    name: 'Acme Intelligence Group',
    slug: 'acme-intel',
    description: 'Strategic intelligence and risk consulting firm',
    members: [
      { userKey: 'admin', role: 'owner' },
      { userKey: 'lead_analyst', role: 'admin' },
      { userKey: 'analyst_1', role: 'member' },
      { userKey: 'analyst_2', role: 'member' },
      { userKey: 'analyst_3', role: 'member' },
      { userKey: 'viewer_1', role: 'viewer' },
    ],
  },
  {
    key: 'global_ventures',
    name: 'Global Ventures Capital',
    slug: 'global-ventures',
    description: 'VC firm specializing in emerging markets',
    members: [
      { userKey: 'viewer_2', role: 'owner' },
      { userKey: 'client_exec', role: 'admin' },
    ],
  },
  {
    key: 'personal_workspace',
    name: 'Personal Workspace',
    slug: 'personal',
    description: 'Individual analyst workspace',
    members: [{ userKey: 'analyst_1', role: 'owner' }],
  },
];

export async function seedOrganizations(
  db: DB,
  userIds: Record<string, string>
): Promise<Record<string, string>> {
  const orgIds: Record<string, string> = {};

  for (const org of DEMO_ORGANIZATIONS) {
    const [created] = await db
      .insert(organizations)
      .values({
        name: org.name,
        slug: org.slug,
        description: org.description,
        status: 'active',
        settings: JSON.stringify({
          maxProjects: -1,
          maxMembers: -1,
          features: {
            aiAssist: true,
            advancedExports: true,
            apiAccess: true,
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: organizations.id });

    if (created) {
      orgIds[org.key] = created.id;

      // Add organization members
      for (const member of org.members) {
        const userId = userIds[member.userKey];
        if (userId) {
          await db
            .insert(organizationMembers)
            .values({
              organizationId: created.id,
              userId,
              role: member.role,
              joinedAt: new Date(),
            })
            .onConflictDoNothing();
        }
      }
    }
  }

  return orgIds;
}
