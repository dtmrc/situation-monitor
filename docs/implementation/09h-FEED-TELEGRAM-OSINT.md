# Phase 9h: Telegram Channel Feed Ingestion

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers Telegram channel ingestion for OSINT (Open Source Intelligence) purposes, enabling real-time monitoring of breaking news, conflict updates, and regional intelligence from Telegram channels. Telegram has become a critical source for OSINT analysts due to its prevalence in conflict zones, ease of use for citizen journalists, and real-time nature of updates.

**Tasks Covered:** 9.26, 9.27, 9.28

> **Setup Guide:** For step-by-step configuration instructions, see [TELEGRAM-SETUP.md](../guides/TELEGRAM-SETUP.md)

---

## Why Telegram for OSINT

| Advantage | Description |
|-----------|-------------|
| **Real-time Breaking News** | Often first source for incidents in conflict zones (Ukraine, Middle East, etc.) |
| **Citizen Journalism** | Local reporters and witnesses share unfiltered content |
| **Official Channels** | Government agencies, military, emergency services post updates |
| **Regional Coverage** | Strong presence in Russia, CIS, Middle East, Iran, Brazil |
| **Multimedia Content** | Photos, videos, documents shared directly |
| **Minimal Censorship** | Less moderation than mainstream social platforms |
| **Geolocated Posts** | Some channels include location metadata |

---

## Recommended Channel Categories

| Category | Example Channels | Use Case |
|----------|------------------|----------|
| **Conflict Monitoring** | Ukraine military channels, Syrian civil war trackers | Real-time battlefield updates |
| **Government/Official** | Ministry channels, emergency services | Official announcements, alerts |
| **News Aggregators** | Regional news channels, breaking news bots | Curated news from multiple sources |
| **Aviation/Maritime** | Plane spotters, ship tracking channels | Movement tracking, incident reports |
| **Weather/Natural Disasters** | Earthquake monitors, storm chasers | Natural hazard early warning |
| **Cyber/InfoSec** | Ransomware leak channels, breach notifications | Cyber threat intelligence |
| **Economic/Financial** | Sanctions tracking, commodity channels | Economic intelligence |

---

## Telegram API Options

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **MTProto (GramJS/Telethon)** | Full API access, real-time, all message types | Requires phone auth, rate limits | Production systems |
| **Telegram Bot API** | Simple setup, no phone needed | Cannot read channel history, limited access | Bot-based workflows |
| **Web Scraping** | No API needed | Fragile, may violate ToS, no real-time | Backup/research only |
| **Third-party APIs** | Easy integration | Costs, reliability, data ownership | Quick prototypes |

**Recommended:** MTProto via GramJS for Node.js/TypeScript

---

## Telegram Message Schema

**File: `apps/api/src/feeds/types/telegram.types.ts`**
```typescript
export interface TelegramChannel {
  id: string;
  username?: string;
  title: string;
  description?: string;
  participantCount?: number;
  photo?: string;
  isVerified: boolean;
  isRestricted: boolean;
  restrictionReason?: string;
  language?: string;
  category?: TelegramChannelCategory;
  addedAt: Date;
  lastFetchedAt?: Date;
  isActive: boolean;
}

export type TelegramChannelCategory =
  | 'conflict'
  | 'government'
  | 'news'
  | 'aviation'
  | 'maritime'
  | 'weather'
  | 'cyber'
  | 'economic'
  | 'other';

export interface TelegramMessage {
  id: string;
  channelId: string;
  channelUsername?: string;
  channelTitle: string;

  messageId: number;
  date: Date;
  editDate?: Date;

  text?: string;
  textEntities?: TelegramEntity[];

  media?: TelegramMedia;

  forwardFrom?: {
    channelId?: string;
    channelTitle?: string;
    messageId?: number;
    date?: Date;
  };

  replyTo?: {
    messageId: number;
  };

  views?: number;
  forwards?: number;

  // Enrichment fields
  translatedText?: string;
  detectedLanguage?: string;
  sentiment?: number;
  entities?: ExtractedEntities;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramEntity {
  type: 'mention' | 'hashtag' | 'url' | 'bold' | 'italic' | 'code' | 'text_link';
  offset: number;
  length: number;
  url?: string;
}

export interface TelegramMedia {
  type: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'video_note' | 'sticker' | 'animation';
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  localPath?: string;
}

export interface ExtractedEntities {
  people: string[];
  organizations: string[];
  locations: Array<{
    name: string;
    type: 'country' | 'city' | 'region' | 'landmark';
    coordinates?: { lat: number; lng: number };
  }>;
  hashtags: string[];
  mentions: string[];
  urls: string[];
}

export interface TelegramFeedConfig {
  channels: string[]; // Channel usernames or IDs
  languages?: string[];
  translateTo?: string;
  downloadMedia?: boolean;
  mediaTypes?: TelegramMedia['type'][];
  maxMessagesPerFetch?: number;
  filterKeywords?: string[];
  excludeKeywords?: string[];
}
```

---

## Telegram Adapter (GramJS)

