import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../types';

/**
 * Content Security Policy configuration
 */
interface CspConfig {
  /** Allow inline scripts (use with caution) */
  allowInlineScripts?: boolean;
  /** Allow eval and unsafe-eval (use with caution) */
  allowEval?: boolean;
  /** Additional script sources */
  scriptSrc?: string[];
  /** Additional style sources */
  styleSrc?: string[];
  /** Additional image sources */
  imgSrc?: string[];
  /** Additional font sources */
  fontSrc?: string[];
  /** Additional connect sources (API, WebSocket) */
  connectSrc?: string[];
  /** Additional frame sources */
  frameSrc?: string[];
  /** Report URI for CSP violations */
  reportUri?: string;
  /** Report-only mode (doesn't block, just reports) */
  reportOnly?: boolean;
}

const defaultConfig: CspConfig = {
  allowInlineScripts: false,
  allowEval: false,
  scriptSrc: [],
  styleSrc: [],
  imgSrc: ['data:', 'https:'],
  fontSrc: [],
  connectSrc: ['wss:', 'https:'],
  frameSrc: [],
  reportUri: undefined,
  reportOnly: false,
};

/**
 * Build CSP header value from configuration
 */
function buildCspHeader(config: CspConfig): string {
  const directives: string[] = [];

  // Default source
  directives.push("default-src 'self'");

  // Script source
  const scriptSources = ["'self'", ...(config.scriptSrc || [])];
  if (config.allowInlineScripts) {
    scriptSources.push("'unsafe-inline'");
  }
  if (config.allowEval) {
    scriptSources.push("'unsafe-eval'");
  }
  directives.push(`script-src ${scriptSources.join(' ')}`);

  // Style source
  const styleSources = ["'self'", "'unsafe-inline'", ...(config.styleSrc || [])];
  directives.push(`style-src ${styleSources.join(' ')}`);

  // Image source
  const imgSources = ["'self'", ...(config.imgSrc || [])];
  directives.push(`img-src ${imgSources.join(' ')}`);

  // Font source
  const fontSources = ["'self'", ...(config.fontSrc || [])];
  directives.push(`font-src ${fontSources.join(' ')}`);

  // Connect source (for fetch, XHR, WebSocket)
  const connectSources = ["'self'", ...(config.connectSrc || [])];
  directives.push(`connect-src ${connectSources.join(' ')}`);

  // Frame source
  const frameSources = config.frameSrc?.length ? config.frameSrc : ["'none'"];
  directives.push(`frame-src ${frameSources.join(' ')}`);

  // Frame ancestors (clickjacking protection)
  directives.push("frame-ancestors 'none'");

  // Base URI restriction
  directives.push("base-uri 'self'");

  // Form action restriction
  directives.push("form-action 'self'");

  // Upgrade insecure requests in production
  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests');
  }

  // Report URI if specified
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * CSP middleware factory
 *
 * @param config - CSP configuration options
 * @returns Hono middleware that sets CSP headers
 *
 * @example
 * ```typescript
 * app.use('*', cspMiddleware({
 *   allowInlineScripts: true, // For development with HMR
 *   connectSrc: ['wss://localhost:*'],
 * }));
 * ```
 */
export function cspMiddleware(config: CspConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  const cspHeader = buildCspHeader(mergedConfig);
  const headerName = mergedConfig.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  return createMiddleware<AppEnv>(async (c, next) => {
    await next();

    // Only set CSP for HTML responses
    const contentType = c.res.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      c.header(headerName, cspHeader);
    }
  });
}

/**
 * Security headers middleware
 *
 * Sets additional security headers beyond CSP
 */
export const securityHeaders = createMiddleware<AppEnv>(async (c, next) => {
  await next();

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (redundant with CSP frame-ancestors, but good fallback)
  c.header('X-Frame-Options', 'DENY');

  // XSS protection (legacy, but still useful for older browsers)
  c.header('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy (disable sensitive features)
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});

/**
 * Combined security middleware (CSP + security headers)
 */
export function createSecurityMiddleware(cspConfig: CspConfig = {}) {
  const csp = cspMiddleware(cspConfig);
  const security = securityHeaders;

  return createMiddleware<AppEnv>(async (c, next) => {
    // Apply security headers first
    await security(c, async () => {
      // Then apply CSP
      await csp(c, next);
    });
  });
}
