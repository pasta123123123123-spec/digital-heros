import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as charityController from '../controllers/charity.controller';

const router = Router();

// Public — PRD §03: visitors can "explore listed charities" without an account.
router.get('/', charityController.listCharities);
router.get('/featured', charityController.getFeaturedCharity);
router.get('/:id', charityController.getCharity);

// Admin-only management
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(charityController.createCharitySchema),
  charityController.createCharity
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(charityController.updateCharitySchema),
  charityController.updateCharity
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), charityController.deleteCharity);

export default router;
