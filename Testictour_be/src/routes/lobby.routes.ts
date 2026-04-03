import { Router } from 'express';
import LobbyController from '../controllers/LobbyController';
import auth from '../middlewares/auth';

const router = Router();

router.get('/:roundId/lobbies', LobbyController.list);
router.post('/:roundId/lobbies', auth('admin'), LobbyController.create);

export default router; 