import { IRiotMatchData } from '../types/riot';
import api from '../lib/apiConfig';

export class MatchResultService {
  static async processMatchResults(matchId: string, matchData: IRiotMatchData): Promise<{ message: string; matchId: string }> {
    try {
      const response = await api.post(`/matches/${matchId}/results`, matchData);
      const data: { message: string; matchId: string } = response.data;
      return data;
      } catch  {
      console.error('Error processing match results:');
      throw new Error('Error processing match results');
    }
  }
} 