import { Router } from 'express';
import RoundController from '../controllers/RoundController';
import auth from '../middlewares/auth';

const router = Router();

// ── Round actions ─────────────────────────────────────────────────────────────
// Both admin and partner can trigger manual overrides for their own tournaments
router.post('/:roundId/auto-advance',       auth('admin', 'partner'), RoundController.autoAdvance);
router.post('/:roundId/force-fetch-lobbies', auth('admin', 'partner'), RoundController.forceFetchLobbies);
router.post('/:roundId/force-complete',      auth('admin', 'partner'), RoundController.forceComplete);
router.get('/:roundId/lobbies',              RoundController.lobbies);

// ── Lobby-level overrides (grouped under /rounds for convenience) ─────────────
router.post('/lobbies/:lobbyId/force-start', auth('admin', 'partner'), RoundController.forceStartLobby);
router.get('/lobbies/:lobbyId/detail',                                  RoundController.getLobbyDetail);

export default router;
