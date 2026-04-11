import { Request, Response, NextFunction } from 'express';
import LobbyService from '../services/LobbyService';

export default {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const lobbies = await LobbyService.list(req.params.roundId);
      res.json({ success: true, data: lobbies });
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const lobby = await LobbyService.create(req.params.roundId, req.body);
      res.json({ success: true, data: lobby });
    } catch (err) {
      next(err);
    }
  },
  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const lobby = await LobbyService.getById(req.params.id);
      if (!lobby) return res.status(404).json({ success: false, error: 'Lobby not found' });
      res.json({ success: true, data: lobby });
    } catch (err) {
      next(err);
    }
  }
}; 