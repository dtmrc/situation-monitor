import { sign, verify } from 'hono/jwt';

import type { JWTPayload, RefreshTokenPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function generateAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      ...payload,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
    },
    JWT_SECRET
  );
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: userId,
      type: 'refresh',
      iat: now,
      exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
    } satisfies RefreshTokenPayload,
    JWT_SECRET
  );
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const payload = await verify(token, JWT_SECRET, 'HS256');
  return payload as unknown as JWTPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = await verify(token, JWT_SECRET, 'HS256');
  const typed = payload as unknown as RefreshTokenPayload;

  if (typed.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  return typed;
}

export async function generateTokenPair(user: {
  id: string;
  email: string;
  role: string;
  orgId?: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken({ sub: user.id, email: user.email, role: user.role, orgId: user.orgId }),
    generateRefreshToken(user.id),
  ]);

  return { accessToken, refreshToken };
}
