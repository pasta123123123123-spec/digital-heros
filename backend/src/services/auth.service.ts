import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
  verifyAccessToken,
} from '../utils/jwt';
import { Role } from '@prisma/client';

const SALT_ROUNDS = 12;

export async function signup(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: Role.SUBSCRIBER },
  });

  return issueTokenPair(user.id, user.role);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — don't leak which
  // one it was, that's an account-enumeration vector.
  if (!user) throw AppError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Invalid email or password');

  return issueTokenPair(user.id, user.role);
}

export async function refresh(refreshTokenRaw: string) {
  const tokenHash = hashToken(refreshTokenRaw);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token is invalid or has expired');
  }

  // Rotate: revoke the used token and issue a brand new pair. This limits
  // the blast radius if a refresh token is ever stolen — it's single-use.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(stored.user.id, stored.user.role);
}

export async function logout(refreshTokenRaw: string) {
  const tokenHash = hashToken(refreshTokenRaw);
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined); // logout should never fail loudly on the client
}

async function issueTokenPair(userId: string, role: Role) {
  const accessToken = signAccessToken({ sub: userId, role });
  const { token: refreshTokenRaw, tokenHash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: refreshTokenExpiryDate() },
  });

  return { accessToken, refreshToken: refreshTokenRaw };
}

// Re-exported so controllers can verify an access token without importing
// the low-level jwt util directly (keeps a single seam for auth logic).
export { verifyAccessToken };
