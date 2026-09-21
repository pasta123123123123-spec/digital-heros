import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Brute-force protection on the two credential-checking endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please try again later.' } },
});

router.post('/signup', authLimiter, validate(authController.signupSchema), authController.signup);
router.post('/login', authLimiter, validate(authController.loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
