import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as scoresService from '../services/scores.service';

export const addScoreSchema = z.object({
  body: z.object({
    value: z.number().int().min(1).max(45),
    playedOn: z.coerce.date(),
  }),
});

export const updateScoreSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ 
    value: z.number().int().min(1).max(45).optional(),
    playedOn: z.coerce.date().optional()
  }).refine(data => data.value !== undefined || data.playedOn !== undefined, {
    message: "At least one of value or playedOn must be provided"
  }),
});

export const listScoresHandler = asyncHandler(async (req: Request, res: Response) => {
  const scores = await scoresService.listScores(req.user!.id);
  res.json({ scores });
});

export const addScoreHandler = asyncHandler(async (req: Request, res: Response) => {
  const { value, playedOn } = req.body;
  const score = await scoresService.addScore(req.user!.id, value, playedOn);
  res.status(201).json({ score });
});

export const updateScoreHandler = asyncHandler(async (req: Request, res: Response) => {
  const score = await scoresService.updateScore(req.user!.id, req.params.id, req.body.value, req.body.playedOn);
  res.json({ score });
});

export const deleteScoreHandler = asyncHandler(async (req: Request, res: Response) => {
  await scoresService.deleteScore(req.user!.id, req.params.id);
  res.status(204).send();
});
