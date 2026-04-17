/**
 * ConsistencyPipeline — Enforces DB → Redis → Socket ordering
 *
 * THE critical piece for data consistency under burst load.
 *
 * Flow:
 *   1. DB write (in Prisma transaction)
 *   2. Redis update (AFTER transaction commits)
 *   3. Socket emit (AFTER Redis confirms)
 *
 * If Redis fails → socket still emits (clients refetch from DB)
 * If Socket fails → data is still consistent in DB + Redis
 *
 * Usage:
 *   await ConsistencyPipeline.onMatchProcessed({
 *     roundId, tournamentId, matchId, lobbyId,
 *     results: [{ userId, points, placement }],
 *   });
 */
import LeaderboardService from './LeaderboardService';
import TournamentEventBus, { MatchResultPayload } from './TournamentEventBus';
import { bracketCache } from './BracketCacheService';
import { tournamentCache } from './TournamentCacheService';
import logger from '../utils/logger';

export interface MatchProcessedData {
  roundId: string;
  tournamentId: string;
  matchId: string;
  lobbyId: string;
  results: Array<{ userId: string; points: number; placement: number }>;
  matchNumber: number;
  totalMatches: number;
  isLastMatch: boolean;
}

export interface RoundCompletedData {
  tournamentId: string;
  roundId: string;
  roundNumber: number;
  phaseName: string;
  advancedCount: number;
  eliminatedCount: number;
}

export interface TournamentStateChangedData {
  tournamentId: string;
  type: 'status_changed' | 'lobby_eliminated' | 'phase_advanced' | 'tournament_completed';
  detail?: string;
}

export default class ConsistencyPipeline {

  /**
   * Full pipeline after a match result is committed to DB.
   * Call this OUTSIDE the Prisma transaction, after $transaction() returns.
   *
   * Step 1: Update Redis ZSET leaderboard (incremental)
   * Step 2: Invalidate stale caches
   * Step 3: Emit typed socket events
   */
  static async onMatchProcessed(data: MatchProcessedData): Promise<void> {
    const { roundId, tournamentId, matchId, lobbyId, results, matchNumber, totalMatches, isLastMatch } = data;

    // STEP 1: Redis ZSET — incremental score update
    try {
      await LeaderboardService.batchIncrScores(roundId, tournamentId, results);
    } catch (err) {
      // Non-fatal: leaderboard will be stale until next refresh
      logger.warn(`[Pipeline] Redis leaderboard update failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // STEP 2: Cache invalidation
    try {
      await Promise.all([
        bracketCache.invalidate(tournamentId),
        tournamentCache.invalidateScoreboard(roundId),
      ]);
    } catch (err) {
      logger.warn(`[Pipeline] Cache invalidation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // STEP 3: Socket emission
    try {
      const payload: MatchResultPayload = {
        lobbyId,
        matchId,
        results: results.map(r => ({
          userId: r.userId,
          placement: r.placement,
          points: r.points,
        })),
        matchNumber,
        totalMatches,
        isLastMatch,
      };

      TournamentEventBus.emitMatchResult(lobbyId, tournamentId, payload);
    } catch (err) {
      logger.warn(`[Pipeline] Socket emission failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    logger.debug(`[Pipeline] onMatchProcessed complete: match=${matchId}, lobby=${lobbyId}`);
  }

  /**
   * Pipeline after a round completes.
   * Called AFTER the autoAdvance transaction commits.
   */
  static async onRoundCompleted(data: RoundCompletedData): Promise<void> {
    const { tournamentId, roundId } = data;

    // STEP 1: Persist ZSET standings to DB as final snapshot
    try {
      await LeaderboardService.persistRoundStandings(roundId, tournamentId);
    } catch (err) {
      logger.warn(`[Pipeline] persistRoundStandings failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // STEP 2: Invalidate caches
    try {
      await Promise.all([
        bracketCache.invalidate(tournamentId),
        tournamentCache.invalidateScoreboard(roundId),
        LeaderboardService.invalidateRound(roundId),
      ]);
    } catch (err) {
      logger.warn(`[Pipeline] Cache invalidation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // STEP 3: Emit typed event
    try {
      TournamentEventBus.emitRoundCompleted(data);
    } catch (err) {
      logger.warn(`[Pipeline] Socket emission failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    logger.info(`[Pipeline] onRoundCompleted: round=${roundId}`);
  }

  /**
   * Pipeline after any tournament-level state change.
   */
  static async onTournamentStateChanged(data: TournamentStateChangedData): Promise<void> {
    const { tournamentId } = data;

    // STEP 1: Invalidate caches
    try {
      await bracketCache.invalidate(tournamentId);
    } catch (err) {
      logger.warn(`[Pipeline] Cache invalidation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // STEP 2: Emit typed event
    try {
      TournamentEventBus.emitTournamentUpdated(data);
    } catch (err) {
      logger.warn(`[Pipeline] Socket emission failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    logger.debug(`[Pipeline] onTournamentStateChanged: ${data.type}`);
  }

  /**
   * Pipeline after lobby state transition.
   */
  static async onLobbyStateChanged(
    lobbyId: string,
    tournamentId: string | undefined,
    fromState: string,
    toState: string,
  ): Promise<void> {
    // STEP 1: Invalidate bracket cache
    if (tournamentId) {
      try {
        await bracketCache.invalidate(tournamentId);
      } catch { /* non-fatal */ }
    }

    // STEP 2: Emit typed event
    try {
      TournamentEventBus.emitLobbyStateChanged(lobbyId, tournamentId, {
        lobbyId,
        fromState,
        toState,
        timestamp: new Date().toISOString(),
      });
    } catch { /* non-fatal */ }
  }
}
