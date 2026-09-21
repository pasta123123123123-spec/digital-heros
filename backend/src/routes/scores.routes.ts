import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscriptionCheck';
import { validate } from '../middleware/validate';
import * as scoresController from '../controllers/scores.controller';

const router = Router();

router.use(requireAuth, requireRole('SUBSCRIBER'), requireActiveSubscription);

router.get('/', scoresController.listScoresHandler);
router.post('/', validate(scoresController.addScoreSchema), scoresController.addScoreHandler);
router.patch('/:id', validate(scoresController.updateScoreSchema), scoresController.updateScoreHandler);
router.delete('/:id', scoresController.deleteScoreHandler);

export default router;
