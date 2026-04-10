import axios from 'axios';
import logger from '../utils/logger';
import ApiError from '../utils/ApiError';

const GRIMOIRE_API_URL = process.env.GRIMOIRE_API_URL || 'http://localhost:3001';

export interface GrimoireMatchParticipant {
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
  traits: {
    name: string;
    displayName: string;
    numUnits: number;
    style: number;
    tierCurrent: number;
    tierTotal: number;
    iconUrl: string;
  }[];
  units: {
    characterId: string;
    name: string;
    tier: number;
    rarity: number;
    cost: number;
    iconUrl: string;
    items: {
      id: string;
      name: string;
      iconUrl: string;
    }[];
  }[];
  augments: {
    id: string;
    name: string;
    iconUrl: string;
  }[];
}

export interface GrimoireMatchData {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  gameVersion: string;
  queueId: number;
  tftSetNumber: number;
  participants: GrimoireMatchParticipant[];
}

export default class GrimoireService {
  /**
   * Fetch the latest match for given PUUIDs via Grimoire's internal API.
   * Grimoire handles Riot API calls and enriches data with game asset icons.
   * 
   * @param puuids - 1-2 PUUIDs to poll for match IDs
   * @param region - Region identifier (default: 'sea')
   * @param startTime - Epoch seconds to start searching from
   * @param endTime - Epoch seconds to end searching at
   * @param allPuuids - All lobby participant PUUIDs (to validate correct match)
   * @returns Enriched match data or null if no match found
   */
  static async fetchLatestMatch(
    puuids: string[],
    region: string,
    startTime?: number,
    endTime?: number,
    allPuuids?: string[],
    matchId?: string
  ): Promise<{ match: GrimoireMatchData | null; matchIds?: string[]; message?: string }> {
    try {
      logger.info(`[GrimoireService] Calling Grimoire API to fetch latest match for ${puuids.length} PUUIDs`);

      const response = await axios.post(`${GRIMOIRE_API_URL}/api/internal/match/fetch-latest`, {
        puuids,
        region,
        startTime,
        endTime,
        count: 5,
        allPuuids,
        matchId,
      }, {
        timeout: 30000, // 30s timeout — Riot API calls take time
      });

      if (!response.data.success) {
        throw new ApiError(500, response.data.error || 'Grimoire API returned error');
      }

      return {
        match: response.data.match || null,
        matchIds: response.data.matchIds,
        message: response.data.message,
      };

    } catch (error: any) {
      if (error.isAxiosError) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        logger.error(`[GrimoireService] Grimoire API error (${status}): ${message}`);
        throw new ApiError(status, `Grimoire API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch a player's PUUID from Grimoire's internal API using their Riot ID.
   * 
   * @param gameName - Riot game name
   * @param tagLine - Riot tag line
   * @param region - Platform region (e.g., vn2, sg2) or continental region 
   * @returns PUUID string
   */
  static async fetchPuuid(gameName: string, tagLine: string, region: string): Promise<string> {
    try {
      logger.info(`[GrimoireService] Fetching PUUID for ${gameName}#${tagLine} from Grimoire API`);

      const response = await axios.post(`${GRIMOIRE_API_URL}/api/internal/summoner/puuid`, {
        gameName,
        tagLine,
        region,
      }, {
        timeout: 15000, 
      });

      if (!response.data.success || !response.data.puuid) {
        throw new ApiError(500, response.data.error || 'Grimoire API failed to return PUUID');
      }

      return response.data.puuid;

    } catch (error: any) {
      if (error.isAxiosError) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        logger.warn(`[GrimoireService] Failed to fetch PUUID (${status}): ${message}`);
        throw new ApiError(status, `Failed to fetch PUUID: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch raw Riot match data proxied through Grimoire's internal API.
   * This is used for backward compatibility with existing parsers (MatchResultService, etc).
   * 
   * @param matchId - Riot match ID
   * @param region - Platform region
   * @returns Raw Riot Match Data
   */
  static async fetchRawRiotMatch(matchId: string, region: string): Promise<any> {
    try {
      logger.info(`[GrimoireService] Fetching raw Riot match data for ${matchId} from Grimoire API`);

      const response = await axios.post(`${GRIMOIRE_API_URL}/api/internal/riot/match`, {
        matchId,
        region,
      }, {
        timeout: 15000, 
      });

      if (!response.data.success || !response.data.data) {
        throw new ApiError(500, response.data.error || 'Grimoire API failed to return raw match data');
      }

      return response.data.data;

    } catch (error: any) {
      if (error.isAxiosError) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        logger.warn(`[GrimoireService] Failed to fetch raw match (${status}): ${message}`);
        throw new ApiError(status, `Failed to fetch raw match: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Validate whether a TFT match belongs to a tournament lobby.
   * This is the single source of truth for match validation — all logic lives in Grimoire.
   *
   * @param puuids - CURRENT active lobby participants (not the hardcoded creation-time list)
   * @param lobbyStartTime - Epoch seconds when lobby entered PLAYING state
   * @param region - Platform region (e.g., 'vn2', 'sg2')
   * @param candidateMatchId - Optional: validate a specific Riot match ID
   */
  static async validateMatch(
    puuids: string[],
    lobbyStartTime: number,   // epoch seconds
    region: string,
    candidateMatchId?: string,
  ): Promise<{
    status: 'valid' | 'invalid' | 'pending';
    matchId?: string;
    reason?: string;
    placements?: { puuid: string; placement: number }[];
    enrichedMatch?: GrimoireMatchData;
  }> {
    try {
      logger.info(`[GrimoireService] Calling Grimoire /validate for ${puuids.length} PUUIDs, region=${region}, lobbyStartTime=${lobbyStartTime}`);

      const response = await axios.post(`${GRIMOIRE_API_URL}/api/internal/match/validate`, {
        puuids,
        lobbyStartTime,
        region,
        candidateMatchId,
      }, {
        timeout: 30000, // 30s — Riot API calls take time
      });

      return response.data;

  }

  /**
   * Fetch a specific match by its Riot match ID via Grimoire's enriched endpoint.
   * Used by seed-full-tournament to retrieve multiple matches in sequence.
   */
  static async fetchMatchById(matchId: string, region: string): Promise<GrimoireMatchData | null> {
    try {
      const response = await axios.post(`${GRIMOIRE_API_URL}/api/internal/match/fetch-latest`, {
        puuids: [],
        region,
        matchId,
        count: 1,
      }, { timeout: 30000 });

      if (!response.data.success) return null;
      return response.data.match || null;
    } catch (error: any) {
      logger.warn(`[GrimoireService] fetchMatchById failed for ${matchId}: ${error.message}`);
      return null;
    }
  }
}

