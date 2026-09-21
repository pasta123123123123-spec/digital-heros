import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

// A naive `new PrismaClient()` in every file re-creates connections on every
// tsx hot-reload in dev and can exhaust Neon's connection limit. Cache the
// instance on the Node global object instead.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProd ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!isProd) {
  global.__prisma = prisma;
}
