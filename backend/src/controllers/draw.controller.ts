import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as drawService from '../services/draw.service';

export const drawCycleSchema = z.object({
  body: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
    type: z.enum(['RANDOM', 'ALGORITHMIC']),
  }),
});

export const simulateDraw = asyncHandler(async (req: Request, res: Response) => {
  const { month, year, type } = req.body;
  const result = await drawService.simulateDraw(month, year, type);
  res.json({
    draw: result.draw,
    // Full ticket-level detail is admin-only preview data pre-publish.
    preview: { winningNumbers: result.outcome.winningNumbers, winnersByTier: result.outcome.winnersByTier },
  });
});

export const publishDraw = asyncHandler(async (req: Request, res: Response) => {
  const { month, year, type } = req.body;
  const draw = await drawService.publishDraw(month, year, type);
  res.json({ draw });
});

export const listDraws = asyncHandler(async (_req: Request, res: Response) => {
  const draws = await drawService.listDraws();
  res.json({ draws });
});

export const getDraw = asyncHandler(async (req: Request, res: Response) => {
  const month = Number(req.params.month);
  const year = Number(req.params.year);
  const draw = await drawService.getDraw(month, year);
  res.json({ draw });
});

export const getMyParticipation = asyncHandler(async (req: Request, res: Response) => {
  const result = await drawService.getMyDrawParticipation(req.user!.id);
  res.json(result);
});
