import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Single place where every error in the app is normalized into a consistent
 * JSON shape. Distinguishes:
 *  - AppError (expected/operational) → exposes message + statusCode as-is
 *  - Known Prisma errors (unique constraint, not found, etc.) → mapped to
 *    sensible HTTP codes rather than leaking a raw DB error
 *  - Zod errors that slipped through → 400 with field details
 *  - Anything else (a genuine bug) → logged in full server-side, but the
 *    client only ever sees a generic 500 message in production, so internal
 *    details never leak to a user.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details ?? undefined },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Validation failed', details: err.flatten().fieldErrors },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { message: `A record with this ${(err.meta?.target as string[])?.join(', ')} already exists` },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Record not found' } });
    }
  }

  // Unexpected error — log full detail server-side, hide it from the client.
  // eslint-disable-next-line no-console
  console.error(`[UNHANDLED ERROR] ${req.method} ${req.originalUrl}`, err);

  return res.status(500).json({
    error: {
      message: isProd ? 'Something went wrong. Please try again.' : String(err),
    },
  });
}
