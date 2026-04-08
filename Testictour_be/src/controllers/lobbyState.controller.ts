import { Request, Response } from 'express';
import LobbyStateService from '../services/LobbyStateService';
import logger from '../utils/logger';

/**
 * REST endpoints for lobby state machine.
 * Socket.IO handles real-time after initial SSR hydration.
 *
 * Routes (registered in lobby.routes.ts / index.ts):
 *   GET  /api/lobbies/:id/state
 *   POST /api/lobbies/:id/ready
 *   POST /api/lobbies/:id/delay
 *   GET  /api/players/:userId/incoming-matches
 */
export default class LobbyStateController {
  /**
   * GET /api/lobbies/:id/state
   * Returns full LobbyStateSnapshot including readyPlayers from Redis.
   */
  static async getState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const snapshot = await LobbyStateService.getLobbyState(id);
      return res.json({ success: true, data: snapshot });
    } catch (err: any) {
      logger.error(`LobbyStateController.getState: ${err.message}`);
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/lobbies/:id/ready
   * Toggle the authenticated user's ready status.
   * Body: { userId: string }
   */
  static async toggleReady(req: Request, res: Response) {
    try {
      const { id: lobbyId } = req.params;
      const userId = (req as any).user?.id ?? req.body?.userId;
      if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

      const snapshot = await LobbyStateService.toggleReady(lobbyId, userId);
      return res.json({ success: true, data: snapshot });
    } catch (err: any) {
      logger.error(`LobbyStateController.toggleReady: ${err.message}`);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/lobbies/:id/delay
   * Request a +60s delay extension.
   * Body: { userId: string }
   */
  static async requestDelay(req: Request, res: Response) {
    try {
      const { id: lobbyId } = req.params;
      const userId = (req as any).user?.id ?? req.body?.userId;
      if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

      const snapshot = await LobbyStateService.requestDelay(lobbyId, userId);
      return res.json({ success: true, data: snapshot });
    } catch (err: any) {
      logger.error(`LobbyStateController.requestDelay: ${err.message}`);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/players/:userId/incoming-matches
   * Returns all upcoming matches for a player (not FINISHED/ADMIN_INTERVENTION).
   */
  static async getIncomingMatches(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const matches = await LobbyStateService.getPlayerIncomingMatches(userId);
      return res.json({ success: true, data: matches });
    } catch (err: any) {
      logger.error(`LobbyStateController.getIncomingMatches: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
