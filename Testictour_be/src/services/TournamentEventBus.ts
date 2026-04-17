/**
 * TournamentEventBus — Centralized event-driven socket emission layer
 *
 * ALL socket emissions MUST go through this service.
 * No direct io.to().emit() anywhere else in the codebase.
 *
 * Design:
 *   - Events are typed with strict payload contracts
 *   - Emissions are queued DURING transactions, flushed AFTER commit
 *   - Separation: lobby-scoped vs tournament-scoped vs user-scoped
 *
 * Event Types:
 *   LOBBY_STATE_CHANGED     → lobby room only
 *   MATCH_RESULT_PROCESSED  → lobby room (data) + tournament room (signal)
 *   ROUND_COMPLETED         → tournament room (signal)
 *   TOURNAMENT_UPDATED      → tournament room (signal)
 *   PLAYER_PROFILE_UPDATED  → user room only
 *   LEADERBOARD_UPDATED     → tournament room (signal)
 */
import logger from '../utils/logger';

// ── Event type definitions ─────────────────────────────────────────────────────

export enum TournamentEvent {
  LOBBY_STATE_CHANGED = 'lobby:state_changed',
  MATCH_RESULT_PROCESSED = 'lobby:match_result',
  ROUND_COMPLETED = 'tournament:round_completed',
  TOURNAMENT_UPDATED = 'tournament_update',
  PLAYER_PROFILE_UPDATED = 'user:profile_updated',
  LEADERBOARD_UPDATED = 'leaderboard_update',
  BRACKET_UPDATED = 'bracket_update',
}

// ── Payload contracts ──────────────────────────────────────────────────────────

export interface LobbyStatePayload {
  lobbyId: string;
  fromState: string;
  toState: string;
  timestamp: string;
}

export interface MatchResultPayload {
  lobbyId: string;
  matchId: string;
  results: Array<{
    userId: string;
    placement: number;
    points: number;
  }>;
  matchNumber: number;  // e.g. "2 of 3"
  totalMatches: number;
  isLastMatch: boolean;
}

export interface RoundCompletedPayload {
  tournamentId: string;
  roundId: string;
  roundNumber: number;
  phaseName: string;
  advancedCount: number;
  eliminatedCount: number;
}

export interface TournamentUpdatedPayload {
  tournamentId: string;
  type: 'status_changed' | 'lobby_eliminated' | 'phase_advanced' | 'tournament_completed';
  detail?: string;
}

export interface LeaderboardUpdatedPayload {
  tournamentId: string;
  roundId: string;
  affectedUserIds: string[];
}

// ── Pending emission (for transactional batching) ──────────────────────────────

export interface PendingEmission {
  room: string;
  event: string;
  data: any;
}

// ── EventBus implementation ────────────────────────────────────────────────────

function getIO(): any {
  return (global as any).__io || (global as any).io || null;
}

export default class TournamentEventBus {

  // ── Immediate emissions (use AFTER DB commit) ──

  /**
   * Emit lobby state change to lobby room + tournament signal.
   */
  static emitLobbyStateChanged(
    lobbyId: string,
    tournamentId: string | undefined,
    payload: LobbyStatePayload,
  ): void {
    const io = getIO();
    if (!io) return;

    // Lobby room: full payload
    io.to(`lobby:${lobbyId}`).emit(TournamentEvent.LOBBY_STATE_CHANGED, payload);

    // Tournament room: signal only (clients refetch via SWR)
    if (tournamentId) {
      io.to(`tournament:${tournamentId}`).emit(TournamentEvent.TOURNAMENT_UPDATED, {
        tournamentId,
        type: 'status_changed' as const,
        detail: `lobby:${payload.toState}`,
      });
    }

    logger.debug(`[EventBus] LOBBY_STATE_CHANGED → lobby:${lobbyId} (${payload.fromState}→${payload.toState})`);
  }

