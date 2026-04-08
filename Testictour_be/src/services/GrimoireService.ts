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
}
