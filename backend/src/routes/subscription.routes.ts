import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as subscriptionController from '../controllers/subscription.controller';

const router = Router();

router.use(requireAuth, requireRole('SUBSCRIBER'));

// Note: no requireActiveSubscription here — these are the endpoints that
// let a user BECOME or manage their subscription in the first place.
router.get('/me', subscriptionController.getMySubscription);
router.patch(
  '/me',
  validate(subscriptionController.updateSubscriptionSchema),
  subscriptionController.updateMySubscription
);
router.post(
  '/checkout',
  validate(subscriptionController.createCheckoutSchema),
  subscriptionController.createCheckout
);
router.post('/cancel', subscriptionController.cancelMySubscription);

export default router;
