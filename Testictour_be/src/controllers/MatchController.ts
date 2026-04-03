import { Request, Response, NextFunction } from 'express';
import MatchService from '../services/MatchService';
import asyncHandler from '../lib/asyncHandler';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';

const MatchController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const matches = await MatchService.list(req.params.lobbyId);
      res.json({ matches });
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const match = await MatchService.create(req.params.lobbyId, req.body);
      res.status(201).json(match);
    } catch (error) {
      next(error);
    }
  },
  async results(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await MatchService.results(req.params.matchId);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  },
  async fullDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const details = await MatchService.fullDetails(req.params.matchId);
      res.json(details);
    } catch (err) {
      next(err);
    }
  },
  async updateResults(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MatchService.updateResults(req.params.matchId, req.body);
      res.json({ result });
    } catch (err) {
      next(err);
    }
  },
  async fetchAndSaveMatchData(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId, riotMatchId, lobbyId, region } = req.body;
      const result = await MatchService.fetchAndSaveMatchData(matchId, riotMatchId, lobbyId, region);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
  sync: asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { targetParticipantsPuids, region } = req.body;

    if (!targetParticipantsPuids || !Array.isArray(targetParticipantsPuids) || targetParticipantsPuids.length === 0 || !region) {
      return res.status(400).json({ success: false, message: 'Missing required parameters: targetParticipantsPuids, region in request body.' });
    }

    try {
      const localMatch = await MatchService.getMatchById(id);
      if (!localMatch) {
        throw new ApiError(404, 'Local match not found.');
      }

      const searchStartTime = Math.floor((localMatch.createdAt.getTime() / 1000) - (5 * 60));
      const searchEndTime = Math.floor((new Date().getTime() / 1000) + (60 * 60));

      const riotMatchId = await MatchService.findMatchByCriteria(
        targetParticipantsPuids,
        region,
        searchStartTime,
        searchEndTime
      );

      if (riotMatchId) {
        await MatchService.updateMatchRiotId(id, riotMatchId);
        logger.info(`Local match ${id} updated with Riot Match ID: ${riotMatchId}`);
      } else {
        logger.warn(`No Riot match found for local match ${id} with provided participants and time range.`);
        return res.status(404).json({ success: false, message: 'No corresponding Riot match found.' });
      }

    const result = await MatchService.queueMiniTourMatchSync(id, riotMatchId, region);
    res.status(202).json({
      success: true,
      message: result.message,
    });
    } catch (error) {
      next(error);
    }
  }),
  async createMiniTourMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const miniTourMatch = await MatchService.createMiniTourMatch(req.params.miniTourLobbyId, req.body);
      res.status(201).json(miniTourMatch);
    } catch (error) {
      next(error);
    }
  },
};

export default MatchController; 