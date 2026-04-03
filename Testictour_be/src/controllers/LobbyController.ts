import { Request, Response, NextFunction } from 'express';
import LobbyService from '../services/LobbyService';

export default {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const lobbies = await LobbyService.list(req.params.roundId);
      res.json({ lobbies });
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const lobby = await LobbyService.create(req.params.roundId, req.body);
      res.json({ lobby });
    } catch (err) {
      next(err);
    }
  }
}; 