**File: `apps/api/src/feeds/adapters/telegram/telegram.adapter.ts`**
```typescript
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type {
  TelegramMessage,
  TelegramChannel,
  TelegramMedia,
  TelegramEntity,
  TelegramFeedConfig
} from '../../types/telegram.types';

export class TelegramAdapter extends BaseFeedAdapter {
  name = 'Telegram';
  type = 'telegram';

  private client!: TelegramClient;
  private apiId!: number;
  private apiHash!: string;
  private sessionString!: string;
  private channels: string[] = [];
  private lastMessageIds: Map<string, number> = new Map();
  private maxMessagesPerFetch: number = 100;
  private downloadMedia: boolean = false;

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);

    this.apiId = parseInt(process.env.TELEGRAM_API_ID!, 10);
    this.apiHash = process.env.TELEGRAM_API_HASH!;
    this.sessionString = process.env.TELEGRAM_SESSION_STRING!;

    const telegramConfig = config.options as TelegramFeedConfig;
    this.channels = telegramConfig?.channels || [];
    this.maxMessagesPerFetch = telegramConfig?.maxMessagesPerFetch || 100;
    this.downloadMedia = telegramConfig?.downloadMedia || false;

    const session = new StringSession(this.sessionString);
    this.client = new TelegramClient(session, this.apiId, this.apiHash, {
      connectionRetries: 5,
      useWSS: true,
    });

    await this.client.connect();
    console.log('[Telegram] Connected successfully');
  }

  async fetch(): Promise<TelegramMessage[]> {
    const allMessages: TelegramMessage[] = [];

    for (const channelIdentifier of this.channels) {
      try {
        const messages = await this.fetchChannelMessages(channelIdentifier);
        allMessages.push(...messages);
      } catch (error) {
        console.error(`[Telegram] Failed to fetch ${channelIdentifier}:`, error);
      }
    }

    return allMessages;
  }

  private async fetchChannelMessages(channelIdentifier: string): Promise<TelegramMessage[]> {
    const entity = await this.client.getEntity(channelIdentifier);

    if (!(entity instanceof Api.Channel)) {
      console.warn(`[Telegram] ${channelIdentifier} is not a channel`);
      return [];
    }

    const channelId = entity.id.toString();
    const minId = this.lastMessageIds.get(channelId) || 0;

    const result = await this.client.invoke(
      new Api.messages.GetHistory({
        peer: entity,
        limit: this.maxMessagesPerFetch,
        minId: minId,
        offsetId: 0,
        offsetDate: 0,
        addOffset: 0,
        maxId: 0,
        hash: BigInt(0),
      })
    );

    if (!('messages' in result)) {
      return [];
    }

    const messages: TelegramMessage[] = [];
    let maxMessageId = minId;

    for (const msg of result.messages) {
      if (!(msg instanceof Api.Message)) continue;

      const messageId = msg.id;
      if (messageId > maxMessageId) {
        maxMessageId = messageId;
      }

      const telegramMessage = this.parseMessage(msg, entity);
      if (telegramMessage) {
        messages.push(telegramMessage);
      }
    }

    if (maxMessageId > minId) {
      this.lastMessageIds.set(channelId, maxMessageId);
    }

    return messages;
  }

  private parseMessage(msg: Api.Message, channel: Api.Channel): TelegramMessage | null {
    const channelId = channel.id.toString();
    const channelUsername = channel.username || undefined;
    const channelTitle = channel.title;

    const message: TelegramMessage = {
      id: `tg-${channelId}-${msg.id}`,
      channelId,
      channelUsername,
      channelTitle,
      messageId: msg.id,
      date: new Date(msg.date * 1000),
      editDate: msg.editDate ? new Date(msg.editDate * 1000) : undefined,
      text: msg.message || undefined,
      textEntities: this.parseEntities(msg.entities),
      media: this.parseMedia(msg.media),
      views: msg.views,
      forwards: msg.forwards,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Parse forward info
    if (msg.fwdFrom) {
      message.forwardFrom = {
        channelId: msg.fwdFrom.fromId?.toString(),
        date: msg.fwdFrom.date ? new Date(msg.fwdFrom.date * 1000) : undefined,
      };
    }

    // Parse reply info
    if (msg.replyTo && 'replyToMsgId' in msg.replyTo) {
      message.replyTo = {
        messageId: msg.replyTo.replyToMsgId,
      };
    }

    return message;
  }

  private parseEntities(entities?: Api.TypeMessageEntity[]): TelegramEntity[] | undefined {
    if (!entities) return undefined;

    return entities.map((entity) => {
      let type: TelegramEntity['type'] = 'bold';
      let url: string | undefined;

      if (entity instanceof Api.MessageEntityMention) type = 'mention';
      else if (entity instanceof Api.MessageEntityHashtag) type = 'hashtag';
      else if (entity instanceof Api.MessageEntityUrl) type = 'url';
      else if (entity instanceof Api.MessageEntityBold) type = 'bold';
      else if (entity instanceof Api.MessageEntityItalic) type = 'italic';
      else if (entity instanceof Api.MessageEntityCode) type = 'code';
      else if (entity instanceof Api.MessageEntityTextUrl) {
        type = 'text_link';
        url = entity.url;
      }

      return {
        type,
        offset: entity.offset,
        length: entity.length,
        url,
      };
    });
  }

  private parseMedia(media?: Api.TypeMessageMedia): TelegramMedia | undefined {
    if (!media) return undefined;

    if (media instanceof Api.MessageMediaPhoto) {
      const photo = media.photo;
      if (photo instanceof Api.Photo) {
        const largest = photo.sizes[photo.sizes.length - 1];
        return {
          type: 'photo',
          fileId: photo.id.toString(),
          width: 'w' in largest ? largest.w : undefined,
          height: 'h' in largest ? largest.h : undefined,
        };
      }
    }

    if (media instanceof Api.MessageMediaDocument) {
      const doc = media.document;
      if (doc instanceof Api.Document) {
        const isVideo = doc.mimeType?.startsWith('video/');
        const isAudio = doc.mimeType?.startsWith('audio/');
        const isAnimation = doc.mimeType === 'image/gif' ||
          doc.attributes.some(a => a instanceof Api.DocumentAttributeAnimated);

        let type: TelegramMedia['type'] = 'document';
        if (isVideo) type = 'video';
        else if (isAudio) type = 'audio';
        else if (isAnimation) type = 'animation';

        const fileNameAttr = doc.attributes.find(
          a => a instanceof Api.DocumentAttributeFilename
        ) as Api.DocumentAttributeFilename | undefined;

        const videoAttr = doc.attributes.find(
          a => a instanceof Api.DocumentAttributeVideo
        ) as Api.DocumentAttributeVideo | undefined;

        return {
          type,
          fileId: doc.id.toString(),
          fileName: fileNameAttr?.fileName,
          mimeType: doc.mimeType,
          fileSize: Number(doc.size),
          width: videoAttr?.w,
          height: videoAttr?.h,
          duration: videoAttr?.duration,
        };
      }
    }

    return undefined;
  }

  normalize(message: TelegramMessage): any {
    return {
      id: message.id,
      type: 'telegram',
      title: `${message.channelTitle}: ${(message.text || '').slice(0, 100)}...`,
      content: message.text || '',
      timestamp: message.date,
      location: message.location,
      metadata: {
        source: 'telegram',
        channelId: message.channelId,
        channelUsername: message.channelUsername,
        channelTitle: message.channelTitle,
        messageId: message.messageId,
        views: message.views,
        forwards: message.forwards,
        hasMedia: !!message.media,
        mediaType: message.media?.type,
        detectedLanguage: message.detectedLanguage,
        translatedText: message.translatedText,
      },
      raw: message,
    };
  }

  async getChannelInfo(channelIdentifier: string): Promise<TelegramChannel | null> {
    try {
      const entity = await this.client.getEntity(channelIdentifier);

      if (!(entity instanceof Api.Channel)) {
        return null;
      }

      const fullChannel = await this.client.invoke(
        new Api.channels.GetFullChannel({ channel: entity })
      );

      const full = fullChannel.fullChat as Api.ChannelFull;

      return {
        id: entity.id.toString(),
        username: entity.username || undefined,
        title: entity.title,
        description: full.about || undefined,
        participantCount: full.participantsCount,
        isVerified: entity.verified || false,
        isRestricted: entity.restricted || false,
        restrictionReason: entity.restrictionReason?.[0]?.reason,
        addedAt: new Date(),
        isActive: true,
      };
    } catch (error) {
      console.error(`[Telegram] Failed to get channel info for ${channelIdentifier}:`, error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}
```

