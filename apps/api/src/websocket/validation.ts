/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * WebSocket Message Validation
 *
 * Validates incoming WebSocket messages against defined schemas.
 */

import { z } from 'zod';

// Base message schema
export const wsMessageSchema = z.object({
  type: z.string().min(1).max(50),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

// Auth message (first message after connection)
export const authMessageSchema = z.object({
  type: z.literal('auth'),
  token: z.string().min(1),
});

// Subscribe to channels
export const subscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  channels: z.array(z.string().min(1).max(100)).min(1).max(10),
});

// Unsubscribe from channels
export const unsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  channels: z.array(z.string().min(1).max(100)).min(1).max(10),
});

// Ping/pong for heartbeat
export const pingMessageSchema = z.object({
  type: z.literal('ping'),
});

// Client-sent marker update
export const markerUpdateSchema = z.object({
  type: z.literal('marker_update'),
  payload: z.object({
    action: z.enum(['add', 'update', 'remove']),
    markerId: z.string().uuid().optional(),
    marker: z
      .object({
        id: z.string().uuid().optional(),
        type: z.string(),
        coordinates: z.tuple([z.number(), z.number()]),
        name: z.string().optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        status: z.string().optional(),
      })
      .optional(),
  }),
});

// All supported message types
export type WsMessage = z.infer<typeof wsMessageSchema>;
export type AuthMessage = z.infer<typeof authMessageSchema>;
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;
export type UnsubscribeMessage = z.infer<typeof unsubscribeMessageSchema>;
export type PingMessage = z.infer<typeof pingMessageSchema>;
export type MarkerUpdateMessage = z.infer<typeof markerUpdateSchema>;

// Union of all client message types
export const clientMessageSchema = z.discriminatedUnion('type', [
  authMessageSchema,
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pingMessageSchema,
  markerUpdateSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

/**
 * Parse and validate an incoming message
 */
export function parseMessage(data: string): {
  valid: boolean;
  message?: ClientMessage;
  error?: string;
} {
  try {
    const parsed = JSON.parse(data);

    // First validate basic structure
    const baseResult = wsMessageSchema.safeParse(parsed);
    if (!baseResult.success) {
      return {
        valid: false,
        error: `Invalid message structure: ${baseResult.error.message}`,
      };
    }

    // Then validate against specific message type
    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      return {
        valid: false,
        error: `Invalid message: ${result.error.message}`,
      };
    }

    return { valid: true, message: result.data };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to parse message',
    };
  }
}

/**
 * Create a server message
 */
export function createServerMessage(type: string, payload: unknown): string {
  return JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create an error message
 */
export function createErrorMessage(code: string, message: string): string {
  return JSON.stringify({
    type: 'error',
    payload: { code, message },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create a pong response
 */
export function createPongMessage(): string {
  return JSON.stringify({
    type: 'pong',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Maximum message size (16KB)
 */
export const MAX_MESSAGE_SIZE = 16 * 1024;

/**
 * Check if message exceeds size limit
 */
export function isMessageTooLarge(data: string): boolean {
  return Buffer.byteLength(data, 'utf8') > MAX_MESSAGE_SIZE;
}
