import { PrizeStructure } from './tournament';

export interface IPhaseConfig {
  id: string;
  name: string;
  type: 'elimination' | 'points' | 'checkmate';
  lobbySize?: number;
  lobbyAssignment?: 'random' | 'seeded';
  advancementCondition?: {
    top?: number;
    pointsToActivate?: number;
  };
  matchesPerRound?: number;
  eliminationRule?: string;
}

export interface ITournamentTemplate {
  id: string;
  name: string;
  maxPlayers: number;
  entryFee: number;
  prizeStructure: PrizeStructure;
  hostFeePercent: number;
  expectedParticipants: number;
  scheduleType: string;
  startTime: string;
  phases: IPhaseConfig[];
  createdById: string;
} 