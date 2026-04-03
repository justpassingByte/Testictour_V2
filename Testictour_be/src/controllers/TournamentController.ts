import { Request, Response, NextFunction } from 'express';
import TournamentService from '../services/TournamentService';
import ApiError from '../utils/ApiError';
import { prisma } from '../services/prisma';
import asyncHandler from '../lib/asyncHandler';

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

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TournamentService.create({
        name: req.body.name,
        startTime: new Date(req.body.startTime),
        maxPlayers: req.body.maxPlayers,
        entryFee: req.body.entryFee,
        organizerId: req.user!.id,
        registrationDeadline: new Date(req.body.registrationDeadline),
        description: req.body.description,
        image: req.body.image,
        region: req.body.region,
        phases: req.body.phases,
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
      const tournament = await TournamentService.update(req.params.id, req.body);
      res.json({ tournament });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
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