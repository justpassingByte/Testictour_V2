import { Request, Response, NextFunction } from 'express';
import ParticipantService from '../services/ParticipantService';
import asyncHandler from '../lib/asyncHandler';

const getHistory = asyncHandler(async (req: Request, res: Response) => {
    const participantId = req.params.id;
    const history = await ParticipantService.getHistory(participantId);
    res.json(history);
});

export const ParticipantController = {
    getHistory,
    async join(req: Request, res: Response, next: NextFunction) {
      try {
        const { discordId, referralSource } = req.body || {};
        const participant = await ParticipantService.join(req.params.tournamentId, (req as any).user.id, discordId, referralSource);
        res.json({ participant });
      } catch (err) {
        next(err);
      }
    },
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const participants = await ParticipantService.list(req.params.tournamentId, page, limit);
        res.json({ participants });
      } catch (err) {
        next(err);
      }
    },
    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const participant = await ParticipantService.update(req.params.participantId, req.body);
        res.json({ participant });
      } catch (err) {
        next(err);
      }
    },
    async remove(req: Request, res: Response, next: NextFunction) {
      try {
        await ParticipantService.remove(req.params.participantId);
        res.json({ message: 'deleted' });
      } catch (err) {
        next(err);
      }
    }
}; 