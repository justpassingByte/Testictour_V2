import { ITournamentTemplate } from '../types/template';
import { PrizeStructure, IPhaseConfig } from '../types/tournament';
import api from '../lib/apiConfig';

export class TemplateService {
  static async list(): Promise<ITournamentTemplate[]> {
    try {
      const response = await api.get('/templates');
      const templates: ITournamentTemplate[] = response.data;
      return templates;
      } catch  {
      console.error('Error fetching templates:');
      throw new Error('Error fetching templates');
    }
  }

  static async create(data: { 
    name: string;
    roundsTotal: number;
    maxPlayers: number;
    entryFee: number;
    prizeStructure: PrizeStructure;
    hostFeePercent: number;
    expectedParticipants: number;
    scheduleType: string;
    startTime: string;
    phases: IPhaseConfig[];
  }): Promise<ITournamentTemplate> {
    try {
      const response = await api.post('/templates', data);
      const template: ITournamentTemplate = response.data;
      return template;
    } catch  {
      console.error('Error creating template:');
      throw new Error('Error creating template');
    }
  }

  static async detail(id: string): Promise<ITournamentTemplate> {
    try {
      const response = await api.get(`/templates/${id}`);
      const template: ITournamentTemplate = response.data;
      return template;
    } catch  {
      console.error('Error fetching template details:');
      throw new Error('Error fetching template details');
    }
  }

  static async update(id: string, data: Partial<ITournamentTemplate>): Promise<ITournamentTemplate> {
    try {
      const response = await api.put(`/templates/${id}`, data);
      const template: ITournamentTemplate = response.data;
      return template;
    } catch  {
      console.error('Error updating template:');
      throw new Error('Error updating template');
    }
  }

  static async remove(id: string): Promise<void> {
    try {
      await api.delete(`/templates/${id}`);
    } catch  {
      console.error('Error removing template:');
      throw new Error('Error removing template');
    }
  }
} 