/**
 * Sanitize string for safe display (escape HTML entities)
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizePath(inputPath: string): string {
  // Remove null bytes
  let sanitized = inputPath.replace(/\0/g, '');

  // Normalize path separators
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove directory traversal attempts
  sanitized = sanitized.replace(/\.{2,}/g, '.');

  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '');

  return sanitized;
}

/**
 * Strip HTML tags from a string (basic sanitization)
 */
export function stripHtml(dirty: string): string {
  return dirty.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize object keys and string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = escapeHtml(key);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = stripHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map((item: unknown) =>
        typeof item === 'string'
          ? stripHtml(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized;
}

/**
 * Validate that a string contains only allowed characters
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(str);
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 100;
}