  /**
   * Emit match results to lobby room + leaderboard signal to tournament.
   */
  static emitMatchResult(
    lobbyId: string,
    tournamentId: string,
    payload: MatchResultPayload,
  ): void {
    const io = getIO();
    if (!io) return;

    // Lobby room: structured match result (placements, points — NO raw matchData)
    io.to(`lobby:${lobbyId}`).emit(TournamentEvent.MATCH_RESULT_PROCESSED, payload);

    // Tournament room: leaderboard signal only
    io.to(`tournament:${tournamentId}`).emit(TournamentEvent.LEADERBOARD_UPDATED, {
      tournamentId,
      roundId: '',
      affectedUserIds: payload.results.map(r => r.userId),
    });

    // Player rooms: targeted profile update (NOT broadcast)
    for (const r of payload.results) {
      io.to(`user:${r.userId}`).emit(TournamentEvent.PLAYER_PROFILE_UPDATED, {
        userId: r.userId,
        reason: 'match_completed',
      });
    }

    logger.debug(`[EventBus] MATCH_RESULT → lobby:${lobbyId} (${payload.results.length} players)`);
  }

  /**
   * Emit round completion to tournament room.
   */
  static emitRoundCompleted(payload: RoundCompletedPayload): void {
    const io = getIO();
    if (!io) return;

    io.to(`tournament:${payload.tournamentId}`).emit(TournamentEvent.ROUND_COMPLETED, payload);
    io.to(`tournament:${payload.tournamentId}`).emit(TournamentEvent.BRACKET_UPDATED, {
      tournamentId: payload.tournamentId,
    });

    logger.debug(`[EventBus] ROUND_COMPLETED → tournament:${payload.tournamentId} (R${payload.roundNumber})`);
  }

  /**
   * Emit tournament-level update (phase change, completion, etc).
   */
  static emitTournamentUpdated(payload: TournamentUpdatedPayload): void {
    const io = getIO();
    if (!io) return;

    io.to(`tournament:${payload.tournamentId}`).emit(TournamentEvent.TOURNAMENT_UPDATED, payload);
    io.to(`tournament:${payload.tournamentId}`).emit(TournamentEvent.BRACKET_UPDATED, {
      tournamentId: payload.tournamentId,
    });

    logger.debug(`[EventBus] TOURNAMENT_UPDATED → tournament:${payload.tournamentId} (${payload.type})`);
  }

  /**
   * Emit bracket invalidation signal.
   */
  static emitBracketUpdated(tournamentId: string): void {
    const io = getIO();
    if (!io) return;

    io.to(`tournament:${tournamentId}`).emit(TournamentEvent.BRACKET_UPDATED, { tournamentId });
  }

  // ── Transactional batching ──

  /**
   * Create a transaction-safe emission collector.
   * Usage:
   *   const emitter = TournamentEventBus.createTransactionalEmitter();
   *   // inside transaction:
   *   emitter.queue('tournament:xyz', 'tournament:updated', { ... });
   *   // after commit:
   *   emitter.flush();
   */
  static createTransactionalEmitter(): TransactionalEmitter {
    return new TransactionalEmitter();
  }
}

export class TransactionalEmitter {
  private pending: PendingEmission[] = [];

  /** Queue an emission to be sent after transaction commit */
  queue(room: string, event: string, data: any): void {
    this.pending.push({ room, event, data });
  }

  /** Queue a typed tournament update */
  queueTournamentUpdate(tournamentId: string, payload: TournamentUpdatedPayload): void {
    this.pending.push({
      room: `tournament:${tournamentId}`,
      event: TournamentEvent.TOURNAMENT_UPDATED,
      data: payload,
    });
    this.pending.push({
      room: `tournament:${tournamentId}`,
      event: TournamentEvent.BRACKET_UPDATED,
      data: { tournamentId },
    });
  }

  /** Queue a leaderboard update signal */
  queueLeaderboardUpdate(tournamentId: string, roundId: string, affectedUserIds: string[]): void {
    this.pending.push({
      room: `tournament:${tournamentId}`,
      event: TournamentEvent.LEADERBOARD_UPDATED,
      data: { tournamentId, roundId, affectedUserIds },
    });
  }

  /** Flush all queued emissions after transaction commit */
  flush(): void {
    const io = getIO();
    if (!io || this.pending.length === 0) return;

    for (const emission of this.pending) {
      io.to(emission.room).emit(emission.event, emission.data);
    }

    logger.debug(`[EventBus] Flushed ${this.pending.length} transactional emissions`);
    this.pending = [];
  }

  /** Discard all pending emissions (on transaction rollback) */
  discard(): void {
    const count = this.pending.length;
    this.pending = [];
    if (count > 0) {
      logger.debug(`[EventBus] Discarded ${count} emissions (transaction rollback)`);
    }
  }

  /** Get current queue length */
  get size(): number {
    return this.pending.length;
  }
}
