/**
 * Telegram OSINT Worker
 *
 * Dedicated BullMQ worker for Telegram channel ingestion with:
 * - MTProto adapter integration
 * - Translation service
 * - Entity extraction
 * - Sentiment analysis
 * - Database storage
 * - Rate limiting (1 job per 5 seconds)
 */

import { Worker, Queue, type Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';

import { db } from '../../db';
import { feedConfigs } from '../../db/schema/feeds';
import { telegramMessages, type TelegramMessageInsert } from '../../db/schema/telegram';
import { TelegramAdapter } from '../../feeds/adapters/telegram';
import {
  telegramTranslator,
  telegramChannelManager,
  extractEntities,
  analyzeSentiment,
} from '../../feeds/services';
import type {
  TelegramJobData,
  TelegramJobResult,
  TelegramFeedConfig,
} from '../../feeds/types/telegram.types';
import { createWorkerConnection, tripwireCheckQueue } from '../queues';

// Worker configuration
const WORKER_CONCURRENCY = 1; // Single job at a time for rate limiting
const RATE_LIMIT_MS = 5000; // 5 seconds between jobs

// Create dedicated queue for telegram jobs
export const telegramIngestQueue = new Queue<TelegramJobData>('telegram-ingest', {
  connection: createWorkerConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000, // 10 seconds initial delay
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 500,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

/**
 * Create the Telegram worker
 */
export function createTelegramWorker(): Worker<TelegramJobData, TelegramJobResult> {
  const adapter = new TelegramAdapter();

  const worker = new Worker<TelegramJobData, TelegramJobResult>(
    'telegram-ingest',
    async (job: Job<TelegramJobData>): Promise<TelegramJobResult> => {
      const startTime = Date.now();
      const { projectId, feedConfigId, channelId, options } = job.data;

      console.log(`[Telegram] Processing job ${job.id} for project ${projectId}`);

      const result: TelegramJobResult = {
        channelsProcessed: 0,
        messagesFetched: 0,
        messagesStored: 0,
        messagesTranslated: 0,
        errors: [],
        durationMs: 0,
      };

      try {
        // Get feed config
        const config = await db.query.feedConfigs.findFirst({
          where: eq(feedConfigs.id, feedConfigId),
        });

        if (!config) {
          throw new Error(`Feed config not found: ${feedConfigId}`);
        }

        if (!config.enabled) {
          console.log(`[Telegram] Feed ${config.name} is disabled, skipping`);
          result.durationMs = Date.now() - startTime;
          return result;
        }

        const feedOptions = config.options as TelegramFeedConfig | null;

        // Get channels to process
        const channels = channelId
          ? [await telegramChannelManager.getChannel(projectId, channelId)]
          : await telegramChannelManager.getActiveChannels(projectId);

        const validChannels = channels.filter((c) => c !== null);

        if (validChannels.length === 0) {
          console.log(`[Telegram] No active channels for project ${projectId}`);
          result.durationMs = Date.now() - startTime;
          return result;
        }

        // Process each channel
        for (const channel of validChannels) {
          if (!channel) continue;

          try {
            // Set last message ID for incremental fetching
            if (channel.lastMessageId) {
              adapter.setLastMessageId(channel.telegramId, channel.lastMessageId);
            }

            // Fetch messages using the adapter
            const fetchResult = await adapter.fetch(
              {
                ...config,
                options: {
                  ...feedOptions,
                  channels: [`@${channel.username}`],
                  messagesPerFetch: options.limit || feedOptions?.messagesPerFetch || 50,
                },
              },
              { limit: options.limit || 50 }
            );

            result.channelsProcessed++;

            if (fetchResult.errors.length > 0) {
              result.errors.push(...fetchResult.errors.map((e) => `${channel.username}: ${e}`));
            }

            if (fetchResult.items.length === 0) {
              continue;
            }

            result.messagesFetched += fetchResult.items.length;

            // Process and store each message
            for (const item of fetchResult.items) {
              try {
                const metadata = item.metadata ?? {};
                const messageId = metadata.messageId as number;

                // Check if message already exists
                const existing = await db.query.telegramMessages.findFirst({
                  where: and(
                    eq(telegramMessages.channelId, channel.id),
                    eq(telegramMessages.telegramMessageId, messageId)
                  ),
                });

                if (existing) {
                  continue; // Skip duplicate
                }

                // Detect language and translate if needed
                let translatedText: string | undefined;
                let languageCode: string | undefined;
                let languageConfidence: number | undefined;
                let translationProvider: string | undefined;

                if (item.content && options.translate !== false) {
                  const langInfo = telegramTranslator.getLanguageInfo(item.content);
                  languageCode = langInfo.code;
                  languageConfidence = langInfo.confidence;

                  if (telegramTranslator.shouldTranslate(langInfo.code)) {
                    const translation = await telegramTranslator.translate(item.content);
                    translatedText = translation.translated;
                    translationProvider = translation.provider;
                    result.messagesTranslated++;
                  }
                }

                // Extract entities if enabled
                let extractedEntities: Record<string, unknown> | undefined;
                if (options.extractEntities !== false && item.content) {
                  const textToAnalyze = translatedText || item.content;
                  const entities = extractEntities(textToAnalyze);
                  extractedEntities = {
                    people: entities.people,
                    organizations: entities.organizations,
                    locations: entities.locations,
                    events: entities.events,
                  };
                }

                // Analyze sentiment if enabled
                let sentimentScore: number | undefined;
                let sentimentLabel: string | undefined;
                let sentimentConfidence: number | undefined;
                if (options.analyzeSentiment !== false && item.content) {
                  const textToAnalyze = translatedText || item.content;
                  const sentiment = analyzeSentiment(textToAnalyze);
                  sentimentScore = sentiment.score;
                  sentimentLabel = sentiment.label;
                  sentimentConfidence = sentiment.confidence;
                }

                // Prepare message for insertion
                const messageInsert: TelegramMessageInsert = {
                  projectId,
                  channelId: channel.id,
                  telegramMessageId: messageId,
                  text: item.content || item.title,
                  translatedText,
                  languageCode,
                  languageConfidence,
                  translationProvider,
                  targetLanguage: translatedText ? 'en' : undefined,
                  entities: metadata.entities || [],
                  media: metadata.hasMedia
                    ? (metadata.mediaTypes as string[]).map((t) => ({ type: t }))
                    : [],
                  forwardedFrom: metadata.forwardedFrom as Record<string, unknown> | undefined,
                  replyTo: metadata.replyTo as Record<string, unknown> | undefined,
                  views: metadata.views as number | undefined,
                  forwards: metadata.forwards as number | undefined,
                  reactions: metadata.reactions as unknown[] | undefined,
                  messageDate: item.timestamp,
                  pinned: (metadata.pinned as boolean) || false,
                  extractedEntities,
                  sentimentScore,
                  sentimentLabel,
                  sentimentConfidence,
                  raw: item.raw as Record<string, unknown> | undefined,
                };

                // Insert message
                const [inserted] = await db
                  .insert(telegramMessages)
                  .values(messageInsert)
                  .returning();

                result.messagesStored++;

                // Queue for tripwire processing
                if (inserted) {
                  const locations = extractedEntities?.locations as
                    | Array<{ coordinates?: { lat: number; lng: number } }>
                    | undefined;
                  const coords = locations?.[0];

                  await tripwireCheckQueue.add(
                    `tripwire:telegram:${inserted.id}`,
                    {
                      feedItemId: inserted.id,
                      projectId,
                      feedType: 'telegram',
                      latitude: coords?.coordinates?.lat,
                      longitude: coords?.coordinates?.lng,
                      metadata: {
                        channelId: channel.id,
                        channelUsername: channel.username,
                        messageId,
                        sentiment: sentimentLabel,
                        language: languageCode,
                        hasTranslation: !!translatedText,
                        entities: extractedEntities,
                      },
                    },
                    {
                      jobId: `tripwire:telegram:${inserted.id}`,
                    }
                  );
                }

                // Update channel's last message ID
                if (messageId > (channel.lastMessageId || 0)) {
                  await telegramChannelManager.updateLastMessageId(channel.id, messageId);
                }
              } catch (msgError) {
                const errorMsg = msgError instanceof Error ? msgError.message : 'Unknown error';
                result.errors.push(`Message processing error: ${errorMsg}`);
              }
            }

            console.log(
              `[Telegram] Processed ${fetchResult.items.length} messages from ${channel.username}`
            );
          } catch (channelError) {
            const errorMsg = channelError instanceof Error ? channelError.message : 'Unknown error';
            result.errors.push(`Channel ${channel.username}: ${errorMsg}`);
            await telegramChannelManager.recordError(channel.id, errorMsg);
          }
        }

        // Update feed config last fetch time
        await db
          .update(feedConfigs)
          .set({
            lastFetchAt: new Date(),
            lastError: result.errors.length > 0 ? result.errors.join('; ') : null,
            errorCount: result.errors.length > 0 ? 1 : 0,
            updatedAt: new Date(),
          })
          .where(eq(feedConfigs.id, feedConfigId));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(errorMsg);
        console.error(`[Telegram] Job ${job.id} error:`, error);
      }

      result.durationMs = Date.now() - startTime;
      console.log(
        `[Telegram] Job ${job.id} completed: ${result.messagesStored} messages stored, ${result.errors.length} errors`
      );

      return result;
    },
    {
      connection: createWorkerConnection(),
      concurrency: WORKER_CONCURRENCY,
      limiter: {
        max: 1,
        duration: RATE_LIMIT_MS,
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(
      `[Telegram] Job ${job.id} completed: ${result.messagesStored} stored, ${result.messagesTranslated} translated`
    );
  });

  worker.on('failed', (job, error) => {
    console.error(`[Telegram] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Telegram] Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Telegram] Job ${jobId} stalled`);
  });

  console.log(`[Telegram] Worker started with rate limit: 1 job per ${RATE_LIMIT_MS}ms`);

  return worker;
}

let workerInstance: Worker<TelegramJobData, TelegramJobResult> | null = null;

/**
 * Start the Telegram worker
 */
export function startTelegramWorker(): Worker<TelegramJobData, TelegramJobResult> {
  if (workerInstance) {
    console.warn('[Telegram] Worker already running');
    return workerInstance;
  }

  workerInstance = createTelegramWorker();
  return workerInstance;
}

/**
 * Stop the Telegram worker gracefully
 */
export async function stopTelegramWorker(): Promise<void> {
  if (!workerInstance) {
    return;
  }

  console.log('[Telegram] Stopping worker...');
  await workerInstance.close();
  workerInstance = null;
  console.log('[Telegram] Worker stopped');
}

/**
 * Get worker status
 */
export function getTelegramWorkerStatus(): {
  running: boolean;
  isPaused: boolean;
} {
  if (!workerInstance) {
    return { running: false, isPaused: false };
  }

  return {
    running: workerInstance.isRunning(),
    isPaused: workerInstance.isPaused(),
  };
}

/**
 * Schedule a Telegram ingest job
 */
export async function scheduleTelegramIngest(
  projectId: string,
  feedConfigId: string,
  options: {
    channelId?: string;
    limit?: number;
    translate?: boolean;
    extractEntities?: boolean;
    analyzeSentiment?: boolean;
    delay?: number;
  } = {}
): Promise<string> {
  const jobId = `telegram:${projectId}:${options.channelId || 'all'}:${Date.now()}`;

  const job = await telegramIngestQueue.add(
    jobId,
    {
      projectId,
      feedConfigId,
      channelId: options.channelId,
      options: {
        limit: options.limit,
        translate: options.translate,
        extractEntities: options.extractEntities,
        analyzeSentiment: options.analyzeSentiment,
      },
    },
    {
      jobId,
      delay: options.delay,
    }
  );

  console.log(`[Telegram] Scheduled job ${job.id} for project ${projectId}`);

  return job.id || jobId;
}

/**
 * Schedule recurring Telegram ingest
 */
export async function scheduleRecurringTelegramIngest(
  projectId: string,
  feedConfigId: string,
  intervalMs: number = 300000 // 5 minutes default
): Promise<void> {
  const repeatJobId = `telegram:recurring:${projectId}`;

  // Remove existing repeating job
  const existingJobs = await telegramIngestQueue.getRepeatableJobs();
  const existing = existingJobs.find((j) => j.id === repeatJobId);
  if (existing) {
    await telegramIngestQueue.removeRepeatableByKey(existing.key);
  }

  // Add new repeating job
  await telegramIngestQueue.add(
    repeatJobId,
    {
      projectId,
      feedConfigId,
      options: {},
    },
    {
      repeat: {
        every: intervalMs,
      },
      jobId: repeatJobId,
    }
  );

  console.log(
    `[Telegram] Scheduled recurring job for project ${projectId} every ${intervalMs / 1000}s`
  );
}

/**
 * Remove recurring Telegram ingest
 */
export async function removeRecurringTelegramIngest(projectId: string): Promise<void> {
  const repeatJobId = `telegram:recurring:${projectId}`;

  const existingJobs = await telegramIngestQueue.getRepeatableJobs();
  const existing = existingJobs.find((j) => j.id === repeatJobId);

  if (existing) {
    await telegramIngestQueue.removeRepeatableByKey(existing.key);
    console.log(`[Telegram] Removed recurring job for project ${projectId}`);
  }
}
