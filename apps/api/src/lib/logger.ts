import pino from 'pino';

import { getRequestId } from '../middleware/correlation';

// Sensitive fields to redact
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Production: JSON, Development: pretty print
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,

  // Redact sensitive data
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    req: (req: { method?: string; url?: string; headers?: Record<string, string> }) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Base context
  base: {
    service: 'situation-monitor-api',
    version: process.env.npm_package_version,
  },

  // Custom timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child logger with request context
export function getRequestLogger() {
  const requestId = getRequestId();
  return logger.child({ requestId });
}

// Structured log helpers
export const log = {
  info: (msg: string, data?: object) => getRequestLogger().info(data, msg),
  warn: (msg: string, data?: object) => getRequestLogger().warn(data, msg),
  error: (msg: string, error?: Error, data?: object) =>
    getRequestLogger().error({ err: error, ...data }, msg),
  debug: (msg: string, data?: object) => getRequestLogger().debug(data, msg),

  // HTTP request logging
  request: (method: string, path: string, statusCode: number, durationMs: number) =>
    getRequestLogger().info({ method, path, statusCode, durationMs }, `${method} ${path} ${statusCode} ${durationMs}ms`),

  // Database query logging
  query: (query: string, durationMs: number) =>
    getRequestLogger().debug({ query: query.slice(0, 200), durationMs }, 'DB query'),

  // External API logging
  external: (service: string, operation: string, durationMs: number, success: boolean) =>
    getRequestLogger().info({ service, operation, durationMs, success }, `External API: ${service}.${operation}`),
};
