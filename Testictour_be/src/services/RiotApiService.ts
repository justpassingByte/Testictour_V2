import axios from 'axios';
import ApiError from '../utils/ApiError';
import { prisma } from './prisma'; // Import prisma
import logger from '../utils/logger'; // Import logger
import { getRegionalRoutingValue, getPlatformIdentifier } from '../utils/RegionMapper'; // Import RegionMapper

// Add a flag to enable mocking - you can control this via an environment variable
const MOCK_RIOT_API = process.env.MOCK_RIOT_API === 'true';

// Rate limiting configuration
const RIOT_API_REQUEST_INTERVAL_MS = parseInt(process.env.RIOT_API_REQUEST_INTERVAL_MS || '1200', 10); // Default to 1.2 seconds
let lastRequestTime = 0;

// --- Mock Data Structure (will be dynamically populated) ---
const baseMockMatchData = {
  "metadata": {
    "dataVersion": "2",
    "matchId": "",
    "participants": [] // Will be populated dynamically
  },
  "info": {
    "gameCreation": 1678886400000,
    "gameDuration": 1800,
    "gameEndTimestamp": 1678888200000,
    "gameId": 1234567890,
    "gameMode": "STANDARD",
    "gameName": "mock-game",
    "gameStartTimestamp": 1678886400000,
    "gameType": "matched",
    "gameVersion": "13.5.1",
    "mapId": 11,
    "participants": [] // Will be populated dynamically with user PUUIDs and mock results
    ,
    "platformId": "NA1",
    "queueId": 1100,
    "tournamentCode": "",
    "teams": []
  }
};

export default class RiotApiService {
  private static RIOT_API_KEY = process.env.RIOT_API_KEY; // Your Riot API key

