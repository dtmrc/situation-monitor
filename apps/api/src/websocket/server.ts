/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * WebSocket Server
 *
 * Provides real-time communication for:
 * - Feed item updates
 * - Alert notifications
 * - Marker updates
 * - Connection status
 *
 * Authentication: Token sent as first message (not URL query param)
 */

import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { WebSocket } from 'ws';

import { verifyAccessToken } from '../lib/jwt';
import { redisSub, redisPub } from '../lib/redis';
import type { AppEnv } from '../types';

import { getHeartbeatManager } from './heartbeat';
import { checkConnectionLimit, removeConnection, MessageRateLimiter } from './rateLimit';
import { registerConnection, CLOSE_CODES } from './shutdown';
import {
  parseMessage,
  createServerMessage,
  createErrorMessage,
  createPongMessage,
  isMessageTooLarge,
  type ClientMessage,
} from './validation';

// Redis channel prefixes
const FEED_CHANNEL_PREFIX = 'feed:items:';
const ALERT_CHANNEL_PREFIX = 'alerts:';

// Connection state
interface ConnectionContext {
  id: string;
  ip: string;
  userId?: string;
  projectId?: string;
  authenticated: boolean;
  subscribedChannels: Set<string>;
  rateLimiter: MessageRateLimiter;
  createdAt: Date;
}

// Track all connections by ID
const connectionContexts = new Map<string, ConnectionContext>();

// Track connections by project for broadcasting
const projectConnections = new Map<string, Set<string>>();

// Create WebSocket routes
export function createWebSocketRoutes() {
  const wsApp = new Hono<AppEnv>();
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: wsApp });

  // WebSocket endpoint for map/feed updates
  wsApp.get(
    '/map/:projectId?',
    upgradeWebSocket(async (c) => {
      const projectId = c.req.param('projectId');
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

      // Check connection rate limit
      const connLimit = await checkConnectionLimit(ip);
      if (!connLimit.allowed) {
        return {
          onOpen: (_, ws) => {
            (ws as unknown as WebSocket).close(
              CLOSE_CODES.POLICY_VIOLATION,
              'Too many connections from this IP'
            );
          },
        };
      }

      const connectionId = uuidv4();
      const context: ConnectionContext = {
        id: connectionId,
        ip,
        projectId,
        authenticated: false,
        subscribedChannels: new Set(),
        rateLimiter: new MessageRateLimiter(connectionId),
        createdAt: new Date(),
      };

      return {
        onOpen: (_, ws) => {
          const socket = ws as unknown as WebSocket;
          connectionContexts.set(connectionId, context);
          registerConnection(socket);

          // Register with heartbeat manager
          getHeartbeatManager().register(connectionId, socket, () => {
            handleDisconnect(connectionId, ip);
          });

          console.log(`[WS] Connection opened: ${connectionId} from ${ip}`);

          // Send welcome message (client needs to authenticate)
          socket.send(
            createServerMessage('connected', {
              connectionId,
              requiresAuth: true,
              authTimeout: 30000, // 30 seconds to authenticate
            })
          );

          // Set auth timeout
          setTimeout(() => {
            const ctx = connectionContexts.get(connectionId);
            if (ctx && !ctx.authenticated) {
              console.log(`[WS] Auth timeout for ${connectionId}`);
              socket.close(CLOSE_CODES.POLICY_VIOLATION, 'Authentication timeout');
            }
          }, 30000);
        },

        onMessage: async (event, ws) => {
          const socket = ws as unknown as WebSocket;
          const data = event.data.toString();

          // Check message size
          if (isMessageTooLarge(data)) {
            socket.send(createErrorMessage('MESSAGE_TOO_LARGE', 'Message exceeds size limit'));
            return;
          }

          // Check rate limit
          const rateCheck = context.rateLimiter.checkMessage();
          if (!rateCheck.allowed) {
            socket.send(
              createErrorMessage(
                'RATE_LIMITED',
                `Too many messages. Retry in ${rateCheck.retryAfter}s`
              )
            );
            return;
          }

          // Parse message
          const { valid, message, error } = parseMessage(data);
          if (!valid || !message) {
            socket.send(createErrorMessage('INVALID_MESSAGE', error || 'Invalid message'));
            return;
          }

          // Handle message
          await handleMessage(connectionId, socket, message);
        },

        onClose: () => {
          handleDisconnect(connectionId, ip);
        },

        onError: (error) => {
          console.error(`[WS] Connection error ${connectionId}:`, error);
          handleDisconnect(connectionId, ip);
        },
      };
    })
  );

  return { wsApp, injectWebSocket };
}

