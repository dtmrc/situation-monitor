/**
 * Content Extraction Service
 *
 * Extracts clean article content from web pages using Readability.
 * Handles various HTML formats and provides sanitized text output.
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

/**
 * Extracted content from an article URL
 */
export interface ExtractedContent {
  /** Article title */
  title: string;
  /** HTML content */
  content: string;
  /** Plain text content */
  textContent: string;
  /** Article excerpt/summary */
  excerpt: string;
  /** Author byline */
  byline: string | null;
  /** Site name from meta tags */
  siteName: string | null;
  /** Published time from meta tags */
  publishedTime: string | null;
}

/**
 * Extract article content from a URL using Readability
 *
 * @param url - The URL to extract content from
 * @param timeoutMs - Fetch timeout in milliseconds (default: 10000)
 * @returns Extracted content or null if extraction fails
 */
export async function extractContent(
  url: string,
  timeoutMs: number = 10000
): Promise<ExtractedContent | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SituationMonitor/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    const dom = new JSDOM(html, { url });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return null;

    // Extract published time from various meta tags
    const publishedTime =
      dom.window.document
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute('content') ||
      dom.window.document.querySelector('meta[name="date"]')?.getAttribute('content') ||
      dom.window.document.querySelector('meta[name="pubdate"]')?.getAttribute('content') ||
      dom.window.document.querySelector('time[datetime]')?.getAttribute('datetime') ||
      null;

    return {
      title: article.title ?? '',
      content: article.content ?? '',
      textContent: article.textContent ?? '',
      excerpt: article.excerpt ?? '',
      byline: article.byline ?? null,
      siteName: article.siteName ?? null,
      publishedTime,
    };
  } catch (error) {
    console.error(`Content extraction failed for ${url}:`, error);
    return null;
  }
}

/**
 * Clean text by removing common artifacts
 *
 * @param text - Raw text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '') // Remove bracketed content
    .replace(/Advertisement/gi, '')
    .replace(/Continue reading.*/gi, '')
    .replace(/Read more.*/gi, '')
    .replace(/Subscribe.*/gi, '')
    .replace(/Sign up.*/gi, '')
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .trim();
}

/**
 * Strip all HTML tags from content
 *
 * @param html - HTML content
 * @returns Plain text
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 300)
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 300): string {
  if (text.length <= maxLength) return text;

  // Find a good break point (space, sentence end)
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  // Prefer sentence break if close to end
  if (lastSentence > maxLength * 0.7) {
    return truncated.slice(0, lastSentence + 1);
  }

  // Fall back to word break
  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}
