import { Request, Response, NextFunction } from 'express';
import TournamentService from '../services/TournamentService';
import ApiError from '../utils/ApiError';
import { prisma } from '../services/prisma';
import asyncHandler from '../lib/asyncHandler';

/**
 * Helper: Verify that a partner user owns a tournament (or is admin).
 * Throws 403 if not authorized.
 */
async function ensureOwnership(req: Request, tournamentId: string) {
  const user = req.user!;
  if (user.role === 'admin') return; // admins can do anything

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true },
  });
  if (!tournament) throw new ApiError(404, 'Tournament not found');
  if (tournament.organizerId !== user.id) {
    throw new ApiError(403, 'You can only manage your own tournaments.');
  }
}

/**
 * Helper: Check if partner has a paid subscription to create tournaments.
 */
async function ensurePaidPartner(userId: string) {
  const subscription = await prisma.partnerSubscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  if (!subscription || subscription.status !== 'ACTIVE' || subscription.plan === 'FREE') {
    throw new ApiError(403, 'A PRO or ENTERPRISE subscription is required to create tournaments. Please upgrade your plan.');
  }
  
  // Enforce monthly limits
  const planConfig = await prisma.subscriptionPlanConfig.findUnique({
    where: { plan: subscription.plan }
  });
  
  const maxTournaments = planConfig ? planConfig.maxTournamentsPerMonth : 0;
  if (maxTournaments !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const tournamentCountThisMonth = await prisma.tournament.count({
      where: {
        organizerId: userId,
        createdAt: { gte: startOfMonth }
      }
    });

    if (tournamentCountThisMonth >= maxTournaments) {
      const io = (global as any).io;
      if (io) {
        io.to(`user:${userId}`).emit('admin_notification', {
          id: `limit_${Date.now()}`,
          title: 'Tournament Limit Reached',
          body: `You have reached your limit of ${maxTournaments} tournaments this month on your ${subscription.plan} plan.`,
          link: '/vi/dashboard/partner?action=upgrade',
          sentAt: new Date().toISOString()
        });
      }
      throw new ApiError(403, `You have reached the limit of ${maxTournaments} tournaments this month for your ${subscription.plan} plan.`);
    }
  }
}

const TournamentController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      let data;

      if (user && user.role === 'admin') {
        data = await TournamentService.listForAdmin();
      } else {
        data = await TournamentService.list();
      }
      
      res.json({ tournaments: data });
    } catch (err) {
      next(err);
    }
  },

  // GET /tournaments/my — returns tournaments organized by current user
  myTournaments: asyncHandler(async (req, res) => {
    const user = req.user!;
    const tournaments = await prisma.tournament.findMany({
      where: { organizerId: user.id },
      include: {
        organizer: { select: { id: true, username: true, email: true } },
        participants: { select: { id: true } },
        phases: {
          include: {
            rounds: {
              include: {
                lobbies: {
                  include: { matches: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to include registered count
    const mapped = tournaments.map((t) => ({
      ...t,
      registered: t.participants.length,
    }));

    res.json({ tournaments: mapped });
  }),

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;

      // If partner, check paid subscription
      if (user.role === 'partner') {
        await ensurePaidPartner(user.id);
      }

      const data = await TournamentService.create({
        name: req.body.name,
        startTime: new Date(req.body.startTime),
        maxPlayers: req.body.maxPlayers,
        entryFee: req.body.entryFee,
        organizerId: user.id,
        registrationDeadline: new Date(req.body.registrationDeadline),
        description: req.body.description,
        image: req.body.image,
        region: req.body.region,
        phases: req.body.config?.phases || req.body.phases,
        hostFeePercent: req.body.hostFeePercent,
        expectedParticipants: req.body.expectedParticipants,
        isCommunityMode: req.body.isCommunityMode,
      });
      res.json({ tournament: data });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const tournament = await TournamentService.detail(req.params.id);
      res.json({ tournament });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      // Partner can only update own tournaments
      await ensureOwnership(req, req.params.id);
      const tournament = await TournamentService.update(req.params.id, req.body);
      res.json({ tournament });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      // Partner can only delete own tournaments
      await ensureOwnership(req, req.params.id);
      await TournamentService.remove(req.params.id);
      res.json({ message: 'deleted' });
    } catch (err) {
      next(err);
    }
  },

  async createAutoTournament(req: Request, res: Response, next: NextFunction) {
    try {
      const { templateId } = req.body;

      if (!templateId) {
        throw new ApiError(400, 'Template ID is required');
      }

      const template = await prisma.tournamentTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        throw new ApiError(404, 'Tournament template not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [hours, minutes] = template.startTime.split(':').map(Number);

      const tournamentStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);

      const registrationDeadline = new Date(tournamentStartTime.getTime());
      registrationDeadline.setHours(registrationDeadline.getHours() - 1);

      const now = new Date();
      if (registrationDeadline.getTime() < now.getTime()) {
        registrationDeadline.setTime(now.getTime() + 5 * 60 * 1000);
      }

      const exists = await prisma.tournament.findFirst({
        where: {
          templateId: template.id,
          startTime: tournamentStartTime
        }
      });

      if (exists) {
        throw new ApiError(409, 'A tournament has already been created for today from this template.');
      }

      const newTournament = await TournamentService.create({
        name: template.name + ' ' + new Date().toLocaleDateString(),
        startTime: tournamentStartTime,
        maxPlayers: template.maxPlayers,
        entryFee: template.entryFee,
        organizerId: req.user!.id,
        registrationDeadline: registrationDeadline,
        templateId: template.id,
        prizeStructure: template.prizeStructure,
        hostFeePercent: template.hostFeePercent,
        expectedParticipants: template.expectedParticipants,
      });

      res.json({ tournament: newTournament });
    } catch (err) {
      next(err);
    }
  },

  syncMatches: asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    // Partner can only sync own tournaments
    await ensureOwnership(req, id);
    const result = await TournamentService.queueSyncJobs(id);
    res.status(202).json({
      success: true,
      message: result.message,
      data: {
        matchesQueued: result.matchesQueued
      }
    });
  }),

  getParticipants: asyncHandler(async (req, res, next) => {
    // Placeholder
  }),

  addParticipant: asyncHandler(async (req, res, next) => {
    // Placeholder
  })
};

export default TournamentController;