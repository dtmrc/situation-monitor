/**
 * Telegram Translation Service
 *
 * Multi-provider translation service with:
 * - Language detection (Cyrillic, Arabic, Hebrew, Chinese, etc.)
 * - Google Translate, DeepL, and LibreTranslate support
 * - Translation caching with size limits
 * - Batch translation support
 */

import type { TranslationResult, LanguageInfo } from '../types/telegram.types';

/**
 * Translation provider type
 */
export type TranslationProvider = 'google' | 'deepl' | 'libretranslate' | 'none';

/**
 * Translation service configuration
 */
export interface TranslatorConfig {
  /** Default translation provider */
  provider: TranslationProvider;
  /** Target language for translation */
  targetLanguage: string;
  /** Google Translate API key */
  googleApiKey?: string;
  /** DeepL API key */
  deeplApiKey?: string;
  /** LibreTranslate API URL */
  libreTranslateUrl?: string;
  /** LibreTranslate API key (optional for some instances) */
  libreTranslateApiKey?: string;
  /** Languages to auto-translate (ISO 639-1 codes) */
  autoTranslateLanguages: string[];
  /** Maximum cache size */
  maxCacheSize: number;
}

/**
 * Cache entry for translations
 */
interface CacheEntry {
  result: TranslationResult;
  timestamp: number;
}

/**
 * Language detection result
 */
interface DetectionResult {
  languageCode: string;
  languageName: string;
  confidence: number;
  needsTranslation: boolean;
}

// Character range patterns for language detection
const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  // Cyrillic (Russian, Ukrainian, Bulgarian, etc.)
  ru: /[\u0400-\u04FF]/,
  // Arabic
  ar: /[\u0600-\u06FF]/,
  // Hebrew
  he: /[\u0590-\u05FF]/,
  // Chinese (Simplified and Traditional)
  zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  // Japanese (Hiragana, Katakana, and Kanji)
  ja: /[\u3040-\u309F\u30A0-\u30FF]/,
  // Korean
  ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  // Persian/Farsi (uses Arabic script with additional chars)
  fa: /[\u0600-\u06FF\u0750-\u077F]/,
  // Thai
  th: /[\u0E00-\u0E7F]/,
  // Greek
  el: /[\u0370-\u03FF]/,
};

// Language names mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  uk: 'Ukrainian',
  ar: 'Arabic',
  he: 'Hebrew',
  zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  fa: 'Persian',
  th: 'Thai',
  el: 'Greek',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  hi: 'Hindi',
  bn: 'Bengali',
  ur: 'Urdu',
};

/**
 * Telegram Translation Service
 */
