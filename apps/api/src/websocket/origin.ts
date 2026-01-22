/**
 * WebSocket Origin Validation
 *
 * Validates that WebSocket connections originate from allowed domains.
 * Prevents unauthorized cross-origin WebSocket connections.
 */

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  // Production origins can be added via ALLOWED_WS_ORIGINS env var
  ...(process.env.ALLOWED_WS_ORIGINS?.split(',').map((s) => s.trim()) || []),
];

/**
 * Validate that a WebSocket connection origin is allowed
 *
 * @param origin - The Origin header value from the WebSocket upgrade request
 * @returns true if the origin is allowed, false otherwise
 */
export function validateOrigin(origin: string | undefined): boolean {
  // Allow connections without origin in development
  // (Some WebSocket clients like wscat don't send origin)
  if (!origin) {
    return process.env.NODE_ENV === 'development';
  }

  return ALLOWED_ORIGINS.some((allowed) => {
    // Exact match
    if (origin === allowed) {
      return true;
    }

    // Wildcard subdomain match (e.g., *.example.com)
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      // Match subdomains like "https://app.example.com"
      const originUrl = new URL(origin);
      return originUrl.hostname.endsWith(`.${domain}`) || originUrl.hostname === domain;
    }

    return false;
  });
}

/**
 * Get the list of allowed origins for debugging
 */
export function getAllowedOrigins(): string[] {
  return [...ALLOWED_ORIGINS];
}
