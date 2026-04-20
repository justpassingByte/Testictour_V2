import { Request, Response, NextFunction } from 'express';
import LobbyService from '../services/LobbyService';
import ReservePlayerService from '../services/ReservePlayerService';

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
  },
  async kickPlayer(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId is required' });
      const adminId = (req as any).user?.id || 'system';
      const result = await ReservePlayerService.kickPlayer(req.params.lobbyId, targetUserId, adminId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
  async assignReserve(req: Request, res: Response, next: NextFunction) {
    try {
      const { reserveUserId } = req.body;
      if (!reserveUserId) return res.status(400).json({ success: false, message: 'reserveUserId is required' });
      const adminId = (req as any).user?.id || 'system';
      const result = await ReservePlayerService.assignReserve(req.params.lobbyId, reserveUserId, adminId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}; 