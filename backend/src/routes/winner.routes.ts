import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadProofImage } from '../config/upload';
import * as winnerController from '../controllers/winner.controller';

const router = Router();

// Subscriber-facing
router.get('/me', requireAuth, requireRole('SUBSCRIBER'), winnerController.listMyClaims);
router.post(
  '/:id/proof',
  requireAuth,
  requireRole('SUBSCRIBER'),
  uploadProofImage,
  winnerController.submitProof
);

// Admin-only
router.get('/', requireAuth, requireRole('ADMIN'), winnerController.listAllClaims);
router.post(
  '/:id/review',
  requireAuth,
  requireRole('ADMIN'),
  validate(winnerController.reviewClaimSchema),
  winnerController.reviewClaim
);
router.post('/:id/pay', requireAuth, requireRole('ADMIN'), winnerController.markPaid);

export default router;
