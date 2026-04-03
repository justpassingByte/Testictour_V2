import { create } from 'zustand';
import { ITournament, IParticipant, IRound, IMatchResult } from '@/app/types/tournament';
import { TournamentService } from '@/app/services/TournamentService';

interface TournamentState {
  tournaments: ITournament[];
  currentTournament: ITournament | null;
  currentTournamentParticipants: IParticipant[];
  currentTournamentRounds: IRound[];
  currentRoundDetails: IRound | null;
  matchResults: { [matchId: string]: IMatchResult[] };
  loading: boolean;
  participantsLoading: boolean;
  roundLoading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  fetchTournamentDetail: (id: string) => Promise<void>;
  fetchTournamentParticipants: (tournamentId: string, page?: number, limit?: number) => Promise<void>;
  fetchRoundDetails: (tournamentId: string, roundId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  currentTournament: null,
  currentTournamentParticipants: [],
  currentTournamentRounds: [],
  currentRoundDetails: null,
  matchResults: {},
  loading: false,
  participantsLoading: false,
  roundLoading: false,
  error: null,
  fetchTournaments: async () => {
    set({ loading: true, error: null });
    try {
      const data = await TournamentService.list();
      set({ tournaments: data.tournaments, loading: false });
      } catch  {
      set({ loading: false });
    }
  },
  fetchTournamentDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.detail(id);
      const allRounds = tournament.phases.flatMap(phase => phase.rounds || []);
      set({ 
        currentTournament: tournament, 
        currentTournamentRounds: allRounds,
        loading: false 
      });
    } catch  {
      set({ loading: false });
    }
  },
  fetchTournamentParticipants: async (tournamentId: string, page: number = 1, limit: number = 10) => {
    set({ participantsLoading: true, error: null });
    try {
      const { participants } = await TournamentService.listParticipants(tournamentId, page, limit);
      set((state) => ({
        currentTournamentParticipants: page === 1 ? participants : [...state.currentTournamentParticipants, ...participants],
        participantsLoading: false,
      }));
    } catch  {
      set({ participantsLoading: false });
    }
  },
  fetchRoundDetails: async (tournamentId: string, roundId: string) => {
    set({ roundLoading: true, error: null });
    try {
      const state = get();
      if (!state.currentTournament || state.currentTournament.id !== tournamentId) {
        await state.fetchTournamentDetail(tournamentId);
      }
      if (state.currentTournamentParticipants.length === 0) {
        await state.fetchTournamentParticipants(tournamentId, 1, 1000);
      }

      const updatedState = get();
      const round = updatedState.currentTournamentRounds.find((r) => r.id === roundId);

      if (round) {
        const allMatchResults: { [matchId: string]: IMatchResult[] } = {};
        if (round.lobbies) {
          for (const lobby of round.lobbies) {
            if (lobby.matches) {
              for (const match of lobby.matches) {
                if (match.matchData?.info?.participants) {
                  const results: IMatchResult[] = match.matchData.info.participants.map(p => ({
                    matchId: match.id,
                    participantId: p.puuid,
                    placement: p.placement,
                    points: p.points
                  }));
                  allMatchResults[match.id] = results;
                }
              }
            }
          }
        }
        set({ currentRoundDetails: round, matchResults: allMatchResults, roundLoading: false });
      } else {
        throw new Error(`Round ${roundId} not found in tournament ${tournamentId}`);
      }
    } catch  {
      set({ roundLoading: false });
    }
  },
})); 