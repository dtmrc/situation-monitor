import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { users } from '../schema';
import type * as schema from '../schema';

type DB = NodePgDatabase<typeof schema>;

export interface DemoUser {
  key: string;
  email: string;
  name: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    key: 'admin',
    email: 'admin@situation-monitor.dev',
    name: 'Sarah Chen',
  },
  {
    key: 'lead_analyst',
    email: 'analyst.lead@situation-monitor.dev',
    name: 'Marcus Rodriguez',
  },
  {
    key: 'analyst_1',
    email: 'analyst1@situation-monitor.dev',
    name: 'Emily Watson',
  },
  {
    key: 'analyst_2',
    email: 'analyst2@situation-monitor.dev',
    name: 'James Park',
  },
  {
    key: 'analyst_3',
    email: 'analyst3@situation-monitor.dev',
    name: 'Aisha Patel',
  },
  {
    key: 'viewer_1',
    email: 'viewer1@situation-monitor.dev',
    name: 'Robert Thompson',
  },
  {
    key: 'viewer_2',
    email: 'viewer2@situation-monitor.dev',
    name: 'Lisa Martinez',
  },
  {
    key: 'client_exec',
    email: 'executive@client-corp.example',
    name: 'Michael Brooks',
  },
];

export async function seedUsers(db: DB): Promise<Record<string, string>> {
  const userIds: Record<string, string> = {};

  for (const user of DEMO_USERS) {
    const [created] = await db
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    if (created) {
      userIds[user.key] = created.id;
    }
  }

  return userIds;
}
