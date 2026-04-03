import { prisma } from './prisma';
import ApiError from '../utils/ApiError';

export default class TemplateService {
  static async list() {
    return prisma.tournamentTemplate.findMany();
  }
  static async create(data: {
    name: string;
    maxPlayers: number;
    entryFee: number;
    prizeStructure: any;
    hostFeePercent: number;
    expectedParticipants: number;
    scheduleType: string;
    startTime: string;
    phases: any;
  }, createdById: string) {
    const allowedScheduleTypes = ['daily', 'weekly', 'monthly'];
    if (!allowedScheduleTypes.includes(data.scheduleType)) {
      throw new ApiError(400, 'Invalid scheduleType. Must be daily, weekly, or monthly.');
    }

    // Validate startTime format HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.startTime)) {
      throw new ApiError(400, 'Invalid startTime format. Must be HH:MM (e.g., 18:00).');
    }

    return prisma.tournamentTemplate.create({ data: { ...data, createdById } });
  }
  static async detail(id: string) {
    const template = await prisma.tournamentTemplate.findUnique({ where: { id } });
    if (!template) throw new ApiError(404, 'Template not found');
    return template;
  }
  static async update(id: string, data: any) {
    const allowedScheduleTypes = ['daily', 'weekly', 'monthly'];
    if (data.scheduleType && !allowedScheduleTypes.includes(data.scheduleType)) {
      throw new ApiError(400, 'Invalid scheduleType. Must be daily, weekly, or monthly.');
    }

    // Validate startTime format HH:MM if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (data.startTime && !timeRegex.test(data.startTime)) {
      throw new ApiError(400, 'Invalid startTime format. Must be HH:MM (e.g., 18:00).');
    }
    return prisma.tournamentTemplate.update({ where: { id }, data });
  }
  static async remove(id: string) {
    return prisma.tournamentTemplate.delete({ where: { id } });
  }
} 