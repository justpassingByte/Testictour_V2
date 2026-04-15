import { IRound, IPhaseConfig } from '../types/tournament';
import api from '../lib/apiConfig';

export class RoundService {
  static async list(phaseId: string): Promise<IRound[]> {
    try {
      const response = await api.get(`/phases/${phaseId}/rounds`);
      console.log("Raw rounds response:", response.data);
      const rounds: IRound[] = response.data.rounds;
      return rounds;
      } catch  {
      console.error('Error fetching rounds:');
      throw new Error('Error fetching rounds');
    }
  }

  static async create(phaseId: string, data: { roundNumber: number; startTime: Date; status?: string; config?: IPhaseConfig }): Promise<IRound> {
    try {
      const response = await api.post(`/phases/${phaseId}/rounds`, {
        ...data,
        startTime: data.startTime.toISOString(),
      });

      const round: IRound = response.data.round;
      return round;
    } catch  {
      console.error('Error creating round:');
      throw new Error('Error creating round');
    }
  }

  /**
   * Server-side computed scoreboard for a specific round.
   * Returns pre-computed scoreboard, match results, summary, round data,
   * and minimal tournament context — all in one request.
   */
  static async getScoreboard(roundId: string, limitMatch?: number | null) {
    const params = new URLSearchParams();
    if (limitMatch && limitMatch > 0) params.set('limitMatch', String(limitMatch));
    const url = `/rounds/${roundId}/scoreboard${params.toString() ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data;
  }
} 