  private static async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RIOT_API_REQUEST_INTERVAL_MS) {
      const timeToWait = RIOT_API_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    lastRequestTime = Date.now();
  }

  static async fetchMatchIdsByPuuid(puuid: string, platformIdentifier: string, startTime?: number, endTime?: number, count: number = 3, start: number = 0) {
    if (MOCK_RIOT_API) {
      await new Promise(resolve => setTimeout(resolve, 200));
      // Return mock match IDs for testing
      return ["MOCK_MATCH_ID_1", "MOCK_MATCH_ID_2", "MOCK_MATCH_ID_3"];
    }

    if (!RiotApiService.RIOT_API_KEY) {
      throw new ApiError(500, 'Riot API key not configured');
    }

    let url = `https://${platformIdentifier}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${count}&start=${start}`;
    if (endTime) {
      url += `&endTime=${endTime}`;
    }
    if (startTime) {
      url += `&startTime=${startTime}`;
    }

    try {
      await RiotApiService.waitForRateLimit(); // Wait before making the request
      const response = await axios.get(url, { headers: { 'X-Riot-Token': RiotApiService.RIOT_API_KEY } });
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching match IDs from Riot API:', error.response ? error.response.data : error.message);
      throw new ApiError(error.response ? error.response.status : 500, 'Failed to fetch match IDs from Riot API');
    }
  }

  static async fetchMatchData(matchId: string, platformIdentifier: string, lobbyId: string | undefined, lobbyParticipants: any[] = []) {
    if (MOCK_RIOT_API) {
      // Simulate a delay for realism
      await new Promise(resolve => setTimeout(resolve, 500));

      const clonedMockData = JSON.parse(JSON.stringify(baseMockMatchData));
      clonedMockData.metadata.matchId = matchId;

      if (lobbyParticipants.length > 0) { // Use directly passed lobbyParticipants
        // --- RANDOMIZE RESULTS ---
        // Create a shuffled copy of participants to ensure random placements for each mock match
        const shuffledParticipants = [...lobbyParticipants].sort(() => Math.random() - 0.5);

        clonedMockData.metadata.participants = shuffledParticipants.map(p => p.userId);
        clonedMockData.info.participants = shuffledParticipants.map((p, index) => ({
          puuid: p.userId,
          placement: index + 1, // Assign placements 1st, 2nd, 3rd, ... based on shuffled order
          // Assign points based on placement for mock data
          points: RiotApiService.getMockPointsForPlacement(index + 1, shuffledParticipants.length)
        }));
      } else if (lobbyId) {
        // Fallback for when lobbyId is provided but no participants found (e.g., all eliminated)
        logger.warn(`MOCKING: No active participants passed for lobby ${lobbyId}. Returning empty match data for this lobby.`);
        clonedMockData.info.participants = [];
      } else {
        // Fallback to generic mock data if no lobbyId (original behavior, but less ideal)
        logger.warn(`MOCKING: No lobbyId provided or no participants passed. Using generic mock data.`);
        clonedMockData.info.participants = [
            { puuid: "MOCK_PUUID_1", placement: 1, points: 8 },
            { puuid: "MOCK_PUUID_2", placement: 2, points: 7 },
            { puuid: "MOCK_PUUID_3", placement: 3, points: 6 },
            { puuid: "MOCK_PUUID_4", placement: 4, points: 5 },
            { puuid: "MOCK_PUUID_5", placement: 5, points: 4 },
            { puuid: "MOCK_PUUID_6", placement: 6, points: 3 },
            { puuid: "MOCK_PUUID_7", placement: 7, points: 2 },
            { puuid: "MOCK_PUUID_8", placement: 8, points: 1 }
        ];
      }
      return clonedMockData;
    }

    if (!RiotApiService.RIOT_API_KEY) {
      throw new ApiError(500, 'Riot API key not configured');
    }
    const url = `https://${platformIdentifier}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
    try {
      await RiotApiService.waitForRateLimit(); // Wait before making the request
      const response = await axios.get(url, { headers: { 'X-Riot-Token': RiotApiService.RIOT_API_KEY } });
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching match data from Riot API:', error.response ? error.response.data : error.message);
      throw new ApiError(error.response ? error.response.status : 500, 'Failed to fetch match data from Riot API');
    }
  }

  private static getMockPointsForPlacement(placement: number, totalParticipants: number): number {
    // Ensure totalParticipants is at least 1
    if (totalParticipants < 1) return 0;
    // Cap placement to totalParticipants
    if (placement > totalParticipants) return 0;

    // Distribute points linearly from 100 down to 0 for the last place.
    // Example: For 8 participants, points could be: 8, 7, 6, 5, 4, 3, 2, 1
    const maxPoints = 8;
    const minPoints = 1; 
    
    // Calculate step size. If only 1 participant, step is 0.
    const step = totalParticipants > 1 ? (maxPoints - minPoints) / (totalParticipants - 1) : 0;

    // Calculate points: maxPoints - (placement - 1) * step
    // Ensure points are non-negative
    const points = Math.max(0, maxPoints - (placement - 1) * step);
    
    // Round to nearest integer
    return Math.round(points);
  }

  static async getSummonerPuuid(gameName: string, gameTag: string, regionalRoutingValue: string) {
    if (MOCK_RIOT_API) {
      // Simulate a delay for realism
      await new Promise(resolve => setTimeout(resolve, 200));
      // Return a consistent mock PUUID for testing
      return `MOCK_PUUID_${gameName.replace(/\s/g, '')}_${gameTag}`;
    }

    if (!RiotApiService.RIOT_API_KEY) {
      throw new ApiError(500, 'Riot API key not configured');
    }
    const cleanedGameTag = gameTag.startsWith('#') ? gameTag.substring(1) : gameTag; // Remove leading #
    const url = `https://${regionalRoutingValue}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${cleanedGameTag}`;
    try {
      await RiotApiService.waitForRateLimit(); // Wait before making the request
      const response = await axios.get(url, { headers: { 'X-Riot-Token': RiotApiService.RIOT_API_KEY } });
      return response.data.puuid;
    } catch (error: any) {
      logger.error('Error fetching summoner PUUID:', error.response ? error.response.data : error.message);
      throw new ApiError(error.response ? error.response.status : 500, 'Failed to fetch summoner PUUID');
    }
  }
} 