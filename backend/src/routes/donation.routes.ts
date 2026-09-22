import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as donationController from '../controllers/donation.controller';

const router = Router();

router.get('/me', requireAuth, donationController.getMyDonations);

export default router;