---

## Telegram Session Setup Script

**File: `apps/api/scripts/telegram-session-setup.ts`**
```typescript
/**
 * One-time script to generate a Telegram session string.
 * Run with: npx ts-node scripts/telegram-session-setup.ts
 *
 * Prerequisites:
 * 1. Get API credentials from https://my.telegram.org/apps
 * 2. Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline';

const apiId = parseInt(process.env.TELEGRAM_API_ID!, 10);
const apiHash = process.env.TELEGRAM_API_HASH!;

if (!apiId || !apiHash) {
  console.error('Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in environment');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('Telegram Session Setup');
  console.log('======================\n');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await prompt('Enter your phone number (with country code): '),
    password: async () => await prompt('Enter your 2FA password (if enabled): '),
    phoneCode: async () => await prompt('Enter the code you received: '),
    onError: (err) => console.error('Error:', err),
  });

  console.log('\n======================');
  console.log('Session created successfully!');
  console.log('\nAdd this to your .env file:');
  console.log(`TELEGRAM_SESSION_STRING=${client.session.save()}`);
  console.log('\n======================');

  await client.disconnect();
  rl.close();
}

main().catch(console.error);
```

---

## Telegram Translator Service

**File: `apps/api/src/feeds/services/telegram-translator.ts`**
```typescript
import type { TelegramMessage } from '../types/telegram.types';

interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
}

type TranslationProvider = 'google' | 'deepl' | 'libre';

const SUPPORTED_LANGUAGES = new Set([
  'ru', 'uk', 'ar', 'fa', 'he', 'zh', 'ja', 'ko', 'pt', 'es', 'fr', 'de'
]);

export class TelegramTranslator {
  private provider: TranslationProvider;
  private apiKey: string;
  private targetLanguage: string;
  private cache: Map<string, TranslationResult> = new Map();

  constructor(options?: {
    provider?: TranslationProvider;
    apiKey?: string;
    targetLanguage?: string;
  }) {
    this.provider = options?.provider || 'google';
    this.apiKey = options?.apiKey ||
      process.env.GOOGLE_TRANSLATE_API_KEY ||
      process.env.DEEPL_API_KEY || '';
    this.targetLanguage = options?.targetLanguage || 'en';
  }

  async translateMessage(message: TelegramMessage): Promise<TelegramMessage> {
    if (!message.text) return message;

    const detectedLang = this.detectLanguage(message.text);

    // Skip if already in target language
    if (detectedLang === this.targetLanguage) {
      return {
        ...message,
        detectedLanguage: detectedLang,
      };
    }

    // Skip if not a supported source language
    if (!SUPPORTED_LANGUAGES.has(detectedLang)) {
      return {
        ...message,
        detectedLanguage: detectedLang,
      };
    }

    try {
      const result = await this.translate(message.text, detectedLang);

      return {
        ...message,
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage,
      };
    } catch (error) {
      console.error('[Translator] Translation failed:', error);
      return {
        ...message,
        detectedLanguage: detectedLang,
      };
    }
  }

  private async translate(text: string, sourceLang: string): Promise<TranslationResult> {
    // Check cache first
    const cacheKey = `${sourceLang}:${this.targetLanguage}:${text.slice(0, 100)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let result: TranslationResult;

    switch (this.provider) {
      case 'google':
        result = await this.translateWithGoogle(text, sourceLang);
        break;
      case 'deepl':
        result = await this.translateWithDeepL(text, sourceLang);
        break;
      case 'libre':
        result = await this.translateWithLibre(text, sourceLang);
        break;
      default:
        throw new Error(`Unknown translation provider: ${this.provider}`);
    }

    // Cache result
    this.cache.set(cacheKey, result);

    // Limit cache size
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    return result;
  }

  private async translateWithGoogle(text: string, sourceLang: string): Promise<TranslationResult> {
    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: this.targetLanguage,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data.data.translations[0];

    return {
      translatedText: translation.translatedText,
      detectedLanguage: translation.detectedSourceLanguage || sourceLang,
      confidence: 1.0,
    };
  }

  private async translateWithDeepL(text: string, sourceLang: string): Promise<TranslationResult> {
    const url = 'https://api-free.deepl.com/v2/translate';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang.toUpperCase(),
        target_lang: this.targetLanguage.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data.translations[0];

    return {
      translatedText: translation.text,
      detectedLanguage: translation.detected_source_language?.toLowerCase() || sourceLang,
      confidence: 1.0,
    };
  }

  private async translateWithLibre(text: string, sourceLang: string): Promise<TranslationResult> {
    const url = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000/translate';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: this.targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      translatedText: data.translatedText,
      detectedLanguage: sourceLang,
      confidence: 0.9,
    };
  }

  private detectLanguage(text: string): string {
    // Simple heuristic-based language detection
    // In production, use a proper detection library or API

    const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
    const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const hebrewCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const chineseCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.length;

    if (totalChars === 0) return 'en';

    const cyrillicRatio = cyrillicCount / totalChars;
    const arabicRatio = arabicCount / totalChars;
    const hebrewRatio = hebrewCount / totalChars;
    const chineseRatio = chineseCount / totalChars;

    if (cyrillicRatio > 0.3) {
      // Distinguish Russian from Ukrainian
      const ukrainianChars = (text.match(/[іїєґ]/gi) || []).length;
      return ukrainianChars > 5 ? 'uk' : 'ru';
    }

    if (arabicRatio > 0.3) return 'ar';
    if (hebrewRatio > 0.3) return 'he';
    if (chineseRatio > 0.3) return 'zh';

    // Check for Persian (Farsi) specific characters within Arabic script
    const persianChars = (text.match(/[پچژگک]/g) || []).length;
    if (arabicRatio > 0.2 && persianChars > 3) return 'fa';

    return 'en';
  }

  async translateBatch(messages: TelegramMessage[]): Promise<TelegramMessage[]> {
    const results: TelegramMessage[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const translated = await Promise.all(
        batch.map(msg => this.translateMessage(msg))
      );
      results.push(...translated);

      // Small delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}
```

---

## Telegram Channel Manager

**File: `apps/api/src/feeds/services/telegram-channel-manager.ts`**
```typescript
import { db } from '../../db';
import { telegramChannels } from '../../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { TelegramChannel, TelegramChannelCategory } from '../types/telegram.types';
import { TelegramAdapter } from '../adapters/telegram/telegram.adapter';

export class TelegramChannelManager {
  private adapter: TelegramAdapter;

  constructor(adapter: TelegramAdapter) {
    this.adapter = adapter;
  }

  async addChannel(
    identifier: string,
    category?: TelegramChannelCategory
  ): Promise<TelegramChannel | null> {
    // Fetch channel info from Telegram
    const channelInfo = await this.adapter.getChannelInfo(identifier);

    if (!channelInfo) {
      console.error(`[ChannelManager] Channel not found: ${identifier}`);
      return null;
    }

    // Add category
    channelInfo.category = category;

    // Insert or update in database
    await db.insert(telegramChannels)
      .values({
        id: channelInfo.id,
        username: channelInfo.username,
        title: channelInfo.title,
        description: channelInfo.description,
        participantCount: channelInfo.participantCount,
        isVerified: channelInfo.isVerified,
        isRestricted: channelInfo.isRestricted,
        restrictionReason: channelInfo.restrictionReason,
        category: channelInfo.category,
        isActive: true,
        addedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: telegramChannels.id,
        set: {
          title: channelInfo.title,
          description: channelInfo.description,
          participantCount: channelInfo.participantCount,
          isVerified: channelInfo.isVerified,
          isRestricted: channelInfo.isRestricted,
          restrictionReason: channelInfo.restrictionReason,
          category: channelInfo.category,
        },
      });

    console.log(`[ChannelManager] Added channel: ${channelInfo.title} (${channelInfo.id})`);
    return channelInfo;
  }

  async removeChannel(channelId: string): Promise<void> {
    await db.update(telegramChannels)
      .set({ isActive: false })
      .where(eq(telegramChannels.id, channelId));

    console.log(`[ChannelManager] Deactivated channel: ${channelId}`);
  }

  async getActiveChannels(category?: TelegramChannelCategory): Promise<TelegramChannel[]> {
    const conditions = [eq(telegramChannels.isActive, true)];

    if (category) {
      conditions.push(eq(telegramChannels.category, category));
    }

    const channels = await db.select()
      .from(telegramChannels)
      .where(and(...conditions));

    return channels as TelegramChannel[];
  }

  async updateLastFetched(channelId: string): Promise<void> {
    await db.update(telegramChannels)
      .set({ lastFetchedAt: new Date() })
      .where(eq(telegramChannels.id, channelId));
  }

  async getChannelStats(): Promise<{
    total: number;
    active: number;
    byCategory: Record<string, number>;
  }> {
    const channels = await db.select().from(telegramChannels);

    const byCategory: Record<string, number> = {};
    let active = 0;

    for (const channel of channels) {
      if (channel.isActive) active++;
      const cat = channel.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    return {
      total: channels.length,
      active,
      byCategory,
    };
  }
}
```

---

## Telegram Worker

**File: `apps/api/src/jobs/workers/telegram.worker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { processQueue, type IngestJobData } from '../queues';
import { TelegramAdapter } from '../../feeds/adapters/telegram/telegram.adapter';
import { TelegramTranslator } from '../../feeds/services/telegram-translator';
import { TelegramChannelManager } from '../../feeds/services/telegram-channel-manager';
import { extractEntities } from '../../feeds/services/entity-extractor';
import { analyzeSentiment } from '../../feeds/services/sentiment';
import type { TelegramMessage, TelegramFeedConfig } from '../../feeds/types/telegram.types';
import { db } from '../../db';
import { telegramMessages } from '../../db/schema';

let adapter: TelegramAdapter | null = null;
let translator: TelegramTranslator | null = null;
let channelManager: TelegramChannelManager | null = null;

async function initializeServices(): Promise<void> {
  if (!adapter) {
    adapter = new TelegramAdapter();
    await adapter.initialize({
      id: 'telegram-main',
      name: 'Telegram OSINT Feed',
      type: 'telegram',
      enabled: true,
      options: {} as TelegramFeedConfig,
    });

    translator = new TelegramTranslator({
      provider: (process.env.TRANSLATION_PROVIDER as any) || 'google',
      targetLanguage: 'en',
    });

    channelManager = new TelegramChannelManager(adapter);
  }
}

export const telegramWorker = new Worker<IngestJobData>(
  'telegram-ingest',
  async (job: Job<IngestJobData>) => {
    await initializeServices();

    const { projectId, feedId } = job.data.metadata || {};

    // Get active channels for this project
    const channels = await channelManager!.getActiveChannels();

    if (channels.length === 0) {
      return { processed: 0, message: 'No active channels' };
    }

    // Update adapter with channel list
    const channelIdentifiers = channels.map(c => c.username || c.id);
    await adapter!.initialize({
      id: feedId || 'telegram-main',
      name: 'Telegram OSINT Feed',
      type: 'telegram',
      enabled: true,
      options: {
        channels: channelIdentifiers,
        maxMessagesPerFetch: 50,
      } as TelegramFeedConfig,
    });

    // Fetch messages
    const rawMessages = await adapter!.fetch();

    if (rawMessages.length === 0) {
      return { processed: 0, message: 'No new messages' };
    }

    console.log(`[TelegramWorker] Fetched ${rawMessages.length} messages`);

    // Translate messages
    const translatedMessages = await translator!.translateBatch(rawMessages);

    // Process each message
    let processed = 0;
    for (const message of translatedMessages) {
      try {
        // Extract entities
        const text = message.translatedText || message.text || '';
        const entities = extractEntities(text);

        // Analyze sentiment
        const sentiment = analyzeSentiment(text);

        // Enrich message
        const enrichedMessage: TelegramMessage = {
          ...message,
          entities,
          sentiment: sentiment.score,
        };

        // Store in database
        await db.insert(telegramMessages)
          .values({
            id: enrichedMessage.id,
            channelId: enrichedMessage.channelId,
            channelUsername: enrichedMessage.channelUsername,
            channelTitle: enrichedMessage.channelTitle,
            messageId: enrichedMessage.messageId,
            date: enrichedMessage.date,
            text: enrichedMessage.text,
            translatedText: enrichedMessage.translatedText,
            detectedLanguage: enrichedMessage.detectedLanguage,
            hasMedia: !!enrichedMessage.media,
            mediaType: enrichedMessage.media?.type,
            views: enrichedMessage.views,
            forwards: enrichedMessage.forwards,
            sentiment: enrichedMessage.sentiment,
            entities: enrichedMessage.entities,
            raw: enrichedMessage as any,
            createdAt: new Date(),
          })
          .onConflictDoNothing();

        // Queue for further processing (tripwire checks, etc.)
        const normalizedItem = adapter!.normalize(enrichedMessage);
        await processQueue.add('process', {
          feedItemId: normalizedItem.id,
          projectId: projectId || 'default',
          type: 'telegram',
          normalizedData: normalizedItem,
        });

        processed++;
      } catch (error) {
        console.error(`[TelegramWorker] Failed to process message ${message.id}:`, error);
      }
    }

    // Update last fetched timestamps
    for (const channel of channels) {
      await channelManager!.updateLastFetched(channel.id);
    }

    return { processed, total: rawMessages.length };
  },
  {
    connection: redis,
    concurrency: 1, // Single connection to Telegram
    limiter: {
      max: 1,
      duration: 5000, // Rate limit: 1 job per 5 seconds
    },
  }
);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[TelegramWorker] Shutting down...');
  await telegramWorker.close();
  if (adapter) {
    await adapter.disconnect();
  }
});
```

---

## Database Schema

**File: `apps/api/src/db/schema/telegram.ts`**
```typescript
import { pgTable, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';

export const telegramChannels = pgTable('telegram_channels', {
  id: text('id').primaryKey(),
  username: text('username'),
  title: text('title').notNull(),
  description: text('description'),
  participantCount: integer('participant_count'),
  isVerified: boolean('is_verified').default(false),
  isRestricted: boolean('is_restricted').default(false),
  restrictionReason: text('restriction_reason'),
  language: text('language'),
  category: text('category'),
  addedAt: timestamp('added_at').defaultNow(),
  lastFetchedAt: timestamp('last_fetched_at'),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  categoryIdx: index('telegram_channels_category_idx').on(table.category),
  activeIdx: index('telegram_channels_active_idx').on(table.isActive),
}));

export const telegramMessages = pgTable('telegram_messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => telegramChannels.id),
  channelUsername: text('channel_username'),
  channelTitle: text('channel_title').notNull(),
  messageId: integer('message_id').notNull(),
  date: timestamp('date').notNull(),
  editDate: timestamp('edit_date'),
  text: text('text'),
  translatedText: text('translated_text'),
  detectedLanguage: text('detected_language'),
  hasMedia: boolean('has_media').default(false),
  mediaType: text('media_type'),
  mediaFileId: text('media_file_id'),
  mediaLocalPath: text('media_local_path'),
  views: integer('views'),
  forwards: integer('forwards'),
  sentiment: integer('sentiment'), // -100 to 100
  entities: jsonb('entities'),
  location: jsonb('location'),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  channelIdx: index('telegram_messages_channel_idx').on(table.channelId),
  dateIdx: index('telegram_messages_date_idx').on(table.date),
  languageIdx: index('telegram_messages_language_idx').on(table.detectedLanguage),
  channelMessageIdx: index('telegram_messages_channel_message_idx').on(table.channelId, table.messageId),
}));
```

---

## Telegram Feed Panel UI

**File: `apps/web/src/features/feeds/components/TelegramFeedPanel.tsx`**
```tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Eye,
  Share2,
  Globe,
  Image,
  Video,
  FileText,
  ChevronDown,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { fetchTelegramMessages, type TelegramMessageResponse } from '@/lib/api/feeds';

