import { Router } from 'express';
import RoundController from '../controllers/RoundController';
import auth from '../middlewares/auth';

const router = Router();

router.post('/:roundId/auto-advance', auth('admin'), RoundController.autoAdvance);
router.get('/:roundId/lobbies', RoundController.lobbies);

export default router;
