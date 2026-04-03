import { Request, Response, NextFunction } from 'express';
import RoundService from '../services/RoundService';
import LobbyService from '../services/LobbyService';

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
      const { /* name, */ roundNumber, startTime, endTime, status } = req.body;
      const round = await RoundService.create(req.params.phaseId, {
        roundNumber,
        startTime: startTime ? new Date(startTime) : new Date(),
        // endTime: endTime ? new Date(endTime) : undefined, // Removed endTime from RoundService.create data
        status: status || 'pending'
      });
      res.json({ round });
    } catch (err) {
      next(err);
    }
  },
  async autoAdvance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RoundService.autoAdvance(req.params.roundId);
      res.json({ result });
    } catch (err) {
      next(err);
    }
  },
  async lobbies(req: Request, res: Response, next: NextFunction) {
    try {
      const lobbies = await LobbyService.list(req.params.roundId);
      res.json({ lobbies });
    } catch (err) {
      next(err);
    }
  }
}; 