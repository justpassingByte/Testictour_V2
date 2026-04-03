import { Router } from 'express';
import MatchController from '../controllers/MatchController';
import auth from '../middlewares/auth';

const router = Router();

router.get('/:lobbyId/matches', MatchController.list);
router.post('/:lobbyId/matches', auth('admin'), MatchController.create);
router.get('/:matchId/results', MatchController.results);
router.get('/:matchId/full-details', MatchController.fullDetails);
router.post('/:matchId/results', auth('admin'), MatchController.updateResults);
router.post('/fetchAndSaveMatchData', MatchController.fetchAndSaveMatchData);

export default router; 