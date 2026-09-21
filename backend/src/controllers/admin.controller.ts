import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import * as adminService from '../services/admin.service';
import { AppError } from '../utils/AppError';

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await adminService.getAdminOverview();
  res.json(overview);
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: 'SUBSCRIBER' },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      subscription: true,
      scores: { orderBy: { playedOn: 'desc' } },
    },
  });
  if (!user) throw AppError.notFound('User not found');
  res.json({ user });
});

import { z } from 'zod';
import * as scoresService from '../services/scores.service';
import * as subscriptionService from '../services/subscription.service';

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  }),
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.updateUserProfile(req.params.id, req.body);
  res.json({ user });
});

export const adminAddScoreSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    value: z.number().int().min(1).max(45),
    playedOn: z.coerce.date(),
  }),
});

export const adminAddScore = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Add an audit trail here for real prize-money accountability
  const score = await scoresService.addScore(req.params.id, req.body.value, req.body.playedOn);
  res.status(201).json({ score });
});

export const adminUpdateScoreSchema = z.object({
  params: z.object({ id: z.string().min(1), scoreId: z.string().min(1) }),
  body: z.object({
    value: z.number().int().min(1).max(45).optional(),
    playedOn: z.coerce.date().optional()
  }).refine(data => data.value !== undefined || data.playedOn !== undefined, {
    message: "At least one of value or playedOn must be provided"
  }),
});

export const adminUpdateScore = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Add an audit trail here for real prize-money accountability
  const score = await scoresService.updateScore(req.params.id, req.params.scoreId, req.body.value, req.body.playedOn);
  res.json({ score });
});

export const adminDeleteScore = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Add an audit trail here for real prize-money accountability
  await scoresService.deleteScore(req.params.id, req.params.scoreId);
  res.status(204).send();
});

export const adminCancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Add an audit trail here for real prize-money accountability
  const result = await subscriptionService.cancelSubscriptionForUser(req.params.id);
  res.json(result);
});
