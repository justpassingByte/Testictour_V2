import { IRiotMatchData } from '../types/riot';
import api from '../lib/apiConfig';

export class RiotApiService {
  static async fetchMatchData(matchId: string, region: string, lobbyId?: string): Promise<IRiotMatchData> {
    try {
      const response = await api.get(`/riot/match/${matchId}`, {
        params: { region, lobbyId },
      });
      const matchData: IRiotMatchData = response.data;
      return matchData;
      } catch  {
      console.error('Error fetching match data:');
      throw new Error('Error fetching match data');
    }
  }

  static async getSummonerPuuid(gameName: string, gameTag: string, region: string): Promise<string> {
    try {
      const response = await api.get(`/riot/puuid/${gameName}/${gameTag}`, {
        params: { region },
      });
      const puuid: string = response.data;
      return puuid;
    } catch  {
      console.error('Error fetching summoner PUUID:');
      throw new Error('Error fetching summoner PUUID');
    }
  }
} 