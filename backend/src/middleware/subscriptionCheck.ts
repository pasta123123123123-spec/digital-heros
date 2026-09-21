import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * PRD §04: "Real-time subscription status check on every authenticated
 * request." This is deliberately NOT derived from a JWT claim — subscription
 * state can change at any moment via a Stripe webhook (payment failure,
 * cancellation), and a 15-minute-lived access token must not be able to
 * keep granting access after that happens. So this middleware hits the DB
 * on every request that requires an active subscription, rather than
 * trusting anything cached in the token.
 *
 * Admins bypass this check entirely — they don't hold subscriber-only
 * resources gated behind payment status.
 */
export const requireActiveSubscription = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.role === 'ADMIN') return next();

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      select: { status: true, currentPeriodEnd: true },
    });

    const isActive =
      subscription?.status === 'ACTIVE' &&
      (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date());

    if (!isActive) {
      return next(
        AppError.forbidden('An active subscription is required to access this feature')
      );
    }

    next();
  }
);
