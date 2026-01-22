/**
 * Telegram OSINT Feed Types
 *
 * Type definitions for Telegram channel monitoring via MTProto API.
 * Supports message parsing, entity extraction, and translation.
 */

/**
 * Channel categories for grouping and filtering
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
 * Telegram channel configuration
 */
export interface TelegramChannel {
  /** Database ID */
  id: string;
  /** Project this channel belongs to */
  projectId: string;
  /** Telegram channel ID (numeric) */
  telegramId: string;
  /** Channel username (without @) */
  username: string;
  /** Channel display title */
  title: string;
  /** Category for grouping */
  category: TelegramChannelCategory;
  /** Optional description */
  description?: string;
  /** Whether actively monitoring */
  active: boolean;
  /** Subscriber count (if available) */
  participantsCount?: number;
  /** Last message ID we've processed */
  lastMessageId?: number;
  /** Last fetch timestamp */
  lastFetchAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Telegram message entity (links, mentions, hashtags, etc.)
 */
export interface TelegramEntity {
  /** Entity type */
  type:
    | 'url'
    | 'text_url'
    | 'mention'
    | 'hashtag'
    | 'cashtag'
    | 'bold'
    | 'italic'
    | 'code'
    | 'pre'
    | 'email'
    | 'phone'
    | 'bot_command';
  /** Start position in text */
  offset: number;
  /** Length of entity */
  length: number;
  /** URL for text_url and url types */
  url?: string;
  /** Extracted text for this entity */
  text?: string;
}

/**
 * Telegram media attachment
 */
export interface TelegramMedia {
  /** Media type */
  type: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'animation' | 'sticker';
  /** File ID for retrieval */
  fileId?: string;
  /** File size in bytes */
  fileSize?: number;
  /** MIME type */
  mimeType?: string;
  /** File name for documents */
  fileName?: string;
  /** Duration for audio/video (seconds) */
  duration?: number;
  /** Width for photos/videos */
  width?: number;
  /** Height for photos/videos */
  height?: number;
  /** Thumbnail preview (base64 or URL) */
  thumbnail?: string;
  /** Caption text */
  caption?: string;
}

/**
 * Forwarded message info
 */
export interface TelegramForwardInfo {
  /** Original sender ID (user or channel) */
  fromId?: string;
  /** Original channel ID */
  fromChannelId?: string;
  /** Original channel username */
  fromChannelUsername?: string;
  /** Original sender name */
  fromName?: string;
  /** Original message ID */
  fromMessageId?: number;
  /** Original post date */
  date?: Date;
}

/**
 * Reply information
 */
export interface TelegramReplyInfo {
  /** Message ID being replied to */
  replyToMsgId: number;
  /** Thread ID (for forum topics) */
  topMsgId?: number;
}

/**
 * Reaction data
 */
export interface TelegramReaction {
  /** Emoji or custom reaction ID */
  reaction: string;
  /** Number of users who reacted */
  count: number;
}

/**
 * Detected language information
 */
export interface LanguageInfo {
  /** Detected language code (ISO 639-1) */
  code: string;
  /** Language name */
  name: string;
  /** Detection confidence (0-1) */
  confidence: number;
}

/**
 * Translation result
 */
export interface TranslationResult {
  /** Original text */
  original: string;
  /** Translated text */
  translated: string;
  /** Source language */
  sourceLanguage: LanguageInfo;
  /** Target language code */
  targetLanguage: string;
  /** Translation provider used */
  provider: 'google' | 'deepl' | 'libretranslate' | 'none';
  /** Whether translation was from cache */
  cached: boolean;
}

/**
 * Telegram message with full metadata
 */
export interface TelegramMessage {
  /** Database ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Channel database ID */
  channelId: string;
  /** Telegram message ID */
  telegramMessageId: number;
  /** Message text content */
  text: string;
  /** Translated text (if applicable) */
  translatedText?: string;
  /** Detected language */
  language?: LanguageInfo;
  /** Translation details */
  translation?: TranslationResult;
  /** Message entities (links, mentions, etc.) */
  entities: TelegramEntity[];
  /** Media attachments */
  media: TelegramMedia[];
  /** Forward information */
  forwardedFrom?: TelegramForwardInfo;
  /** Reply information */
  replyTo?: TelegramReplyInfo;
  /** View count */
  views?: number;
  /** Forward count */
  forwards?: number;
  /** Reactions */
  reactions?: TelegramReaction[];
  /** Message date */
  date: Date;
  /** Edit date (if edited) */
  editDate?: Date;
  /** Whether message is pinned */
  pinned: boolean;
  /** Extracted named entities */
  extractedEntities?: ExtractedTelegramEntities;
  /** Sentiment analysis result */
  sentiment?: TelegramSentiment;
  /** Raw message data from API */
  raw?: unknown;
  /** Processing timestamp */
  processedAt: Date;
  /** Database creation timestamp */
  createdAt: Date;
}

/**
 * Extracted named entities from message
 */
export interface ExtractedTelegramEntities {
  /** People mentioned */
  people: string[];
  /** Organizations */
  organizations: string[];
  /** Locations with optional coordinates */
  locations: Array<{
    name: string;
    type: 'country' | 'city' | 'region' | 'landmark';
    coordinates?: { lat: number; lng: number };
  }>;
  /** Event types detected */
  events: string[];
}

/**
 * Sentiment analysis for Telegram message
 */
export interface TelegramSentiment {
  /** Score from -1 (negative) to 1 (positive) */
  score: number;
  /** Categorical label */
  label: 'negative' | 'neutral' | 'positive';
  /** Confidence (0-1) */
  confidence: number;
}

/**
 * Feed configuration specific to Telegram
 */
export interface TelegramFeedConfig {
  /** Authentication method */
  method: 'mtproto' | 'rss';
  /** API ID for MTProto */
  apiId?: number;
  /** API Hash for MTProto */
  apiHash?: string;
  /** Session string for persistent auth */
  sessionString?: string;
  /** Channels to monitor (usernames or IDs) */
  channels: string[];
  /** Enable automatic translation */
  translateEnabled: boolean;
  /** Target language for translation */
  translateTargetLanguage: string;
  /** Translation provider preference */
  translationProvider: 'google' | 'deepl' | 'libretranslate';
  /** Languages to auto-translate (ISO codes) */
  autoTranslateLanguages: string[];
  /** Maximum messages per channel per fetch */
  messagesPerFetch: number;
  /** Include media metadata */
  includeMedia: boolean;
  /** Extract entities from messages */
  extractEntities: boolean;
  /** Analyze sentiment */
  analyzeSentiment: boolean;
}

/**
 * Telegram worker job data
 */
export interface TelegramJobData {
  /** Project ID */
  projectId: string;
  /** Specific channel to process (optional, processes all if omitted) */
  channelId?: string;
  /** Feed config ID */
  feedConfigId: string;
  /** Processing options */
  options: {
    /** Max messages to fetch per channel */
    limit?: number;
    /** Translate messages */
    translate?: boolean;
    /** Extract entities */
    extractEntities?: boolean;
    /** Analyze sentiment */
    analyzeSentiment?: boolean;
  };
}

/**
 * Telegram worker job result
 */
export interface TelegramJobResult {
  /** Number of channels processed */
  channelsProcessed: number;
  /** Number of messages fetched */
  messagesFetched: number;
  /** Number of messages stored */
  messagesStored: number;
  /** Number of messages translated */
  messagesTranslated: number;
  /** Errors encountered */
  errors: string[];
  /** Processing duration (ms) */
  durationMs: number;
}

/**
 * Stats for a Telegram channel
 */
export interface TelegramChannelStats {
  /** Channel ID */
  channelId: string;
  /** Total messages stored */
  totalMessages: number;
  /** Messages in last 24 hours */
  messagesLast24h: number;
  /** Messages in last 7 days */
  messagesLast7d: number;
  /** Average messages per day */
  avgMessagesPerDay: number;
  /** Most common language */
  primaryLanguage?: string;
  /** Average sentiment score */
  avgSentiment?: number;
  /** Top entities mentioned */
  topEntities?: {
    locations: Array<{ name: string; count: number }>;
    organizations: Array<{ name: string; count: number }>;
    people: Array<{ name: string; count: number }>;
  };
}

/**
 * Filters for querying Telegram messages
 */
export interface TelegramMessageFilters {
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Filter by category */
  categories?: TelegramChannelCategory[];
  /** Filter by language codes */
  languages?: string[];
  /** Filter by date range */
  dateFrom?: Date;
  dateTo?: Date;
  /** Search text */
  searchText?: string;
  /** Filter by sentiment */
  sentiment?: 'negative' | 'neutral' | 'positive';
  /** Has translation */
  hasTranslation?: boolean;
  /** Has media */
  hasMedia?: boolean;
  /** Is forwarded */
  isForwarded?: boolean;
  /** Minimum views */
  minViews?: number;
  /** Pagination */
  limit?: number;
  offset?: number;
  /** Sort order */
  sortBy?: 'date' | 'views' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}
