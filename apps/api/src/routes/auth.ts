import { randomBytes } from 'crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db';
import { users } from '../db/schema';
import { ConflictError, UnauthorizedError } from '../lib/errors';
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import { redis } from '../lib/redis';
import { authMiddleware } from '../middleware/auth';
import { authRateLimiter, registerRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validation';
import type { AppEnv } from '../types';

const auth = new Hono<AppEnv>();

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const requestResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type RefreshInput = z.infer<typeof refreshSchema>;
type RequestResetInput = z.infer<typeof requestResetSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Register
auth.post('/register', registerRateLimiter, validateBody(registerSchema), async (c) => {
  const { email, password, name } = c.get('validatedBody') as RegisterInput;

  // Check if user exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  // Generate tokens
  const tokens = await generateTokenPair({
    id: newUser.id,
    email: newUser.email,
    role: 'owner',
  });

  return c.json(
    {
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      ...tokens,
    },
    201
  );
});

// Login
auth.post('/login', authRateLimiter, validateBody(loginSchema), async (c) => {
  const { email, password } = c.get('validatedBody') as LoginInput;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const tokens = await generateTokenPair({
    id: user.id,
    email: user.email,
    role: 'owner',
  });

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  });
});

// Refresh token
auth.post('/refresh', validateBody(refreshSchema), async (c) => {
  const { refreshToken } = c.get('validatedBody') as RefreshInput;

  try {
    const payload = await verifyRefreshToken(refreshToken);

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      role: 'owner',
    });

    return c.json(tokens);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
});

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  const jwtPayload = c.get('user');

  const user = await db.query.users.findFirst({
    where: eq(users.id, jwtPayload.sub),
    columns: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return c.json({ user });
});

// Request password reset
auth.post('/forgot-password', authRateLimiter, validateBody(requestResetSchema), async (c) => {
  const { email } = c.get('validatedBody') as RequestResetInput;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return c.json({ success: true });
  }

  // Generate reset token
  const token = randomBytes(32).toString('hex');

  // Store token in Redis with 1 hour expiry
  await redis.set(`password_reset:${token}`, user.id, 'EX', 3600);

  // TODO: Send password reset email with link:
  // `${FRONTEND_URL}/reset-password?token=${token}`
  console.log(`[Auth] Password reset token for ${email}: ${token}`);

  return c.json({ success: true });
});

// Reset password
auth.post('/reset-password', validateBody(resetPasswordSchema), async (c) => {
  const { token, password } = c.get('validatedBody') as ResetPasswordInput;

  // Verify token
  const userId = await redis.get(`password_reset:${token}`);

  if (!userId) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update user password
  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Delete used token
  await redis.del(`password_reset:${token}`);

  return c.json({ success: true });
});

export { auth };
