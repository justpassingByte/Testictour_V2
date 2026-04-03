import { Router } from 'express';
import TournamentController from '../controllers/TournamentController';
import auth from '../middlewares/auth';

const router = Router();

router.get('/', TournamentController.list);
router.post('/', auth('admin'), TournamentController.create);
router.get('/:id', TournamentController.detail);
router.put('/:id', auth('admin'), TournamentController.update);
router.delete('/:id', auth('admin'), TournamentController.remove);
router.post('/auto', auth('admin'), TournamentController.createAutoTournament);

// New Sync Route
router.post('/:id/sync', auth('admin'), TournamentController.syncMatches);

export default router; 