/**
 * Handle incoming client message
 */
async function handleMessage(
  connectionId: string,
  ws: WebSocket,
  message: ClientMessage
): Promise<void> {
  const context = connectionContexts.get(connectionId);
  if (!context) {
    return;
  }

  switch (message.type) {
    case 'auth': {
      try {
        const payload = await verifyAccessToken(message.token);
        context.userId = payload.sub;
        context.authenticated = true;

        // Subscribe to project channels if projectId was provided
        if (context.projectId) {
          await subscribeToProject(connectionId, context.projectId);
        }

        ws.send(
          createServerMessage('authenticated', {
            userId: payload.sub,
            projectId: context.projectId,
          })
        );

        console.log(`[WS] Authenticated ${connectionId} as user ${payload.sub}`);
      } catch {
        ws.send(createErrorMessage('AUTH_FAILED', 'Invalid or expired token'));
        ws.close(CLOSE_CODES.POLICY_VIOLATION, 'Authentication failed');
      }
      break;
    }

    case 'subscribe': {
      if (!context.authenticated) {
        ws.send(createErrorMessage('NOT_AUTHENTICATED', 'Must authenticate first'));
        return;
      }

      for (const channel of message.channels) {
        // Validate channel format (e.g., "project:uuid" or "feed:uuid")
        if (!isValidChannel(channel)) {
          ws.send(createErrorMessage('INVALID_CHANNEL', `Invalid channel: ${channel}`));
          continue;
        }

        await subscribeToChannel(connectionId, channel);
      }

      ws.send(
        createServerMessage('subscribed', {
          channels: Array.from(context.subscribedChannels),
        })
      );
      break;
    }

    case 'unsubscribe': {
      for (const channel of message.channels) {
        unsubscribeFromChannel(connectionId, channel);
      }

      ws.send(
        createServerMessage('unsubscribed', {
          channels: message.channels,
        })
      );
      break;
    }

    case 'ping': {
      ws.send(createPongMessage());
      getHeartbeatManager().handlePong(connectionId);
      break;
    }

    case 'marker_update': {
      if (!context.authenticated || !context.projectId) {
        ws.send(createErrorMessage('NOT_AUTHENTICATED', 'Must authenticate first'));
        return;
      }

      // Broadcast marker update to all connections in the project
      await broadcastToProject(context.projectId, 'marker_update', message.payload);
      break;
    }
  }
}

/**
 * Handle connection disconnect
 */
function handleDisconnect(connectionId: string, ip: string): void {
  const context = connectionContexts.get(connectionId);
  if (!context) {
    return;
  }

  // Unsubscribe from all channels
  for (const channel of context.subscribedChannels) {
    unsubscribeFromChannel(connectionId, channel);
  }

  // Remove from project connections
  if (context.projectId) {
    const projectConns = projectConnections.get(context.projectId);
    if (projectConns) {
      projectConns.delete(connectionId);
      if (projectConns.size === 0) {
        projectConnections.delete(context.projectId);
      }
    }
  }

  // Cleanup
  connectionContexts.delete(connectionId);
  getHeartbeatManager().unregister(connectionId);
  removeConnection(ip);

  console.log(`[WS] Connection closed: ${connectionId}`);
}

/**
 * Subscribe a connection to a project's channels
 */