interface TelegramFeedPanelProps {
  projectId: string;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  conflict: 'bg-red-500/20 text-red-400 border-red-500/30',
  government: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  news: 'bg-green-500/20 text-green-400 border-green-500/30',
  aviation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  maritime: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  weather: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cyber: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  economic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const LANGUAGE_FLAGS: Record<string, string> = {
  ru: '🇷🇺',
  uk: '🇺🇦',
  ar: '🇸🇦',
  fa: '🇮🇷',
  he: '🇮🇱',
  zh: '🇨🇳',
  en: '🇺🇸',
};

function MediaIcon({ type }: { type?: string }) {
  switch (type) {
    case 'photo':
      return <Image className="h-3 w-3" />;
    case 'video':
    case 'animation':
      return <Video className="h-3 w-3" />;
    case 'document':
      return <FileText className="h-3 w-3" />;
    default:
      return null;
  }
}

function SentimentIndicator({ score }: { score?: number }) {
  if (score === undefined) return null;

  const color = score > 20
    ? 'bg-green-500'
    : score < -20
      ? 'bg-red-500'
      : 'bg-gray-500';

  return (
    <div
      className={cn('h-1 w-8 rounded-full', color)}
      title={`Sentiment: ${score}`}
    />
  );
}

export function TelegramFeedPanel({ projectId, className }: TelegramFeedPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showTranslated, setShowTranslated] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['telegram-messages', projectId, categoryFilter, languageFilter],
    queryFn: () => fetchTelegramMessages(projectId, {
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      language: languageFilter !== 'all' ? languageFilter : undefined,
      limit: 100,
    }),
    refetchInterval: 30 * 1000, // 30 seconds
  });

  const messages = data?.messages || [];

  const groupedMessages = useMemo(() => {
    const groups: Record<string, TelegramMessageResponse[]> = {};

    for (const msg of messages) {
      const channelKey = msg.channelId;
      if (!groups[channelKey]) {
        groups[channelKey] = [];
      }
      groups[channelKey].push(msg);
    }

    return Object.entries(groups).sort((a, b) => {
      const latestA = a[1][0]?.date || '';
      const latestB = b[1][0]?.date || '';
      return new Date(latestB).getTime() - new Date(latestA).getTime();
    });
  }, [messages]);

  return (
    <div className={cn('flex flex-col h-full bg-background/95', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-accent-blue" />
          <h2 className="text-sm font-semibold text-foreground">Telegram Feed</h2>
          <Badge variant="outline" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="conflict">Conflict</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="aviation">Aviation</SelectItem>
            <SelectItem value="maritime">Maritime</SelectItem>
            <SelectItem value="cyber">Cyber</SelectItem>
          </SelectContent>
        </Select>

        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ru">Russian</SelectItem>
            <SelectItem value="uk">Ukrainian</SelectItem>
            <SelectItem value="ar">Arabic</SelectItem>
            <SelectItem value="fa">Persian</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showTranslated ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowTranslated(!showTranslated)}
        >
          <Globe className="h-3 w-3 mr-1" />
          Translated
        </Button>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No messages found
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {groupedMessages.map(([channelId, channelMessages]) => (
              <ChannelMessageGroup
                key={channelId}
                messages={channelMessages}
                showTranslated={showTranslated}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ChannelMessageGroupProps {
  messages: TelegramMessageResponse[];
  showTranslated: boolean;
}

function ChannelMessageGroup({ messages, showTranslated }: ChannelMessageGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const firstMessage = messages[0];
  const category = firstMessage?.category || 'other';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs', CATEGORY_COLORS[category])}
            >
              {category}
            </Badge>
            <span className="text-sm font-medium text-foreground">
              {firstMessage?.channelTitle}
            </span>
            {firstMessage?.channelUsername && (
              <span className="text-xs text-muted-foreground">
                @{firstMessage.channelUsername}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {messages.length}
            </Badge>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="divide-y divide-border/20">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              showTranslated={showTranslated}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface MessageItemProps {
  message: TelegramMessageResponse;
  showTranslated: boolean;
}

function MessageItem({ message, showTranslated }: MessageItemProps) {
  const displayText = showTranslated && message.translatedText
    ? message.translatedText
    : message.text;

  const hasTranslation = message.translatedText && message.detectedLanguage !== 'en';

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* Message Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
          </span>

          {message.detectedLanguage && (
            <span title={message.detectedLanguage}>
              {LANGUAGE_FLAGS[message.detectedLanguage] || message.detectedLanguage}
            </span>
          )}

          {message.hasMedia && (
            <span className="flex items-center gap-1 text-accent-blue">
              <MediaIcon type={message.mediaType} />
            </span>
          )}

          {hasTranslation && showTranslated && (
            <Badge variant="outline" className="text-xs py-0">
              <Globe className="h-2.5 w-2.5 mr-1" />
              translated
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {message.views && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {message.views.toLocaleString()}
            </span>
          )}
          {message.forwards && (
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              {message.forwards.toLocaleString()}
            </span>
          )}
          <SentimentIndicator score={message.sentiment} />
        </div>
      </div>

      {/* Message Content */}
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {displayText || <span className="text-muted-foreground italic">[No text content]</span>}
      </p>

      {/* Original text toggle */}
      {hasTranslation && showTranslated && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Show original ({message.detectedLanguage})
          </summary>
          <p className="mt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap">
            {message.text}
          </p>
        </details>
      )}

      {/* Entities */}
      {message.entities && (
        <div className="flex flex-wrap gap-1 mt-2">
          {message.entities.locations?.slice(0, 3).map((loc, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-xs bg-accent-blue/10 text-accent-blue border-accent-blue/30"
            >
              {loc.name}
            </Badge>
          ))}
          {message.entities.organizations?.slice(0, 2).map((org, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-xs bg-accent-amber/10 text-accent-amber border-accent-amber/30"
            >
              {org}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## API Types

**File: `apps/web/src/lib/api/feeds/telegram.ts`**
```typescript
import { apiClient } from '../client';

export interface TelegramMessageResponse {
  id: string;
  channelId: string;
  channelUsername?: string;
  channelTitle: string;
  category?: string;
  messageId: number;
  date: string;
  text?: string;
  translatedText?: string;
  detectedLanguage?: string;
  hasMedia: boolean;
  mediaType?: string;
  views?: number;
  forwards?: number;
  sentiment?: number;
  entities?: {
    people?: string[];
    organizations?: string[];
    locations?: Array<{
      name: string;
      type: string;
      coordinates?: { lat: number; lng: number };
    }>;
    hashtags?: string[];
    mentions?: string[];
  };
}

export interface TelegramMessagesResponse {
  messages: TelegramMessageResponse[];
  total: number;
  hasMore: boolean;
}

export interface TelegramMessageFilters {
  category?: string;
  language?: string;
  channelId?: string;
  startDate?: string;
  endDate?: string;
  hasMedia?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchTelegramMessages(
  projectId: string,
  filters?: TelegramMessageFilters
): Promise<TelegramMessagesResponse> {
  const params = new URLSearchParams();

  if (filters?.category) params.set('category', filters.category);
  if (filters?.language) params.set('language', filters.language);
  if (filters?.channelId) params.set('channelId', filters.channelId);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.hasMedia !== undefined) params.set('hasMedia', String(filters.hasMedia));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));

  const response = await apiClient.get<TelegramMessagesResponse>(
    `/projects/${projectId}/feeds/telegram/messages?${params.toString()}`
  );

  return response.data;
}

export interface TelegramChannelResponse {
  id: string;
  username?: string;
  title: string;
  description?: string;
  participantCount?: number;
  isVerified: boolean;
  category?: string;
  isActive: boolean;
  lastFetchedAt?: string;
}

export async function fetchTelegramChannels(
  projectId: string
): Promise<TelegramChannelResponse[]> {
  const response = await apiClient.get<{ channels: TelegramChannelResponse[] }>(
    `/projects/${projectId}/feeds/telegram/channels`
  );

  return response.data.channels;
}

export async function addTelegramChannel(
  projectId: string,
  identifier: string,
  category?: string
): Promise<TelegramChannelResponse> {
  const response = await apiClient.post<TelegramChannelResponse>(
    `/projects/${projectId}/feeds/telegram/channels`,
    { identifier, category }
  );

  return response.data;
}

export async function removeTelegramChannel(
  projectId: string,
  channelId: string
): Promise<void> {
  await apiClient.delete(
    `/projects/${projectId}/feeds/telegram/channels/${channelId}`
  );
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/types/telegram.types.ts` | Type definitions for Telegram messages and channels |
| `apps/api/src/feeds/adapters/telegram/telegram.adapter.ts` | GramJS-based Telegram adapter |
| `apps/api/scripts/telegram-session-setup.ts` | Session string generation script |
| `apps/api/src/feeds/services/telegram-translator.ts` | Translation service with multi-provider support |
| `apps/api/src/feeds/services/telegram-channel-manager.ts` | Channel subscription management |
| `apps/api/src/jobs/workers/telegram.worker.ts` | BullMQ worker for message ingestion |
| `apps/api/src/db/schema/telegram.ts` | Database schema for channels and messages |
| `apps/web/src/features/feeds/components/TelegramFeedPanel.tsx` | React feed panel component |
| `apps/web/src/lib/api/feeds/telegram.ts` | API client functions |

---

## Acceptance Criteria

- [ ] Telegram adapter connects using GramJS with session string authentication
- [ ] Session setup script generates valid session string for environment
- [ ] Adapter fetches messages from multiple channels with rate limiting
- [ ] Message parsing extracts text, media metadata, views, and forwards
- [ ] Forward and reply metadata is captured correctly
- [ ] Language detection identifies Russian, Ukrainian, Arabic, Persian, Hebrew, Chinese
- [ ] Translation service supports Google, DeepL, and LibreTranslate providers
- [ ] Translation results are cached to reduce API calls
- [ ] Channel manager can add, remove, and list monitored channels
- [ ] Worker processes messages with proper rate limiting (1 job per 5 seconds)
- [ ] Database schema supports efficient queries by channel, date, and language
- [ ] Feed panel displays messages grouped by channel
- [ ] Filter by category and language works correctly
- [ ] Translation toggle shows original or translated text
- [ ] Sentiment indicator displays correctly
- [ ] Entity badges show extracted locations and organizations
- [ ] View and forward counts display properly
- [ ] Auto-refresh updates every 30 seconds

---

## Environment Variables

```bash
# Telegram API (from https://my.telegram.org/apps)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_SESSION_STRING=your_session_string_here

# Translation (choose one provider)
TRANSLATION_PROVIDER=google  # or 'deepl' or 'libre'
GOOGLE_TRANSLATE_API_KEY=your_google_key
DEEPL_API_KEY=your_deepl_key
LIBRETRANSLATE_URL=http://localhost:5000  # for self-hosted

# Optional media storage
TELEGRAM_MEDIA_STORAGE_PATH=/data/telegram-media
```

---

## Dependencies

```bash
cd apps/api
pnpm add telegram  # GramJS
pnpm add -D @types/node
```

---

## Security Considerations

1. **Session String Protection**: Store `TELEGRAM_SESSION_STRING` securely (secrets manager, encrypted env)
2. **Rate Limiting**: Respect Telegram's rate limits to avoid account restrictions
3. **Content Filtering**: Some channels may contain graphic/sensitive content
4. **Legal Compliance**: Ensure monitoring complies with local laws and Telegram ToS
5. **Data Retention**: Implement appropriate retention policies for stored messages
6. **Access Control**: Restrict channel management to authorized users only
