import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as winnerService from '../services/winner.service';
import { AppError } from '../utils/AppError';

export const reviewClaimSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().max(1000).optional(),
  }),
});

export const listMyClaims = asyncHandler(async (req: Request, res: Response) => {
  const claims = await winnerService.listMyClaims(req.user!.id);
  res.json({ claims });
});

export const submitProof = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('A proof screenshot file is required');
  
  let proofUrl: string;
  const isVercel = !!process.env.VERCEL || !!process.env.AWS_REGION;
  
  if (isVercel) {
    // Vercel Serverless: use the memory buffer Base64
    const b64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;
    proofUrl = `data:${mime};base64,${b64}`;
  } else {
    // Local development: use the local disk URL
    proofUrl = `/uploads/winner-proofs/${req.file.filename}`;
  }
  
  const claim = await winnerService.submitProof(req.user!.id, req.params.id, proofUrl);
  res.json({ claim });
});

export const listAllClaims = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | undefined;
  const claims = await winnerService.listAllClaims(status);
  res.json({ claims });
});

export const reviewClaim = asyncHandler(async (req: Request, res: Response) => {
  const { decision, rejectionReason } = req.body;
  const claim = await winnerService.reviewClaim(req.user!.id, req.params.id, decision, rejectionReason);
  res.json({ claim });
});

export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const claim = await winnerService.markPaid(req.params.id);
  res.json({ claim });
});
