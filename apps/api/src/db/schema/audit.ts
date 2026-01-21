import { pgSchema, uuid, varchar, text, timestamp, pgEnum, inet } from 'drizzle-orm/pg-core';

export const auditSchema = pgSchema('audit');

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'share',
]);

// Audit Logs
export const auditLogs = auditSchema.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  oldValue: text('old_value'), // JSON
  newValue: text('new_value'), // JSON
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
