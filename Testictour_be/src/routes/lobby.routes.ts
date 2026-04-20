import { Router } from 'express';
import LobbyController from '../controllers/LobbyController';
import auth from '../middlewares/auth';

const router = Router();

router.get('/:roundId/lobbies', LobbyController.list);
router.get('/lobbies/:id', LobbyController.detail);
router.post('/:roundId/lobbies', auth('admin'), LobbyController.create);

// Reserve Player Management
router.post('/lobbies/:lobbyId/kick-player', auth('admin', 'partner'), LobbyController.kickPlayer);
router.post('/lobbies/:lobbyId/assign-reserve', auth('admin', 'partner'), LobbyController.assignReserve);

export default router; 