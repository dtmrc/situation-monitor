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

// Format ISO timestamp for tactical display (e.g., "2024-01-15T14:32:08Z")
export function formatTimestamp(date: string | Date) {
  return new Date(date).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

// Format compact timestamp (e.g., "14:32:08")
export function formatTimeOnly(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format number with thousands separator
export function formatNumber(num: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format percentage
export function formatPercent(num: number, decimals = 1) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

// Truncate text with ellipsis
export function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

// Generate initials from name (for avatars)
export function getInitials(name: string, maxLength = 2) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}

// Sleep utility for async operations
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