export class TelegramTranslator {
  private config: TranslatorConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: Partial<TranslatorConfig> = {}) {
    this.config = {
      provider:
        (process.env.TRANSLATION_PROVIDER as TranslationProvider) ||
        config.provider ||
        'google',
      targetLanguage: config.targetLanguage || 'en',
      googleApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || config.googleApiKey,
      deeplApiKey: process.env.DEEPL_API_KEY || config.deeplApiKey,
      libreTranslateUrl:
        process.env.LIBRETRANSLATE_URL || config.libreTranslateUrl || 'https://libretranslate.com',
      libreTranslateApiKey: process.env.LIBRETRANSLATE_API_KEY || config.libreTranslateApiKey,
      autoTranslateLanguages: config.autoTranslateLanguages || [
        'ru',
        'uk',
        'ar',
        'he',
        'zh',
        'fa',
        'ko',
      ],
      maxCacheSize: config.maxCacheSize || 10000,
    };
  }

  /**
   * Detect language from text using character patterns
   */
  detectLanguage(text: string): DetectionResult {
    const cleanText = text.replace(/\s+/g, '');
    if (!cleanText) {
      return {
        languageCode: 'unknown',
        languageName: 'Unknown',
        confidence: 0,
        needsTranslation: false,
      };
    }

    // Count characters matching each language pattern
    const scores: Record<string, number> = {};
    let totalMatched = 0;

    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      const matches = cleanText.match(new RegExp(pattern.source, 'g'));
      const count = matches?.length || 0;
      if (count > 0) {
        scores[lang] = count;
        totalMatched += count;
      }
    }

    // If no non-Latin scripts detected, assume English
    if (totalMatched === 0) {
      // Check for Latin text
      const latinMatches = cleanText.match(/[a-zA-Z]/g);
      if (latinMatches && latinMatches.length > cleanText.length * 0.5) {
        return {
          languageCode: 'en',
          languageName: 'English',
          confidence: 0.7, // Lower confidence for Latin detection
          needsTranslation: false,
        };
      }
      return {
        languageCode: 'unknown',
        languageName: 'Unknown',
        confidence: 0,
        needsTranslation: false,
      };
    }

    // Find the dominant language
    let maxLang = 'unknown';
    let maxScore = 0;
    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxLang = lang;
      }
    }

    // Calculate confidence based on proportion of matched characters
    const confidence = Math.min(1, totalMatched / cleanText.length + 0.3);

    // Differentiate between Russian and Ukrainian
    if (maxLang === 'ru') {
      // Ukrainian-specific characters: і, ї, є, ґ
      const ukrainianChars = text.match(/[іїєґІЇЄҐ]/g);
      if (ukrainianChars && ukrainianChars.length > 0) {
        maxLang = 'uk';
      }
    }

    const needsTranslation =
      this.config.autoTranslateLanguages.includes(maxLang) &&
      maxLang !== this.config.targetLanguage;

    return {
      languageCode: maxLang,
      languageName: LANGUAGE_NAMES[maxLang] || maxLang.toUpperCase(),
      confidence,
      needsTranslation,
    };
  }

  /**
   * Get language info object
   */
  getLanguageInfo(text: string): LanguageInfo {
    const detection = this.detectLanguage(text);
    return {
      code: detection.languageCode,
      name: detection.languageName,
      confidence: detection.confidence,
    };
  }

  /**
   * Translate text
   */
  async translate(
    text: string,
    options: {
      sourceLanguage?: string;
      targetLanguage?: string;
      provider?: TranslationProvider;
    } = {}
  ): Promise<TranslationResult> {
    const targetLanguage = options.targetLanguage || this.config.targetLanguage;
    const provider = options.provider || this.config.provider;

    // Detect source language
    const detection = this.detectLanguage(text);
    const sourceLanguage: LanguageInfo = {
      code: options.sourceLanguage || detection.languageCode,
      name: LANGUAGE_NAMES[options.sourceLanguage || detection.languageCode] || 'Unknown',
      confidence: detection.confidence,
    };

    // Check if translation needed
    if (!detection.needsTranslation || sourceLanguage.code === targetLanguage) {
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
        provider: 'none',
        cached: false,
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(text, sourceLanguage.code, targetLanguage, provider);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return { ...cached.result, cached: true };
    }
    this.cacheMisses++;

    // Translate using provider
    let translated: string;
    try {
      switch (provider) {
        case 'google':
          translated = await this.translateWithGoogle(text, sourceLanguage.code, targetLanguage);
          break;
        case 'deepl':
          translated = await this.translateWithDeepL(text, sourceLanguage.code, targetLanguage);
          break;
        case 'libretranslate':
          translated = await this.translateWithLibreTranslate(
            text,
            sourceLanguage.code,
            targetLanguage
          );
          break;
        default:
          translated = text;
      }
    } catch (error) {
      console.error(`[Translator] ${provider} translation failed:`, error);
      // Try fallback providers
      translated = await this.translateWithFallback(text, sourceLanguage.code, targetLanguage);
    }

    const result: TranslationResult = {
      original: text,
      translated,
      sourceLanguage,
      targetLanguage,
      provider,
      cached: false,
    };

    // Cache result
    this.addToCache(cacheKey, result);

    return result;
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(
    texts: string[],
    options: {
      targetLanguage?: string;
      provider?: TranslationProvider;
    } = {}
  ): Promise<TranslationResult[]> {
    // Process in parallel with concurrency limit
    const concurrency = 5;
    const results: TranslationResult[] = [];

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((text) => this.translate(text, options)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Translate with Google Translate API
   */
  private async translateWithGoogle(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const apiKey = this.config.googleApiKey;
    if (!apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Translate API error: ${error}`);
    }

    const data = (await response.json()) as {
      data: { translations: Array<{ translatedText: string }> };
    };
    return data.data.translations[0]?.translatedText || text;
  }

  /**
   * Translate with DeepL API
   */
  private async translateWithDeepL(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const apiKey = this.config.deeplApiKey;
    if (!apiKey) {
      throw new Error('DeepL API key not configured');
    }

    // DeepL uses different endpoint for free vs pro
    const baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepL API error: ${error}`);
    }

    const data = (await response.json()) as {
      translations: Array<{ text: string }>;
    };
    return data.translations[0]?.text || text;
  }

  /**
   * Translate with LibreTranslate
   */
  private async translateWithLibreTranslate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const url = `${this.config.libreTranslateUrl}/translate`;

    const body: Record<string, string> = {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    };

    if (this.config.libreTranslateApiKey) {
      body.api_key = this.config.libreTranslateApiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LibreTranslate API error: ${error}`);
    }

    const data = (await response.json()) as { translatedText: string };
    return data.translatedText || text;
  }

  /**
   * Try fallback translation providers
   */
  private async translateWithFallback(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const providers: TranslationProvider[] = ['google', 'deepl', 'libretranslate'];

    for (const provider of providers) {
      if (provider === this.config.provider) continue; // Skip primary provider

      try {
        switch (provider) {
          case 'google':
            if (this.config.googleApiKey) {
              return await this.translateWithGoogle(text, sourceLang, targetLang);
            }
            break;
          case 'deepl':
            if (this.config.deeplApiKey) {
              return await this.translateWithDeepL(text, sourceLang, targetLang);
            }
            break;
          case 'libretranslate':
            return await this.translateWithLibreTranslate(text, sourceLang, targetLang);
        }
      } catch {
        // Try next provider
      }
    }

    // All providers failed, return original text
    return text;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    text: string,
    sourceLang: string,
    targetLang: string,
    provider: TranslationProvider
  ): string {
    // Use text hash to handle long texts
    const textHash = this.simpleHash(text);
    return `${provider}:${sourceLang}:${targetLang}:${textHash}`;
  }

  /**
   * Simple string hash for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Add translation to cache with size management
   */
  private addToCache(key: string, result: TranslationResult): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      const toDelete = this.cache.size - this.config.maxCacheSize + 1;
      const keys = Array.from(this.cache.keys()).slice(0, toDelete);
      for (const k of keys) {
        this.cache.delete(k);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Check if a language should be auto-translated
   */
  shouldTranslate(languageCode: string): boolean {
    return (
      this.config.autoTranslateLanguages.includes(languageCode) &&
      languageCode !== this.config.targetLanguage
    );
  }

  /**
   * Get available translation providers
   */
  getAvailableProviders(): TranslationProvider[] {
    const providers: TranslationProvider[] = [];
    if (this.config.googleApiKey) providers.push('google');
    if (this.config.deeplApiKey) providers.push('deepl');
    providers.push('libretranslate'); // Always available (public instances)
    return providers;
  }
}

// Export singleton instance
export const telegramTranslator = new TelegramTranslator();
