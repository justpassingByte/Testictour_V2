import { IMatch, IMatchResult } from '../types/tournament';
import api from '../lib/apiConfig';
import { MiniTourLobby } from '../stores/miniTourLobbyStore';

export class MatchService {
  static async list(lobbyId: string): Promise<IMatch[]> {
    try {
      const response = await api.get(`/lobbies/${lobbyId}/matches`);
      const matches: IMatch[] = response.data;
      return matches;
      } catch  {
      console.error('Error fetching matches:');
      throw new Error('Error fetching matches');
    }
  }

  static async create(lobbyId: string, data: Partial<IMatch>): Promise<IMatch> {
    try {
      const response = await api.post(`/lobbies/${lobbyId}/matches`, data);
      const match: IMatch = response.data;
      return match;
    } catch  {
      console.error('Error creating match:');
      throw new Error('Error creating match');
    }
  }

  static async results(matchId: string): Promise<IMatchResult[]> {
    try {
      const response = await api.get(`/${matchId}/results`);
      const results: IMatchResult[] = response.data;
      return results;
    } catch  {
      console.error('Error fetching match results:');
      throw new Error('Error fetching match results');
    }
  }

  static async updateResults(matchId: string, data: IMatchResult[]): Promise<{ message: string; matchId: string }> {
    try {
      const response = await api.put(`/${matchId}/results`, data);
      const result: { message: string; matchId: string } = response.data;
      return result;
    } catch  {
      console.error('Error updating match results:');
      throw new Error('Error updating match results');
    }
  }

  static async fetchAndSaveMatchData(matchId: string, riotMatchId: string, region: string = 'asia'): Promise<{ message: string; matchId: string }> {
    try {
      const response = await api.post(`/${matchId}/fetch-data`, { riotMatchId, region });
      const result: { message: string; matchId: string } = response.data;
      return result;
    } catch  {
      console.error('Error queuing match data fetch:');
      throw new Error('Error queuing match data fetch');
    }
  }

  static async syncMatch(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/matches/${id}/sync`);
    return response.data;
  }

  /**
   * Triggers a sync for a single Mini Tour match.
   * The backend will fetch data from Riot API and update match results.
   */
  static async syncMiniTourMatch(matchId: string) {
    return api.post<{ success: boolean; data: MiniTourLobby }>(`/matches/${matchId}/sync`);
  }

  /**
   * Triggers a sync for all unsynced matches in a specific lobby.
   */
  static async syncAllLobbyMatches(lobbyId: string) {
    return api.post<{ success: boolean; data: MiniTourLobby }>(`/minitour-lobbies/${lobbyId}/sync-all`);
  }
} 