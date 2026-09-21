import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings, not JWTs. We store only a hash
 * of the token server-side (RefreshToken.tokenHash) so a leaked database
 * dump doesn't hand out usable tokens, and so tokens can be revoked
 * individually (logout, password change) rather than trusting a stateless
 * JWT until it naturally expires.
 */
export function generateRefreshToken() {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiryDate() {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN, 10) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
