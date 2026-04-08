// ── Enriched match data returned by Grimoire /validate ──────────────────────
// This shape matches GrimoireMatchData from the backend GrimoireService.

export interface GrimoireTraitData {
  name: string;
  displayName: string;
  numUnits: number;
  style: number;          // 0=inactive, 1=bronze, 2=silver, 3=gold, 4=prismatic
  tierCurrent: number;
  tierTotal: number;
  iconUrl: string;
}

export interface GrimoireItemData {
  id: string;
  name: string;
  iconUrl: string;
}

export interface GrimoireUnitData {
  characterId: string;
  name: string;
  tier: number;           // star level (1/2/3)
  rarity: number;         // 0-4 = cost tier
  cost: number;
  iconUrl: string;
  items: GrimoireItemData[];
}

export interface GrimoireAugmentData {
  id: string;
  name: string;
  iconUrl: string;
}

export interface GrimoireParticipantData {
  puuid: string;
  placement: number;
  level: number;
  goldLeft: number;
  lastRound: number;
  timeEliminated: number;
  playersEliminated: number;
  totalDamage: number;
  gameName: string;
  tagLine: string;
  traits: GrimoireTraitData[];
  units: GrimoireUnitData[];
  augments: GrimoireAugmentData[];
}

export interface GrimoireMatchData {
  matchId: string;
  gameCreation: number;       // epoch ms
  gameDuration: number;       // seconds
  gameVersion: string;
  queueId: number;
  tftSetNumber: number;
  participants: GrimoireParticipantData[];
}

// Legacy raw Riot type kept for backward compatibility
export interface IRiotMatchData {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: IRiotParticipantData[];
    platformId: string;
    queueId: number;
    tournamentCode: string;
  };
}

export interface IRiotParticipantData {
  puuid: string;
  placement: number;
  points: number;
}
 