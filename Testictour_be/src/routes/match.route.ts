import { Router } from 'express';
import MatchController from '../controllers/MatchController';

const router = Router();

router.post('/:id/sync', MatchController.sync);
router.post('/minitour/:miniTourLobbyId', MatchController.createMiniTourMatch);

export default router; 