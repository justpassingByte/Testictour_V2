import { Request, Response, NextFunction } from 'express';
import TemplateService from '../services/TemplateService';

export default {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await TemplateService.list();
      res.json({ templates });
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, maxPlayers, entryFee, prizeStructure, hostFeePercent, expectedParticipants, scheduleType, startTime, phases } = req.body;
      const template = await TemplateService.create({
        name,
        maxPlayers,
        entryFee,
        prizeStructure: prizeStructure || {},
        hostFeePercent: hostFeePercent || 0.1,
        expectedParticipants: expectedParticipants || 0,
        scheduleType: scheduleType || 'daily',
        startTime: startTime || '00:00',
        phases: phases || [],
      }, (req as any).user.id);
      res.json({ template });
    } catch (err) {
      next(err);
    }
  },
  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await TemplateService.detail(req.params.id);
      res.json({ template });
    } catch (err) {
      next(err);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await TemplateService.update(req.params.id, req.body);
      res.json({ template });
    } catch (err) {
      next(err);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await TemplateService.remove(req.params.id);
      res.json({ message: 'deleted' });
    } catch (err) {
      next(err);
    }
  }
};

export {};
