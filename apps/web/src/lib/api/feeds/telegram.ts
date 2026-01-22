/**
 * Telegram Feed API Client
 *
 * API functions for Telegram OSINT feed endpoints.
 */

import { api } from '../../api';

// ============================================================================
// Types
// ============================================================================

/**
 * Telegram channel category
 */
export type TelegramChannelCategory =
  | 'military'
  | 'political'
  | 'economic'
  | 'social'
  | 'media'
  | 'regional'
  | 'infrastructure'
  | 'other';

/**
 * Telegram channel
 */
export interface TelegramChannel {
  id: string;
  projectId: string;
  telegramId: string;
  username: string;
  title: string;
  category: TelegramChannelCategory;
  description?: string;
  active: boolean;
  participantsCount?: number;
  lastMessageId?: number;
  lastFetchAt?: string;
  errorCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Telegram message entity
 */
export interface TelegramEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  text?: string;
}

/**
 * Telegram media attachment
 */
export interface TelegramMedia {
  type: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'animation' | 'sticker';
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

/**
 * Extracted entities from message
 */
export interface ExtractedEntities {
  people: string[];
  organizations: string[];
  locations: Array<{
    name: string;
    type: 'country' | 'city' | 'region' | 'landmark';
    coordinates?: { lat: number; lng: number };
  }>;
  events: string[];
}

/**
 * Telegram message
 */
export interface TelegramMessage {
  id: string;
  projectId: string;
  channelId: string;
  telegramMessageId: number;
  text: string;
  translatedText?: string;
  languageCode?: string;
  languageConfidence?: number;
  translationProvider?: string;
  targetLanguage?: string;
  entities: TelegramEntity[];
  media: TelegramMedia[];
  forwardedFrom?: {
    fromName?: string;
    fromChannelUsername?: string;
    date?: string;
  };
  replyTo?: {
    replyToMsgId: number;
  };
  views?: number;
  forwards?: number;
  reactions?: Array<{ reaction: string; count: number }>;
  messageDate: string;
  editDate?: string;
  pinned: boolean;
  extractedEntities?: ExtractedEntities;
  sentimentScore?: number;
  sentimentLabel?: 'negative' | 'neutral' | 'positive';
  sentimentConfidence?: number;
  processedAt: string;
  createdAt: string;
  // Joined data
  channel?: TelegramChannel;
}

/**
 * Message filters
 */
export interface TelegramMessageFilters {
  channelIds?: string[];
  categories?: TelegramChannelCategory[];
  languages?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchText?: string;
  sentiment?: 'negative' | 'neutral' | 'positive';
  hasTranslation?: boolean;
  hasMedia?: boolean;
  isForwarded?: boolean;
  minViews?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'views' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Channel stats
 */
export interface TelegramChannelStats {
  channelId: string;
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  avgMessagesPerDay: number;
  primaryLanguage?: string;
  avgSentiment?: number;
}

/**
 * Project stats
 */
export interface TelegramProjectStats {
  totalChannels: number;
  activeChannels: number;
  totalMessages: number;
  messagesLast24h: number;
  channelsByCategory: Record<TelegramChannelCategory, number>;
}

// ============================================================================
// Response Types
// ============================================================================

export interface TelegramMessagesResponse {
  messages: TelegramMessage[];
  total: number;
  hasMore: boolean;
}

export interface TelegramChannelsResponse {
  channels: TelegramChannel[];
  total: number;
}

export interface TelegramChannelResponse {
  channel: TelegramChannel;
}

export interface TelegramStatsResponse {
  stats: TelegramProjectStats;
}

export interface TelegramChannelStatsResponse {
  stats: TelegramChannelStats;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch Telegram messages for a project
 */
export function fetchTelegramMessages(
  projectId: string,
  filters?: TelegramMessageFilters
): Promise<TelegramMessagesResponse> {
  const params = new URLSearchParams();

  if (filters?.channelIds?.length) {
    params.set('channelIds', filters.channelIds.join(','));
  }
  if (filters?.categories?.length) {
    params.set('categories', filters.categories.join(','));
  }
  if (filters?.languages?.length) {
    params.set('languages', filters.languages.join(','));
  }
  if (filters?.dateFrom) {
    params.set('dateFrom', filters.dateFrom);
  }
  if (filters?.dateTo) {
    params.set('dateTo', filters.dateTo);
  }
  if (filters?.searchText) {
    params.set('search', filters.searchText);
  }
  if (filters?.sentiment) {
    params.set('sentiment', filters.sentiment);
  }
  if (filters?.hasTranslation !== undefined) {
    params.set('hasTranslation', String(filters.hasTranslation));
  }
  if (filters?.hasMedia !== undefined) {
    params.set('hasMedia', String(filters.hasMedia));
  }
  if (filters?.isForwarded !== undefined) {
    params.set('isForwarded', String(filters.isForwarded));
  }
  if (filters?.minViews !== undefined) {
    params.set('minViews', String(filters.minViews));
  }
  if (filters?.limit) {
    params.set('limit', String(filters.limit));
  }
  if (filters?.offset) {
    params.set('offset', String(filters.offset));
  }
  if (filters?.sortBy) {
    params.set('sortBy', filters.sortBy);
  }
  if (filters?.sortOrder) {
    params.set('sortOrder', filters.sortOrder);
  }

  const query = params.toString();
  return api.get<TelegramMessagesResponse>(
    `/projects/${projectId}/feeds/telegram/messages${query ? `?${query}` : ''}`
  );
}

/**
 * Fetch Telegram channels for a project
 */
export function fetchTelegramChannels(
  projectId: string,
  options?: {
    categories?: TelegramChannelCategory[];
    active?: boolean;
    includeMessageCount?: boolean;
  }
): Promise<TelegramChannelsResponse> {
  const params = new URLSearchParams();

  if (options?.categories?.length) {
    params.set('categories', options.categories.join(','));
  }
  if (options?.active !== undefined) {
    params.set('active', String(options.active));
  }
  if (options?.includeMessageCount) {
    params.set('includeMessageCount', 'true');
  }

  const query = params.toString();
  return api.get<TelegramChannelsResponse>(
    `/projects/${projectId}/feeds/telegram/channels${query ? `?${query}` : ''}`
  );
}

/**
 * Add a Telegram channel to monitor
 */
export function addTelegramChannel(
  projectId: string,
  data: {
    identifier: string;
    title?: string;
    category?: TelegramChannelCategory;
    description?: string;
  }
): Promise<TelegramChannelResponse> {
  return api.post<TelegramChannelResponse>(`/projects/${projectId}/feeds/telegram/channels`, data);
}

/**
 * Update a Telegram channel
 */
export function updateTelegramChannel(
  projectId: string,
  channelId: string,
  data: {
    title?: string;
    category?: TelegramChannelCategory;
    description?: string;
    active?: boolean;
  }
): Promise<TelegramChannelResponse> {
  return api.patch<TelegramChannelResponse>(
    `/projects/${projectId}/feeds/telegram/channels/${channelId}`,
    data
  );
}

/**
 * Remove a Telegram channel
 */
export function removeTelegramChannel(
  projectId: string,
  channelId: string
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(
    `/projects/${projectId}/feeds/telegram/channels/${channelId}`
  );
}

/**
 * Fetch project-level Telegram stats
 */
export function fetchTelegramStats(projectId: string): Promise<TelegramStatsResponse> {
  return api.get<TelegramStatsResponse>(`/projects/${projectId}/feeds/telegram/stats`);
}

/**
 * Fetch stats for a specific channel
 */
export function fetchTelegramChannelStats(
  projectId: string,
  channelId: string
): Promise<TelegramChannelStatsResponse> {
  return api.get<TelegramChannelStatsResponse>(
    `/projects/${projectId}/feeds/telegram/channels/${channelId}/stats`
  );
}

/**
 * Trigger manual fetch for Telegram channels
 */
export function triggerTelegramFetch(
  projectId: string,
  options?: {
    channelId?: string;
    limit?: number;
  }
): Promise<{ jobId: string }> {
  return api.post<{ jobId: string }>(`/projects/${projectId}/feeds/telegram/fetch`, options || {});
}
