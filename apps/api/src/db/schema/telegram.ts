/**
 * Telegram OSINT Database Schema
 *
 * Tables for storing Telegram channels and messages
 * with support for translations, entities, and sentiment.
 */

import { relations } from 'drizzle-orm';
import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  boolean,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';

import { projects } from './core';
import { feedsSchema, feedConfigs } from './feeds';

// ============================================================================
// Enums
// ============================================================================

/**
 * Channel category values (stored as varchar)
 */
export const TELEGRAM_CHANNEL_CATEGORIES = [
  'military',
  'political',
  'economic',
  'social',
  'media',
  'regional',
  'infrastructure',
  'other',
] as const;

export type TelegramChannelCategory = (typeof TELEGRAM_CHANNEL_CATEGORIES)[number];

// ============================================================================
// Tables
// ============================================================================

/**
 * Telegram Channels Table
 *
 * Stores channel configurations for monitoring.
 */
export const telegramChannels = feedsSchema.table(
  'telegram_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    feedConfigId: uuid('feed_config_id').references(() => feedConfigs.id, { onDelete: 'set null' }),
    /** Telegram's internal channel ID */
    telegramId: varchar('telegram_id', { length: 50 }).notNull(),
    /** Channel username (without @) */
    username: varchar('username', { length: 100 }).notNull(),
    /** Channel display title */
    title: varchar('title', { length: 255 }).notNull(),
    /** Category for grouping */
    category: varchar('category', { length: 50 }).default('other').notNull(),
    /** Optional description */
    description: text('description'),
    /** Whether actively monitoring */
    active: boolean('active').default(true).notNull(),
    /** Subscriber count */
    participantsCount: integer('participants_count'),
    /** Last processed message ID */
    lastMessageId: integer('last_message_id'),
    /** Last successful fetch */
    lastFetchAt: timestamp('last_fetch_at'),
    /** Fetch error count */
    errorCount: integer('error_count').default(0).notNull(),
    /** Last error message */
    lastError: text('last_error'),
    /** Channel metadata from Telegram */
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('telegram_channels_project_idx').on(table.projectId),
    categoryIdx: index('telegram_channels_category_idx').on(table.category),
    activeIdx: index('telegram_channels_active_idx').on(table.active),
    telegramIdIdx: index('telegram_channels_telegram_id_idx').on(table.telegramId),
    usernameIdx: index('telegram_channels_username_idx').on(table.username),
  })
);

/**
 * Telegram Messages Table
 *
 * Stores messages with translations and analysis.
 */
export const telegramMessages = feedsSchema.table(
  'telegram_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    channelId: uuid('channel_id')
      .references(() => telegramChannels.id, { onDelete: 'cascade' })
      .notNull(),
    /** Telegram's message ID within the channel */
    telegramMessageId: integer('telegram_message_id').notNull(),
    /** Original message text */
    text: text('text').notNull(),
    /** Translated text */
    translatedText: text('translated_text'),
    /** Detected language code (ISO 639-1) */
    languageCode: varchar('language_code', { length: 10 }),
    /** Language detection confidence */
    languageConfidence: real('language_confidence'),
    /** Translation provider used */
    translationProvider: varchar('translation_provider', { length: 20 }),
    /** Target language for translation */
    targetLanguage: varchar('target_language', { length: 10 }),
    /** Message entities (links, mentions, hashtags) */
    entities: jsonb('entities').default([]).notNull(),
    /** Media attachments metadata */
    media: jsonb('media').default([]).notNull(),
    /** Forward info if forwarded */
    forwardedFrom: jsonb('forwarded_from'),
    /** Reply info if reply */
    replyTo: jsonb('reply_to'),
    /** View count */
    views: integer('views'),
    /** Forward count */
    forwards: integer('forwards'),
    /** Reactions data */
    reactions: jsonb('reactions'),
    /** Message timestamp */
    messageDate: timestamp('message_date').notNull(),
    /** Edit timestamp */
    editDate: timestamp('edit_date'),
    /** Is pinned message */
    pinned: boolean('pinned').default(false).notNull(),
    /** Extracted named entities (people, orgs, locations) */
    extractedEntities: jsonb('extracted_entities'),
    /** Sentiment score (-1 to 1) */
    sentimentScore: real('sentiment_score'),
    /** Sentiment label */
    sentimentLabel: varchar('sentiment_label', { length: 20 }),
    /** Sentiment confidence */
    sentimentConfidence: real('sentiment_confidence'),
    /** Raw API response */
    raw: jsonb('raw'),
    /** Processing timestamp */
    processedAt: timestamp('processed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    channelIdx: index('telegram_messages_channel_idx').on(table.channelId),
    projectIdx: index('telegram_messages_project_idx').on(table.projectId),
    dateIdx: index('telegram_messages_date_idx').on(table.messageDate),
    languageIdx: index('telegram_messages_language_idx').on(table.languageCode),
    sentimentIdx: index('telegram_messages_sentiment_idx').on(table.sentimentLabel),
    telegramMsgIdx: index('telegram_messages_telegram_msg_idx').on(
      table.channelId,
      table.telegramMessageId
    ),
    viewsIdx: index('telegram_messages_views_idx').on(table.views),
  })
);

// ============================================================================
// Relations
// ============================================================================

export const telegramChannelsRelations = relations(telegramChannels, ({ one, many }) => ({
  project: one(projects, {
    fields: [telegramChannels.projectId],
    references: [projects.id],
  }),
  feedConfig: one(feedConfigs, {
    fields: [telegramChannels.feedConfigId],
    references: [feedConfigs.id],
  }),
  messages: many(telegramMessages),
}));

export const telegramMessagesRelations = relations(telegramMessages, ({ one }) => ({
  project: one(projects, {
    fields: [telegramMessages.projectId],
    references: [projects.id],
  }),
  channel: one(telegramChannels, {
    fields: [telegramMessages.channelId],
    references: [telegramChannels.id],
  }),
}));

// ============================================================================
// Types
// ============================================================================

export type TelegramChannelInsert = typeof telegramChannels.$inferInsert;
export type TelegramChannelSelect = typeof telegramChannels.$inferSelect;
export type TelegramMessageInsert = typeof telegramMessages.$inferInsert;
export type TelegramMessageSelect = typeof telegramMessages.$inferSelect;
