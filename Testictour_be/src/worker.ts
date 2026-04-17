import { Worker } from 'bullmq';
import fetchMatchData from './jobs/fetchMatchData';
import fetchMiniTourMatchData from './jobs/fetchMiniTourMatchData';
import logger from './utils/logger';
import RoundService from './services/RoundService';
import { autoAdvanceRoundQueue, fetchMatchDataQueue, fetchMiniTourMatchDataQueue, syncCompletionQueue, lobbyTimerQueue, redisConnectionOptions, REDIS_ENABLED } from './lib/queues';
import './jobs/roundCompletionWorker'; // Import to initialize the worker
import SummaryManagerService from './services/SummaryManagerService';
import { io as ClientIO } from 'socket.io-client';
import syncCompletionProcessor from './jobs/syncCompletion';
import LobbyStateService from './services/LobbyStateService';
import { initLobbyTimerQueue } from './services/LobbyTimerService';
import { recoverStaleLobbyTimers } from './jobs/recoverLobbyTimers';

// Log the environment variables at startup for debugging
console.log("--- Worker Environment Variables ---");
console.log("REDIS_URL:", process.env.REDIS_URL);
console.log("BACKEND_SERVICE_URL:", process.env.BACKEND_SERVICE_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("------------------------------------");

// Initialize the summary workers for tournament and match summaries
SummaryManagerService.initWorkers();
logger.info('SummaryManagerService workers initialized');

// Wire lobbyTimerQueue into LobbyTimerService
if (lobbyTimerQueue) {
  initLobbyTimerQueue(lobbyTimerQueue);
  logger.info('LobbyTimerService: queue initialized');
}

// Initialize Socket.IO client for the worker, connecting to the main backend service
// The URL should be provided via an environment variable in Railway
const backendServiceUrl = process.env.BACKEND_SERVICE_URL || `http://localhost:${process.env.PORT || 4000}`;
const ioClient = ClientIO(backendServiceUrl);

ioClient.on('connect', () => {
  logger.info('Socket.IO client connected in worker.');
});

ioClient.on('disconnect', () => {
  logger.warn('Socket.IO client disconnected in worker.');
});

ioClient.on('connect_error', (err) => {
  logger.error(`Socket.IO client connection error in worker: ${err.message}`);
});

// Worker for fetching match data
const matchDataWorker = new Worker(
  'fetchMatchDataQueue',
  async job => {
    logger.info(`MatchDataWorker: Processing job ${job.id} of type ${job.name}`);
    return fetchMatchData(job, ioClient);
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

matchDataWorker.on('failed', (job, err) => {
  logger.error(`MatchDataWorker: Job ${job?.id} failed with error: ${err.message}`, err);
});

logger.info('MatchDataWorker started. Waiting for jobs...');

// Worker for fetching MiniTour match data
const miniTourMatchDataWorker = new Worker(
  'fetchMiniTourMatchDataQueue',
  async job => {
    logger.info(`MiniTourMatchDataWorker: Processing job ${job.id} of type ${job.name}`);
    return fetchMiniTourMatchData(job, ioClient);
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

miniTourMatchDataWorker.on('failed', (job, err) => {
  logger.error(`MiniTourMatchDataWorker: Job ${job?.id} failed with error: ${err.message}`, err);
});
logger.info('MiniTourMatchDataWorker started. Waiting for jobs...');

// Worker for advancing rounds
const autoAdvanceRoundWorker = new Worker(
  'autoAdvanceRoundQueue',
  async job => {
    const { roundId } = job.data;
    logger.info(`AutoAdvanceRoundWorker: Processing job for round ${roundId}`);
    const result = await RoundService.autoAdvance(roundId);

    // Process deferred post-commit actions
    if (result && typeof result === 'object' && '_action' in result) {
      if (result._action === 'payout_prizes' && result.tournamentId) {
        logger.info(`AutoAdvanceRoundWorker: Handling deferred payout_prizes for tournament: ${result.tournamentId}`);
        try {
          const { prisma } = await import('./services/prisma');
          
          await prisma.$transaction(async (tx) => {
            // First ensure all lobbies and rounds and roundOutcomes are closed properly
            await (RoundService as any)._ensureAllResourcesCompleted(tx, result.tournamentId);
            // Then execute the automated payout process
            await RoundService.payoutPrizes(tx, result.tournamentId);
          });
          logger.info(`AutoAdvanceRoundWorker: Successfully paid out prizes and finalized tournament ${result.tournamentId}.`);
          
          if (ioClient) {
            ioClient.emit('worker_tournament_update', {
              tournamentId: result.tournamentId,
              type: 'tournament_completed'
            });
          }
        } catch (err) {
          logger.error(`Failed to distribute prizes for completed tournament ${result.tournamentId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (result._action === 'create_next_phase_rounds' && result.completedPhaseId && result.nextPhaseId) {
        logger.info(`AutoAdvanceRoundWorker: Handling deferred round creation for phase: ${result.nextPhaseId}`);
        const { prisma } = await import('./services/prisma');

        // ── Dynamically calculate required groups based on surviving participants ──
        const nextPhaseData = await prisma.phase.findUnique({ where: { id: result.nextPhaseId } });
        const survivingCount = await prisma.participant.count({
          where: { tournamentId: result.tournamentId, eliminated: false }
        });
        const lobbySize = nextPhaseData?.lobbySize || 8;
        const maxLobbiesPerGroup = 4;
        const maxPlayersPerGroup = lobbySize * maxLobbiesPerGroup;
        const numberOfRounds = Math.max(1, Math.ceil(survivingCount / maxPlayersPerGroup));

        logger.info(`AutoAdvanceRoundWorker: ${survivingCount} survivors → ${numberOfRounds} groups (max ${maxPlayersPerGroup}/group)`);

        // Update phase to reflect actual number of rounds
        await prisma.phase.update({
          where: { id: result.nextPhaseId },
          data: { numberOfRounds }
        });
        
        try {
          const newRounds = [];
          for (let i = 1; i <= numberOfRounds; i++) {
            const newRound = await prisma.round.create({
              data: {
                phaseId: result.nextPhaseId,
                roundNumber: i,
                startTime: new Date(Date.now() + 5 * 60 * 1000),
                status: 'pending'
              }
            });
            newRounds.push(newRound);
          }
          logger.info(`Successfully created ${newRounds.length} rounds for phase ${result.nextPhaseId}`);
          
          if (ioClient && result.tournamentId) {
            const { bracketCache } = await import('./services/BracketCacheService');
            await bracketCache.invalidate(result.tournamentId);
            ioClient.emit('worker_tournament_update', {
              tournamentId: result.tournamentId,
              type: 'phase_started'
            });
          }
        } catch (err) {
          logger.error(`Failed to create rounds for phase ${result.nextPhaseId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (result._action === 'schedule_lobby_timers' && result.lobbyIds) {
        logger.info(`AutoAdvanceRoundWorker: Scheduling ready check timers for ${result.lobbyIds.length} lobbies with ${result.delayMs}ms delay`);
        const LobbyTimerService = (await import('./services/LobbyTimerService')).default;
        const { LOBBY_STATE } = await import('./constants/lobbyStates');
        
        for (const lobbyId of result.lobbyIds) {
          try {
            await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.READY_CHECK, result.delayMs || 300_000);
          } catch (err) {
            logger.error(`Failed to schedule timer for lobby ${lobbyId}: ${err}`);
          }
        }

        // ═══ Bug #2/#3 Fix: Emit socket events so frontend updates after reshuffle ═══
        if (ioClient && result.tournamentId) {
          try {
            const { bracketCache } = await import('./services/BracketCacheService');
            await bracketCache.invalidate(result.tournamentId);
            ioClient.emit('worker_tournament_update', {
              tournamentId: result.tournamentId,
              type: 'lobbies_reshuffled',
              matchNumber: result.matchNumber,
              matchesPerRound: result.matchesPerRound,
            });
            logger.info(`AutoAdvanceRoundWorker: Emitted bracket/tournament update for reshuffle (tournament ${result.tournamentId})`);
          } catch (emitErr) {
            logger.warn(`AutoAdvanceRoundWorker: Failed to emit socket events (non-fatal): ${emitErr}`);
          }
        }
      }
    }

    return result;
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

autoAdvanceRoundWorker.on('completed', (job, result) => {
  logger.info(`AutoAdvanceRoundWorker: Job ${job.id} completed successfully. Result: ${JSON.stringify(result)}`);
});

autoAdvanceRoundWorker.on('failed', (job, err) => {
  logger.error(`AutoAdvanceRoundWorker: Job ${job?.id} for round ${job?.data.roundId} failed with error: ${err.message}`, err);
});

logger.info('AutoAdvanceRoundWorker started. Waiting for jobs...');

if (REDIS_ENABLED) {
  // Worker for sync completion
  const syncCompletionWorker = new Worker(
    syncCompletionQueue.name,
    syncCompletionProcessor,
    {
      connection: redisConnectionOptions,
      concurrency: 5,
    }
  );

  syncCompletionWorker.on('completed', (job) => {
    logger.info(`SyncCompletionWorker: Job ${job.id} for tournament ${job.data.tournamentId} completed successfully.`);
  });

  syncCompletionWorker.on('failed', (job, err) => {
    logger.error(`SyncCompletionWorker: Job ${job?.id} for tournament ${job?.data.tournamentId} failed: ${err.message}`);
  });

  logger.info('SyncCompletionWorker started. Waiting for jobs...');

  // ── Lobby Timer Worker ──────────────────────────────────────────────────────
  // Drives all lobby phase transitions dispatched by LobbyTimerService.

  const lobbyTimerWorker = new Worker(
    'lobbyTimerQueue',
    async job => {
      const { lobbyId, targetState, fromState, jobType } = job.data;

      if (jobType === 'autoResolve') {
        // Special path: ADMIN_INTERVENTION → create 8th-place results + FINISHED
        logger.info(`LobbyTimerWorker: auto-resolving ADMIN_INTERVENTION for lobby ${lobbyId}`);
        await LobbyStateService.autoResolveIntervention(lobbyId);

        // Emit updated state to lobby room
        try {
          const io = (global as any).__io;
          if (io) {
            const snapshot = await LobbyStateService.getLobbyState(lobbyId).catch(() => null);
            if (snapshot) io.to(`lobby:${lobbyId}`).emit('lobby:state_update', snapshot);
          }
        } catch (_) { /* non-critical */ }
      } else {
        // Standard phase transition
        logger.info(`LobbyTimerWorker: transitioning lobby ${lobbyId} ${fromState} → ${targetState}`);
        await LobbyStateService.transitionPhase(lobbyId, fromState, targetState);

        // Emit updated state to lobby room after transition
        try {
          const io = (global as any).io;
          if (io) {
            const snapshot = await LobbyStateService.getLobbyState(lobbyId).catch(() => null);
            if (snapshot) io.to(`lobby:${lobbyId}`).emit('lobby:state_update', snapshot);
          }
        } catch (_) { /* non-critical */ }
      }
    },
    { connection: redisConnectionOptions, concurrency: 20 }
  );

  lobbyTimerWorker.on('failed', (job, err) => {
    logger.error(`LobbyTimerWorker: Job ${job?.id} failed: ${err.message}`, err);
  });

  logger.info('LobbyTimerWorker started. Waiting for jobs...');


  // ── On startup: recover stale lobby timers ─────────────────────────────────
  // If server restarted mid-game, reschedule any pending BullMQ transition jobs.
  recoverStaleLobbyTimers().catch(err => {
    logger.error('Failed to recover stale lobby timers on startup:', err);
  });
}
