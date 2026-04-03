import { IUser } from "./user";
import { IRiotMatchData } from './riot';

export interface IRoundOutcome {
  id: string;
  participantId: string;
  roundId: string;
  status: 'advanced' | 'eliminated';
  scoreInRound: number;
  round: {
    id: string;
    roundNumber: number;
    phase: {
      id: string;
      phaseNumber: number;
      name: string;
    }
  }
}

export type PrizeStructure = Record<string, number>;

export interface IAdvancementConditionTopN {
  type: "top_n_scores";
  value: number;
}

export interface IAdvancementConditionPlacement {
  type: "placement";
  value: number;
}

export interface IAdvancementConditionCheckmate {
  winCondition: string;
  pointsToActivate: number;
}

export interface IPhaseConfig {
  id: string;
  name: string;
  type: 'elimination' | 'points' | 'checkmate' | 'swiss' | 'round_robin';
  lobbySize?: number;
  lobbyAssignment?: 'random' | 'seeded';
  advancementCondition?: IAdvancementConditionTopN | IAdvancementConditionPlacement | IAdvancementConditionCheckmate;
  matchesPerRound?: number;
  eliminationRule?: string;
}

export interface IPhase {
  id: string;
  tournamentId: string;
  name:string;
  phaseNumber: number;
  type: 'elimination' | 'points' | 'checkmate' | 'swiss' | 'round_robin' | 'GROUP_STAGE' | 'KNOCKOUT';
  numberOfGroups?: number;
  numberOfRounds?: number;
  lobbySize?: number;
  lobbyAssignment?: string;
  advancementCondition?: IPhaseConfig['advancementCondition'];
  matchesPerRound?: number;
  eliminationRule?: string;
  status: string;
  rounds: IRound[];
  tieBreakerRule?: string;
  pointsMapping?: Record<string, number>;
  carryOverScores?: boolean;
}

export interface IRound {
  id: string;
  phaseId: string;
  roundNumber: number;
  startTime: Date;
  endTime: Date | null;
  status: 'pending' | 'in_progress' | 'completed';
  lobbies?: ILobby[];
  matches?: IMatch[];
  completed: boolean;
}

export interface IParticipant {
  id: string;
  tournamentId: string;
  userId?: string;
  inGameName: string;
  gameSpecificId: string;
  region: string;
  rank: string;
  user?: IUser;
  paid?: boolean;
  eliminated?: boolean;
  roundOutcomes?: IRoundOutcome[];
  scoreTotal?: number;
}

export interface PlayerRoundStats {
  id: string;
  name: string;
  region: string;
  lobbyName: string;
  placements: number[];
  lastPlacement: number;
  points: number[];
  total: number;
  status: "advanced" | "eliminated";
}

export interface ILobby {
  id: string;
  roundId: string;
  name: string;
  participants: string[]; // This will be participant IDs
  participantDetails?: IParticipant[];
  matches?: IMatch[];
  matchId: string | null;
  fetchedResult: boolean;
}

export interface IMatch {
  id: string;
  lobbyId: string;
  riotMatchId?: string;
  status: string;
  matchData?: IRiotMatchData;
}

export interface IMatchResult {
  matchId: string;
  participantId: string;
  placement: number;
  points: number;
}

export interface ITournamentTemplate {
  name: string;
  description?: string;
  rules?: string;
  image?: string;
  region: string;
  status: 'DRAFT' | 'UPCOMING' | 'REGISTRATION' | 'in_progress' | 'COMPLETED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  maxPlayers: number;
  entryFee: number;
  prizeStructure?: any;
  game: string;
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
  hostFeePercent?: number;
  checkInTime?: number;
  phases: IPhase[];
}

export interface ITournament extends ITournamentTemplate {
  id: string;
  organizer: IUser;
  participants?: IParticipant[];
  budget?: number;
  registered?: number | null;
  roundsTotal: number;
  currentRound: number;
  lastSyncTime?: string | null;
  syncStatus?: 'SYNCING' | 'SUCCESS' | 'FAILED' | null;
} 