import { Router } from 'express';
import MatchController from '../controllers/MatchController';

const router = Router();

// GET /matches/:matchId/full-details — serves both tournament and minitour match data
router.get('/:matchId/full-details', MatchController.fullDetails);
router.post('/:id/sync', MatchController.sync);
router.post('/minitour/:miniTourLobbyId', MatchController.createMiniTourMatch);

export default router; 