import api from '../lib/apiConfig';
import { IParticipant, IMatchResult, ITournament } from '../types/tournament';
import { IUser } from '../types/user';
import { Player } from '../stores/miniTourLobbyStore';

// New PlayerStats interface to match backend
interface PlayerStats {
  tournamentsPlayed: number;
  tournamentsWon: number;
  completedTournaments: number;
  matchesPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
  tournamentStats: Array<{
    tournamentId: string;
    tournamentName: string;
    status: string;
    matches: number;
    eliminated: boolean;
    scoreTotal: number;
  }>;
}

// Updated PlayerDetails interface
interface PlayerDetails {
  id: string;
  inGameName: string;
  gameSpecificId: string;
  region: string;
  rank: string;
  user?: IUser;
  eliminated: boolean;
  scoreTotal: number;
  joinedAt: string;
  stats: PlayerStats; // Use the comprehensive PlayerStats interface
}

// Keep PlayerMatchSummary as is, it's the raw data from backend /players/:id/matches
export interface PlayerMatchSummary {
  id: string; // This is matchId
  userId: string;
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  roundNumber: number;
  placement: number;
  points: number;
  playedAt: string;
}

// Keep UserTournamentSummary as is, it's the raw data from backend /players/:id/tournaments
interface UserTournamentSummary {
  id: string; // This is the summary ID, not tournament ID
  userId: string;
  tournamentId: string;
  tournament: {
    name: string;
    startTime: string;
    endTime: string | null;
    status: string;
  };
  joinedAt: string;
  placement: number | null;
  points: number;
  eliminated: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeaderboardPlayer {
  id: string;
  username: string;
  riotGameName: string;
  riotGameTag: string;
  region: string;
  rank: string;
  totalMatchesPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  totalPoints: number;
  lobbiesPlayed: number;
  createdAt: string;
}

export class PlayerService {
  private static cache = {
    playerDetails: new Map<string, { data: PlayerDetails, timestamp: number }>(),
    playerMatchHistory: new Map<string, { data: PaginatedResponse<PlayerMatchSummary>, timestamp: number }>(),
    playerTournamentHistory: new Map<string, { data: PaginatedResponse<UserTournamentSummary>, timestamp: number }>(),
    playerStats: new Map<string, { data: PlayerStats, timestamp: number }>() // Updated cache type
  };
  
  private static isCacheValid(timestamp: number) {
    return Date.now() - timestamp < 60 * 1000; // Cache valid for 1 minute
  }

  // Public leaderboard endpoint (no auth required)
  static async getLeaderboard(search?: string, limit: number = 50, offset: number = 0): Promise<PaginatedResponse<LeaderboardPlayer>> {
    try {
      const params: Record<string, string | number> = { limit, offset };
      if (search) params.search = search;
      const response = await api.get('/players/leaderboard', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      throw new Error('Failed to fetch leaderboard');
    }
  }

  // Removed getParticipantHistory - not needed with new PlayerDetails endpoint
  static async getPlayerMatchSummaries(playerId: string, limit: number = 10, offset: number = 0): Promise<PaginatedResponse<PlayerMatchSummary>> {
    try {
      const response = await api.get(`/players/${playerId}/matches?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch player match summaries:', error);
      throw new Error('Failed to fetch player match summaries');
    }
  }
  static async getMatchFullDetails(matchId: string): Promise<any> {
    try {
      const response = await api.get(`/${matchId}/full-details`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch full match details:', error);
      throw new Error('Failed to fetch full match details');
    }
  }
  // Renamed and updated getPlayerMatchSummaries
  static async getPlayerMatchHistory(
    playerId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedResponse<PlayerMatchSummary>> {
    try {
      const cacheKey = `${playerId}-matches-${limit}-${offset}`;
      const cachedSummaries = this.cache.playerMatchHistory.get(cacheKey);
      if (cachedSummaries && this.isCacheValid(cachedSummaries.timestamp)) {
        return cachedSummaries.data;
      }
      
      const response = await api.get(`/players/${playerId}/matches?limit=${limit}&offset=${offset}`);
      
      this.cache.playerMatchHistory.set(cacheKey, { 
        data: response.data, 
        timestamp: Date.now() 
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch player match history:', error);
      throw new Error('Failed to fetch player match history');
    }
  }

  // Renamed and updated getPlayerTournamentSummaries
  static async getPlayerTournamentHistory(
    playerId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedResponse<UserTournamentSummary>> {
    try {
      const cacheKey = `${playerId}-tournaments-${limit}-${offset}`;
      const cachedSummaries = this.cache.playerTournamentHistory.get(cacheKey);
      if (cachedSummaries && this.isCacheValid(cachedSummaries.timestamp)) {
        return cachedSummaries.data;
      }
      
      const response = await api.get(`/players/${playerId}/tournaments?limit=${limit}&offset=${offset}`);
      
      this.cache.playerTournamentHistory.set(cacheKey, { 
        data: response.data, 
        timestamp: Date.now() 
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch player tournament history:', error);
      throw new Error('Failed to fetch player tournament history');
    }
  }

  // Updated getPlayerStats
  static async getPlayerStats(playerId: string): Promise<PlayerStats> {
    try {
      const cacheKey = `${playerId}-stats`;
      const cachedStats = this.cache.playerStats.get(cacheKey);
      if (cachedStats && this.isCacheValid(cachedStats.timestamp)) {
        return cachedStats.data;
      }
      
      const response = await api.get(`/players/${playerId}/stats`);
      const stats = response.data as PlayerStats; // Cast to new PlayerStats interface
      
      this.cache.playerStats.set(cacheKey, { 
        data: stats, 
        timestamp: Date.now() 
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
      throw new Error('Failed to fetch player stats');
    }
  }

  // getPlayerDetails remains largely the same
  static async getPlayerDetails(playerId: string): Promise<PlayerDetails> {
    try {
      const cacheKey = `${playerId}-details`;
      const cachedDetails = this.cache.playerDetails.get(cacheKey);
      if (cachedDetails && this.isCacheValid(cachedDetails.timestamp)) {
        return cachedDetails.data;
      }
      
      const response = await api.get(`/players/${playerId}`);
      const playerDetails = response.data as PlayerDetails; // Cast to PlayerDetails interface
      
      this.cache.playerDetails.set(cacheKey, { 
        data: playerDetails, 
        timestamp: Date.now() 
      });
      
      return playerDetails;
    } catch (error) {
      console.error('Failed to fetch player details:', error);
      throw new Error('Failed to fetch player details');
    }
  }
  
  static async updatePlayerProfile(playerId: string, data: Partial<IParticipant>): Promise<IParticipant> {
    try {
      const response = await api.put(`/participants/${playerId}`, data);
      
      this.cache.playerDetails.delete(`${playerId}-details`); // Invalidate player details cache
      
      return response.data;
    } catch (error) {
      console.error('Failed to update player profile:', error);
      throw new Error('Failed to update player profile');
    }
  }

  static async updatePlayerRank(playerId: string, rank: string): Promise<{ message: string }> {
    try {
      const response = await api.put(`/players/${playerId}/rank`, { rank });
      
      this.cache.playerDetails.delete(`${playerId}-details`); // Invalidate player details cache
      this.cache.playerStats.delete(`${playerId}-stats`); // Invalidate player stats cache
      
      return response.data;
    } catch (error) {
      console.error('Failed to update player rank:', error);
      throw new Error('Failed to update player rank');
    }
  }
  
  static clearCache() {
    this.cache.playerDetails.clear();
    this.cache.playerMatchHistory.clear();
    this.cache.playerTournamentHistory.clear();
    this.cache.playerStats.clear();
  }
} 