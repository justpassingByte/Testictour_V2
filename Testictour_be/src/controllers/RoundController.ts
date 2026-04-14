import { Request, Response, NextFunction } from 'express';
import RoundService from '../services/RoundService';
import LobbyService from '../services/LobbyService';
import LobbyStateService from '../services/LobbyStateService';
import logger from '../utils/logger';
import { prisma } from '../services/prisma';

export default {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rounds = await RoundService.list(req.params.phaseId);
      res.json({ rounds });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { roundNumber, startTime, status } = req.body;
      const round = await RoundService.create(req.params.phaseId, {
        roundNumber,
        startTime: startTime ? new Date(startTime) : new Date(),
        status: status || 'pending'
      });
      res.json({ round });
    } catch (err) {
      next(err);
    }
  },

  /** POST /:roundId/auto-advance — trigger auto-advance for a round (manual override) */
  async autoAdvance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RoundService.autoAdvance(req.params.roundId);
      res.json({ success: true, result });
    } catch (err) {
      next(err);
    }
  },

  /** GET /:roundId/lobbies — list all lobbies for a round */
  async lobbies(req: Request, res: Response, next: NextFunction) {
    try {
      const lobbies = await LobbyService.list(req.params.roundId);
      res.json({ lobbies });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /:roundId/force-fetch-lobbies
   * Sets fetchedResult = true for all lobbies in the round that are stuck waiting.
   * Use when lobby.fetchedResult was not set despite results being available.
   */
  async forceFetchLobbies(req: Request, res: Response, next: NextFunction) {
    try {
      const { roundId } = req.params;
      const round = await prisma.round.findUnique({
        where: { id: roundId },
        include: { lobbies: { select: { id: true, fetchedResult: true, state: true } } }
      });
      if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

      const stuckLobbies = round.lobbies.filter(l => !l.fetchedResult);
      if (stuckLobbies.length === 0) {
        return res.json({ success: true, message: 'All lobbies already have fetchedResult=true', updated: 0 });
      }

      await prisma.lobby.updateMany({
        where: { id: { in: stuckLobbies.map(l => l.id) } },
        data: { fetchedResult: true },
      });

      logger.info(`[ManualOverride] force-fetch-lobbies: set fetchedResult=true for ${stuckLobbies.length} lobbies in round ${roundId}`);
      res.json({ success: true, message: `Marked ${stuckLobbies.length} lobbies as fetched`, updated: stuckLobbies.length });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /:roundId/force-complete
   * Forces all lobbies in the round to fetchedResult=true, then triggers autoAdvance.
   * Use when round is stuck and you want to forcibly advance to next phase/round.
   */
  async forceComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const { roundId } = req.params;
      const round = await prisma.round.findUnique({
        where: { id: roundId },
        include: { lobbies: { select: { id: true, fetchedResult: true } } }
      });
      if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

      // Mark all lobbies as fetched
      await prisma.lobby.updateMany({
        where: { roundId },
        data: { fetchedResult: true },
      });
      logger.info(`[ManualOverride] force-complete: set fetchedResult=true for all ${round.lobbies.length} lobbies in round ${roundId}`);

      // Now trigger auto-advance
      const result = await RoundService.autoAdvance(roundId);
      res.json({ success: true, message: 'Force-completed round and triggered auto-advance', result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /lobbies/:lobbyId/force-start
   * Force-starts a lobby that is stuck in WAITING or READY_CHECK state.
   * Bypasses the ready check and immediately transitions to STARTING → PLAYING.
   * Use when players cannot or will not ready up.
   */
  async forceStartLobby(req: Request, res: Response, next: NextFunction) {
    try {
      const { lobbyId } = req.params;
      await LobbyStateService.forceStart(lobbyId);
      logger.info(`[ManualOverride] force-start: lobby ${lobbyId} forced to STARTING`);
      res.json({ success: true, message: `Lobby ${lobbyId} force-started` });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /lobbies/:lobbyId/detail
   * Lazy-loads full lobby detail: players with aggregate scores, match history, per-match results.
   * Called when user clicks into a lobby card in the bracket UI.
   */
  async getLobbyDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { lobbyId } = req.params;
      const detail = await RoundService.getLobbyDetail(lobbyId);
      res.json({ success: true, ...detail });
    } catch (err) {
      next(err);
    }
  },
};