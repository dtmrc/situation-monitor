import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const then = new Date(date);
  const diff = then.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (Math.abs(days) < 1) {
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (Math.abs(hours) < 1) {
      const minutes = Math.round(diff / (1000 * 60));
      return rtf.format(minutes, 'minute');
    }
    return rtf.format(hours, 'hour');
  }
  return rtf.format(days, 'day');
}
