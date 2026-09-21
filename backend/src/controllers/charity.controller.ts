import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as charityService from '../services/charity.service';

export const createCharitySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    categories: z.array(z.string()).optional(),
    imageUrl: z.string().url().optional(),
    imageUrls: z.array(z.string().url()).optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const updateCharitySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(5000).optional(),
    categories: z.array(z.string()).optional(),
    imageUrl: z.string().url().optional(),
    imageUrls: z.array(z.string().url()).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listCharities = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const charities = await charityService.listCharities(search, category);
  res.json({ charities });
});

export const getFeaturedCharity = asyncHandler(async (_req: Request, res: Response) => {
  const charity = await charityService.getFeaturedCharity();
  res.json({ charity });
});

export const getCharity = asyncHandler(async (req: Request, res: Response) => {
  const charity = await charityService.getCharity(req.params.id);
  res.json({ charity });
});

export const createCharity = asyncHandler(async (req: Request, res: Response) => {
  const charity = await charityService.createCharity(req.body);
  res.status(201).json({ charity });
});

export const updateCharity = asyncHandler(async (req: Request, res: Response) => {
  const charity = await charityService.updateCharity(req.params.id, req.body);
  res.json({ charity });
});

export const deleteCharity = asyncHandler(async (req: Request, res: Response) => {
  await charityService.deleteCharity(req.params.id);
  res.status(204).send();
});

import * as donationService from '../services/donation.service';

export const createDonationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    amount: z.number().min(1).max(100000), // Max $100,000 donation
  }),
});

export const createDonation = asyncHandler(async (req: Request, res: Response) => {
  // Use optionalAuth middleware in routes, so req.user might be undefined
  const userId = req.user?.id;
  const { amount } = req.body;
  const { checkoutUrl } = await donationService.createDonationSession(req.params.id, amount, userId);
  res.json({ checkoutUrl });
});
