import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscriptionCheck';
import { validate } from '../middleware/validate';
import * as drawController from '../controllers/draw.controller';

const router = Router();

// Subscriber-facing
router.get(
  '/me',
  requireAuth,
  requireRole('SUBSCRIBER'),
  requireActiveSubscription,
  drawController.getMyParticipation
);

// Admin-only draw management
router.get('/', requireAuth, requireRole('ADMIN'), drawController.listDraws);
router.get('/:year/:month', requireAuth, requireRole('ADMIN'), drawController.getDraw);
router.post(
  '/simulate',
  requireAuth,
  requireRole('ADMIN'),
  validate(drawController.drawCycleSchema),
  drawController.simulateDraw
);
router.post(
  '/publish',
  requireAuth,
  requireRole('ADMIN'),
  validate(drawController.drawCycleSchema),
  drawController.publishDraw
);

export default router;
