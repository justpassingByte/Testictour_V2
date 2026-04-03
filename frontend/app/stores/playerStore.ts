import { create } from 'zustand';
import { PlayerService, PlayerMatchSummary } from '../services/PlayerService';
import { IUser } from '../types/user';
import { Player } from './miniTourLobbyStore';
import { AdminService } from '../services/AdminService';
import { PartnerService } from '../services/PartnerService';

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
  stats: PlayerStats;
  level?: number;
}

export interface PlayerTournamentDisplay {
  id: string;
  name: string;
  status: string;
  currentRound: number; // This needs to be calculated/derived from phases/rounds
  totalRounds: number; // This needs to be calculated/derived from phases/rounds
  placement: number | null;
  points: number;
  eliminated: boolean;
  joinedAt: string;
}

export interface PlayerMatchDisplay {
  id: string;
  tournamentId: string;
  tournamentName: string;
  roundNumber: number;
  matchId: string;
  placement: number;
  points: number;
  date: string;
  userId: string;
}

interface PlayerState {
  player: PlayerDetails | null;
  playerTournaments: PlayerTournamentDisplay[];
  playerMatches: PlayerMatchDisplay[];
  matchResults: PlayerMatchDisplay[];
  matchDetailsRaw: any; // Raw Match Data from Riot
  stats: PlayerStats; // Directly use the backend's PlayerStats
  isLoading: boolean;
  error: string | null;
  allPlayers: Player[]; // New: To store a list of all players
  fetchPlayer: (playerId: string) => Promise<void>;
  fetchPlayerTournaments: (playerId: string) => Promise<void>;
  fetchPlayerMatchesSummary: (playerId: string) => Promise<void>;
  fetchPlayerMatchResults: (matchId: string) => Promise<void>;
  fetchAllPlayers: (searchTerm?: string, referrer?: string) => Promise<void>;
  fetchPartnerPlayers: () => Promise<void>; // New: Action to fetch partner-specific players
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  playerTournaments: [],
  playerMatches: [],
  matchResults: [],
  matchDetailsRaw: null,
  stats: {
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    completedTournaments: 0,
    matchesPlayed: 0,
    averagePlacement: 0,
    topFourRate: 0,
    firstPlaceRate: 0,
    tournamentStats: []
  },
  isLoading: true,
  error: null,
  allPlayers: [], // Initialize new state

  fetchPlayer: async (playerId: string) => {
    try {
      set({ isLoading: true, error: null });
      const playerDetails = await PlayerService.getPlayerDetails(playerId);
      set({
        player: playerDetails,

        stats: playerDetails.stats // Directly set stats from playerDetails
      });
    } catch (error) {
      set({ error: 'Failed to fetch player data' });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchPlayerMatchResults: async (matchId: string) => {
    try {
      set({ isLoading: true, error: null, matchDetailsRaw: null });
      const rawDetails = await PlayerService.getMatchFullDetails(matchId);
      // Wait, is it returning the whole JSON object or `{ results: ... }`?
      // In MatchController: res.json(details); so it's rawDetails.
      set({ matchDetailsRaw: rawDetails, matchResults: [] }); // Set matchResults empty, as we're switching to raw
    } catch (error) {
      console.error(error);
      set({ error: 'Failed to fetch match details' });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchPlayerTournaments: async (playerId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await PlayerService.getPlayerTournamentHistory(playerId, 50); // Fetch up to 50 tournaments
      const summaries = response.data;

      const playerTournaments: PlayerTournamentDisplay[] = summaries.map(summary => ({
        id: summary.tournamentId,
        name: summary.tournament.name,
        status: summary.tournament.status,
        // These need to be fetched/calculated if not in summary, or default
        currentRound: 0, // Placeholder, can be calculated if tournament phases/rounds are in summary
        totalRounds: 0, // Placeholder
        placement: summary.placement,
        points: summary.points,
        eliminated: summary.eliminated,
        joinedAt: summary.joinedAt,
      }));

      set({ playerTournaments });
    } catch (error) {
      set({ error: 'Failed to fetch player tournaments' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPlayerMatchesSummary: async (playerId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await PlayerService.getPlayerMatchSummaries(playerId, 10); // Fetch up to 10 matches
      const summaries = response.data;

      const playerMatches: PlayerMatchDisplay[] = summaries.map(summary => ({
        id: summary.matchId,
        tournamentId: summary.tournamentId,
        tournamentName: summary.tournamentName,
        roundNumber: summary.roundNumber,
        matchId: summary.matchId,
        placement: summary.placement,
        points: summary.points,
        date: new Date(summary.playedAt).toLocaleDateString(),
        userId: summary.userId,
      }));

      set({ playerMatches });
    } catch (error) {
      set({ error: 'Failed to fetch player matches' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllPlayers: async (searchTerm?: string, referrer?: string) => {
    set({ isLoading: true, error: null });
    try {
      let players: Player[];
      if (referrer) {
        players = await PartnerService.getUsersByReferrer(referrer, searchTerm);
      } else {
        players = await AdminService.getAllUsers(searchTerm);
      }
      set({ allPlayers: players });
    } catch (error) {
      console.error("Failed to fetch all players:", error);
      set({ error: "Failed to fetch all players data" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPartnerPlayers: async () => {
    set({ isLoading: true, error: null });
    try {
      const players = await PartnerService.getPartnerPlayers();
      set({ allPlayers: players });
    } catch (error) {
      console.error("Failed to fetch partner players:", error);
      set({ error: "Failed to fetch partner players data" });
    } finally {
      set({ isLoading: false });
    }
  },
}));