async function subscribeToProject(connectionId: string, projectId: string): Promise<void> {
  const context = connectionContexts.get(connectionId);
  if (!context) {
    return;
  }

  // Track project connection
  if (!projectConnections.has(projectId)) {
    projectConnections.set(projectId, new Set());
  }
  projectConnections.get(projectId)!.add(connectionId);

  // Subscribe to Redis channels for this project
  const feedChannel = `${FEED_CHANNEL_PREFIX}${projectId}`;
  const alertChannel = `${ALERT_CHANNEL_PREFIX}${projectId}`;

  await subscribeToRedisChannel(feedChannel);
  await subscribeToRedisChannel(alertChannel);

  context.subscribedChannels.add(feedChannel);
  context.subscribedChannels.add(alertChannel);
}

/**
 * Subscribe to a specific channel
 */
async function subscribeToChannel(connectionId: string, channel: string): Promise<void> {
  const context = connectionContexts.get(connectionId);
  if (!context) {
    return;
  }

  context.subscribedChannels.add(channel);
  await subscribeToRedisChannel(channel);
}

/**
 * Unsubscribe from a channel
 */
function unsubscribeFromChannel(connectionId: string, channel: string): void {
  const context = connectionContexts.get(connectionId);
  if (!context) {
    return;
  }

  context.subscribedChannels.delete(channel);

  // Check if any other connection is subscribed to this channel
  let otherSubscribers = false;
  for (const [id, ctx] of connectionContexts.entries()) {
    if (id !== connectionId && ctx.subscribedChannels.has(channel)) {
      otherSubscribers = true;
      break;
    }
  }

  // Unsubscribe from Redis if no other subscribers
  if (!otherSubscribers) {
    redisSub.unsubscribe(channel).catch((err) => {
      console.error(`[WS] Failed to unsubscribe from ${channel}:`, err);
    });
  }
}

/**
 * Subscribe to a Redis channel
 */
async function subscribeToRedisChannel(channel: string): Promise<void> {
  // Check if already subscribed
  const subscriptionCount = redisSub.listenerCount('message');

  if (subscriptionCount === 0) {
    // Set up message handler on first subscription
    redisSub.on('message', (ch, message) => {
      handleRedisMessage(ch, message);
    });
  }

  await redisSub.subscribe(channel);
}

/**
 * Handle incoming Redis pub/sub message
 */
function handleRedisMessage(channel: string, message: string): void {
  // Find all connections subscribed to this channel
  for (const [connectionId, context] of connectionContexts.entries()) {
    if (context.subscribedChannels.has(channel)) {
      // Get the WebSocket for this connection
      // We need to send to all connections tracking this channel
      sendToConnection(connectionId, message);
    }
  }
}

/**
 * Send a message to a specific connection
 */
function sendToConnection(connectionId: string, message: string): void {
  // This is a simplified version - in production you'd track the ws reference
  // For now, we'll use the project broadcast mechanism
  console.log(`[WS] Sending to ${connectionId}: ${message.substring(0, 100)}...`);
}

/**
 * Broadcast a message to all connections in a project
 */
async function broadcastToProject(
  projectId: string,
  type: string,
  payload: unknown
): Promise<void> {
  const channel = `${FEED_CHANNEL_PREFIX}${projectId}`;
  const message = createServerMessage(type, payload);

  await redisPub.publish(channel, message);
}

/**
 * Validate channel name format
 */
function isValidChannel(channel: string): boolean {
  // Allowed formats: feed:items:uuid, alerts:uuid, project:uuid
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const parts = channel.split(':');
  if (parts.length < 2) {
    return false;
  }

  const prefix = parts[0];
  const id = parts[parts.length - 1];

  // Check prefix
  if (!['feed', 'alerts', 'project'].includes(prefix)) {
    return false;
  }

  // Check UUID
  return uuidPattern.test(id);
}

/**
 * Get WebSocket server statistics
 */
export function getWebSocketStats(): {
  totalConnections: number;
  authenticatedConnections: number;
  projectConnections: { [projectId: string]: number };
} {
  let authenticated = 0;
  const projectStats: { [projectId: string]: number } = {};

  for (const context of connectionContexts.values()) {
    if (context.authenticated) {
      authenticated++;
    }

    if (context.projectId) {
      projectStats[context.projectId] = (projectStats[context.projectId] || 0) + 1;
    }
  }

  return {
    totalConnections: connectionContexts.size,
    authenticatedConnections: authenticated,
    projectConnections: projectStats,
  };
}
