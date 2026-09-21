import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

import { validate } from '../middleware/validate';

router.get('/overview', adminController.getOverview);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);

// Admin Profile Updates
router.patch('/users/:id', validate(adminController.updateUserSchema), adminController.updateUser);

// Admin Score Management
router.post('/users/:id/scores', validate(adminController.adminAddScoreSchema), adminController.adminAddScore);
router.patch('/users/:id/scores/:scoreId', validate(adminController.adminUpdateScoreSchema), adminController.adminUpdateScore);
router.delete('/users/:id/scores/:scoreId', adminController.adminDeleteScore);

// Admin Subscription Management
router.post('/users/:id/subscription/cancel', adminController.adminCancelSubscription);

export default router;
