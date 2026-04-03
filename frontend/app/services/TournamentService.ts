import { ITournament, PrizeStructure, IPhaseConfig, IParticipant } from '../types/tournament';
import api from '../lib/apiConfig';

export const TournamentService = {
  async list(): Promise<{ tournaments: ITournament[] }> {
    try {
      const response = await api.get('/tournaments');
      // Correctly access the 'tournaments' array from response.data
      const tournaments: ITournament[] = response.data.tournaments;
      return { tournaments };
    } catch  {
      console.error('Error fetching tournaments:');
      throw new Error('Error fetching tournaments');
    }
  },

  async detail(id: string): Promise<ITournament> {
    try {
      const response = await api.get(`/tournaments/${id}`);
      console.log("Raw response from TournamentService.detail:", response.data);
      const rawTournament = response.data.tournament; // Access the nested tournament object
      const tournament: ITournament = {
        ...rawTournament,
        rounds: rawTournament.config?.phases || [], // Map phases to rounds
        participants: rawTournament.participants || [], // Assuming participants will be here or an empty array
      };
      return tournament;
    } catch  {
      console.error('Error fetching tournament details:');
      throw new Error('Error fetching tournament details');
    }
  },

  async create(data: {
    name: string;
    startTime: Date;
    maxPlayers: number;
    organizerId: string;
    roundsTotal: number;
    entryFee: number;
    registrationDeadline: Date;
    prizeStructure?: PrizeStructure;
    hostFeePercent?: number;
    expectedParticipants?: number;
    templateId?: string;
    config?: { phases: IPhaseConfig[] };
  }): Promise<ITournament> {
    try {
      const response = await api.post('/tournaments', {
        ...data,
        startTime: data.startTime.toISOString(),
        registrationDeadline: data.registrationDeadline.toISOString(),
      });

      const tournament: ITournament = response.data;
      return tournament;
    } catch  {
      console.error('Error creating tournament:');
      throw new Error('Error creating tournament');
    }
  },

  async update(id: string, data: Partial<ITournament>): Promise<ITournament> {
    try {
      const response = await api.put(`/tournaments/${id}`, data);
      const tournament: ITournament = response.data;
      return tournament;
    } catch  {
      console.error('Error updating tournament:');
      throw new Error('Error updating tournament');
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await api.delete(`/tournaments/${id}`);
    } catch  {
      console.error('Error removing tournament:');
      throw new Error('Error removing tournament');
    }
  },

  async listParticipants(tournamentId: string, page: number = 1, limit: number = 10): Promise<{ participants: IParticipant[] }> {
    try {
      const response = await api.get(`/tournaments/${tournamentId}/participants?page=${page}&limit=${limit}`);
      return response.data; // This should contain { participants: IParticipant[] }
    } catch  {
      console.error('Error fetching tournament participants:');
      throw new Error('Error fetching tournament participants');
    }
  },

  async syncMatches(id: string): Promise<{ message: string, matchesQueued: number }> {
    try {
      const response = await api.post(`/tournaments/${id}/sync`);
      return response.data;
    } catch  {
      console.error('Error syncing matches:');
      throw new Error('Error syncing matches');
    }
  }
};