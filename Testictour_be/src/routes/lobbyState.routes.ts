import { Router } from 'express';
import LobbyStateController from '../controllers/lobbyState.controller';
import auth from '../middlewares/auth';

const router = Router();

// ── Lobby State REST endpoints ─────────────────────────────────────────────
// Socket.IO handles real-time after SSR hydration.

// GET /api/lobbies/:id/state — full LobbyStateSnapshot including readyPlayers from Redis
router.get('/lobbies/:id/state', auth('user'), LobbyStateController.getState);

// POST /api/lobbies/:id/ready — toggle ready status
router.post('/lobbies/:id/ready', auth('user'), LobbyStateController.toggleReady);

// POST /api/lobbies/:id/delay — request +60s delay
router.post('/lobbies/:id/delay', auth('user'), LobbyStateController.requestDelay);

// GET /api/players/:userId/incoming-matches — all upcoming matches for a player
router.get('/players/:userId/incoming-matches', auth('user'), LobbyStateController.getIncomingMatches);

export default router;
