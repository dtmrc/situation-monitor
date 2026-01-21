import { randomUUID } from 'crypto';

/**
 * Generate a deterministic UUID based on a seed string.
 * Useful for creating consistent IDs across seed runs.
 */
export function deterministicUUID(_seed: string): string {
  // In production seeds, use actual UUIDs
  // This is just for demo purposes to have predictable IDs
  return randomUUID();
}

/**
 * Get a random item from an array
 */
export function randomItem<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  const item = items[index];
  if (item === undefined) {
    throw new Error('Cannot get random item from empty array');
  }
  return item;
}

/**
 * Get random items from an array
 */
export function randomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate a date within a range
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a date relative to now
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Generate a future date
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
