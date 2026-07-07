import { Request, Response, NextFunction } from 'express';
import ParticipantService from '../services/ParticipantService';
import asyncHandler from '../lib/asyncHandler';
import ApiError from '../utils/ApiError';
import { prisma } from '../services/prisma';

const getHistory = asyncHandler(async (req: Request, res: Response) => {
    const participantId = req.params.id;
    const history = await ParticipantService.getHistory(participantId);
    res.json(history);
});

export const ParticipantController = {
    getHistory,
    async join(req: Request, res: Response, next: NextFunction) {
      try {
        const { discordId, additionalInformation, referralSource, joinAsReserve } = req.body || {};
        const contactInfo = additionalInformation || discordId;
        const result = await ParticipantService.join(req.params.tournamentId, (req as any).user.id, contactInfo, referralSource, joinAsReserve);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    async guestJoin(req: Request, res: Response, next: NextFunction) {
      try {
        const { guestName, email, discordId, additionalInformation, referralSource, joinAsReserve } = req.body || {};
        const contactInfo = additionalInformation || discordId;
        const result = await ParticipantService.guestJoin(req.params.tournamentId, guestName, email, contactInfo, referralSource, joinAsReserve);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    async adminAssign(req: Request, res: Response, next: NextFunction) {
      try {
        const { userId, joinAsReserve } = req.body || {};
        if (!userId) {
          return res.status(400).json({ message: 'userId is required' });
        }

        const participant = await ParticipantService.adminAssign(req.params.tournamentId, userId, joinAsReserve);
        res.status(201).json({ participant });
      } catch (err) {
        next(err);
      }
    },
    async listReserves(req: Request, res: Response, next: NextFunction) {
      try {
        const reserves = await ParticipantService.listReserves(req.params.tournamentId);
        res.json({ reserves });
      } catch (err) {
        next(err);
      }
    },
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string | undefined;
        const result = await ParticipantService.list(req.params.tournamentId, page, limit, search);
        res.json({ participants: result.data, total: result.total });
      } catch (err) {
        next(err);
      }
    },
    async leaderboard(req: Request, res: Response, next: NextFunction) {
      try {
        const leaderboard = await ParticipantService.leaderboard(req.params.tournamentId);
        res.json({ leaderboard });
      } catch (err) {
        next(err);
      }
    },
    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const user = req.user!;
        if (user.role === 'partner') {
          const participant = await prisma.participant.findUnique({
            where: { id: req.params.participantId },
            include: { tournament: { select: { organizerId: true } } },
          });
          if (!participant) throw new ApiError(404, 'Participant not found');
          if (participant.tournament.organizerId !== user.id) {
            throw new ApiError(403, 'You can only manage participants in your own tournaments.');
          }
        }
        const participant = await ParticipantService.update(req.params.participantId, req.body);
        res.json({ participant });
      } catch (err) {
        next(err);
      }
    },
    checkIn: asyncHandler(async (req: Request, res: Response) => {
      const user = req.user!;
      const { checkedIn } = req.body ?? {};
      const participant = await ParticipantService.checkIn(
        req.params.tournamentId,
        req.params.participantId,
        user.id,
        user.role,
        checkedIn
      );
      res.json({ participant });
    }),
    async remove(req: Request, res: Response, next: NextFunction) {
      try {
        await ParticipantService.remove(req.params.participantId);
        res.json({ message: 'deleted' });
      } catch (err) {
        next(err);
      }
    },
    async paginatedLeaderboard(req: Request, res: Response, next: NextFunction) {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const result = await ParticipantService.paginatedLeaderboard(req.params.tournamentId, page, limit);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    async topParticipants(req: Request, res: Response, next: NextFunction) {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 3, 10);
        const topPlayers = await ParticipantService.topParticipants(req.params.tournamentId, limit);
        res.json({ participants: topPlayers });
      } catch (err) {
        next(err);
      }
    },
    paymentStatus: asyncHandler(async (req: Request, res: Response) => {
      const { ref } = req.query;
      if (!ref || typeof ref !== 'string') {
        return res.status(400).json({ error: 'Missing ref' });
      }

      // Check transaction status
      const { prisma } = await import('../services/prisma');
      const transaction = await prisma.transaction.findUnique({
        where: { externalRefId: ref },
        select: { status: true }
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.status(200).json({ status: transaction.status });
    })
}; 
