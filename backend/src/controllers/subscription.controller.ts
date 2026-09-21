import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as subscriptionService from '../services/subscription.service';

export const createCheckoutSchema = z.object({
  body: z.object({
    plan: z.enum(['MONTHLY', 'YEARLY']),
    charityId: z.string().min(1),
    charityContributionPct: z.number().int().min(10).max(100).default(10),
  }),
});

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { plan, charityId, charityContributionPct } = req.body;
  const result = await subscriptionService.createCheckoutSession(
    req.user!.id,
    plan,
    charityId,
    charityContributionPct
  );
  res.json(result);
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await subscriptionService.getMySubscription(req.user!.id);
  res.json({ subscription });
});

export const cancelMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscriptionService.cancelMySubscription(req.user!.id);
  res.json(result);
});

export const updateSubscriptionSchema = z.object({
  body: z.object({
    charityId: z.string().min(1).optional(),
    charityContributionPct: z.number().int().min(10).max(100).optional(),
  }),
});

export const updateMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const { charityId, charityContributionPct } = req.body;
  const subscription = await subscriptionService.updateMySubscription(
    req.user!.id,
    { charityId, charityContributionPct }
  );
  res.json({ subscription });
});
