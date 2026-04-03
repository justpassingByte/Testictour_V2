export interface IRiotMatchData {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[]; // PUUIDs
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