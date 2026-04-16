import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import routes from './routes/index';
import errorHandler from './middlewares/errorHandler';
import registerTournamentSocket from './sockets/tournament';
import registerNotificationSocket from './sockets/notifications';
import attachUser from './middlewares/attachUser';
// Redis/BullMQ cron jobs disabled — re-enable when Redis is available
// import './jobs/autoTournamentCron';
import './jobs/autoRoundAdvanceCron';
import { REDIS_ENABLED, lobbyTimerQueue } from './lib/queues';
import { initLobbyTimerQueue } from './services/LobbyTimerService';
import { prisma } from './services/prisma';
import logger from './utils/logger';
import path from 'path';

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
].filter(Boolean);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }
});

(global as any).io = io;

// Initialize LobbyTimerService queue in main process (needed for forceStart, toggleReady)
if (REDIS_ENABLED && lobbyTimerQueue) {
  initLobbyTimerQueue(lobbyTimerQueue);
  logger.info('LobbyTimerService queue initialized in main process.');

  // ── Inline BullMQ workers for dev (no separate worker process needed) ────
  const { Worker } = require('bullmq');
  const { redisConnectionOptions, autoAdvanceRoundQueue, fetchMatchDataQueue } = require('./lib/queues');
  const LobbyStateService = require('./services/LobbyStateService').default;
  const RoundService = require('./services/RoundService').default;

  // Lobby Timer Worker — drives all lobby phase transitions
  const lobbyTimerWorker = new Worker(
    'lobbyTimerQueue',
    async (job: any) => {
      const { lobbyId, targetState, fromState, jobType } = job.data;
      if (jobType === 'autoResolve') {
        logger.info(`LobbyTimerWorker: auto-resolving ADMIN_INTERVENTION for lobby ${lobbyId}`);
        await LobbyStateService.autoResolveIntervention(lobbyId);
      } else {
        logger.info(`LobbyTimerWorker: transitioning lobby ${lobbyId} ${fromState} → ${targetState}`);
        await LobbyStateService.transitionPhase(lobbyId, fromState, targetState);
      }
      // Emit updated state
      try {
        const snapshot = await LobbyStateService.getLobbyState(lobbyId).catch(() => null);
        if (snapshot) io.to(`lobby:${lobbyId}`).emit('lobby:state_update', snapshot);
      } catch (_) {}
    },
    { connection: redisConnectionOptions, concurrency: 20 }
  );
  lobbyTimerWorker.on('failed', (job: any, err: any) => logger.error(`LobbyTimerWorker failed: ${err.message}`));
  logger.info('LobbyTimerWorker started inline.');

  // Auto Advance Round Worker
  const autoAdvanceWorker = new Worker(
    'autoAdvanceRoundQueue',
    async (job: any) => {
      const { roundId } = job.data;
      logger.info(`AutoAdvanceRoundWorker: Processing round ${roundId}`);
      const result = await RoundService.autoAdvance(roundId);
      
      if (result && typeof result === 'object' && '_action' in result) {
        if (result._action === 'schedule_lobby_timers' && result.lobbyIds) {
          logger.info(`AutoAdvanceRoundWorker: Scheduling ready check timers for ${result.lobbyIds.length} lobbies with ${result.delayMs}ms delay`);
          const { LOBBY_STATE } = require('./constants/lobbyStates');
          const LobbyTimerService = require('./services/LobbyTimerService').default;
          
          for (const lobbyId of result.lobbyIds) {
            try {
              await LobbyTimerService.scheduleTransition(lobbyId, LOBBY_STATE.READY_CHECK, result.delayMs || 300_000);
            } catch (err) {
              logger.error(`Failed to schedule timer for lobby ${lobbyId}: ${err}`);
            }
          }
        }
      }
      return result;
    },
    { connection: redisConnectionOptions, concurrency: 5 }
  );
  autoAdvanceWorker.on('failed', (job: any, err: any) => logger.error(`AutoAdvanceRoundWorker failed: ${err.message}`));
  logger.info('AutoAdvanceRoundWorker started inline.');

  // Fetch Match Data Worker
  const { io: ClientIO } = require('socket.io-client');
  const ioClient = ClientIO(process.env.BACKEND_SERVICE_URL || `http://localhost:${process.env.PORT || 4000}`);
  const fetchMatchDataFn = require('./jobs/fetchMatchData').default;
  const matchDataWorker = new Worker(
    'fetchMatchDataQueue',
    async (job: any) => fetchMatchDataFn(job, ioClient),
    { connection: redisConnectionOptions, concurrency: 5 }
  );
  matchDataWorker.on('failed', (job: any, err: any) => logger.error(`MatchDataWorker failed: ${err.message}`));
  logger.info('MatchDataWorker started inline.');
}

registerTournamentSocket(io);
registerNotificationSocket(io);

// Listener for worker-emitted lobby updates
io.on('connection', (socket) => {
  socket.on('join_minitour', ({ lobbyId }) => {
    if (lobbyId) {
      socket.join(`minitour:${lobbyId}`);
      logger.info(`Client joined minitour room: minitour:${lobbyId}`);
    }
  });

  socket.on('worker_lobby_update', (data) => {
    const { tournamentId, lobbyId, type, matchResults, ...rest } = data;
    logger.info(`Received worker_lobby_update for tournament ${tournamentId}, lobby ${lobbyId}, type: ${type}.`);

    // Tournament room: lightweight signal only — clients refetch bracket via HTTP/SWR
    io.to(`tournament:${tournamentId}`).emit('tournament_update', {
      type: type || 'lobby_updated',
      lobbyId,
      roundId: rest.roundId,
      fetchedResult: rest.fetchedResult,
    });

    // Lobby room: lean match results (placement/points only, no matchData)
    if (lobbyId && matchResults) {
      io.to(`lobby:${lobbyId}`).emit('lobby:match_result', {
        lobbyId,
        matchResults,
        fetchedResult: rest.fetchedResult,
      });
    }

    // Notify player profile pages
    io.emit('player_profile_update', {});
  });

  socket.on('worker_mini_tour_lobby_update', (data) => {
    const { miniTourLobbyId, ...lobbyData } = data;
    logger.info(`Received worker_mini_tour_lobby_update for MiniTour ${miniTourLobbyId}. Re-emitting to clients.`);
    io.to(`minitour:${miniTourLobbyId}`).emit('minitour_lobby_update', lobbyData);
    // Also notify player profile pages for affected participants
    if (lobbyData.participants && Array.isArray(lobbyData.participants)) {
      for (const p of lobbyData.participants) {
        const userId = p.userId || p.id;
        if (userId) io.emit('player_profile_update', { userId });
      }
    }
  });

  socket.on('worker_emit_notification', (data) => {
    const { userId, payload } = data;
    if (userId && payload) {
      io.to(`user:${userId}`).emit('admin_notification', payload);
    }
  });
});

// Khởi tạo SummaryManagerService workers only if Redis is available
if (REDIS_ENABLED) {
  const SummaryManagerService = require('./services/SummaryManagerService').default;
  SummaryManagerService.initWorkers();
} else {
  console.warn('[app] Redis disabled — SummaryManagerService workers not started.');
}

// Make io accessible via request (simple approach)
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).io = io;
  next();
});

app.use(cookieParser());
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3000'],
  credentials: true,
}));
app.use('/api/webhooks/payments/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' })); // Re-enable JSON body parsing
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serve static files from the 'public' directory

// Attach user info to request if logged in (must be after cookieParser)
app.use(attachUser);

app.use('/api', routes);

// Global error handler (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📊 Summary workers initialized and ready to process data`);

  // Check for completed tournaments that might not have summaries
  try {
    const completedTournaments = await prisma.tournament.findMany({
      where: {
        status: 'completed'
      },
      include: {
        _count: {
          select: {
            participants: true
          }
        }
      }
    });

    // Find tournaments that are completed but might be missing summaries
    const tournamentsToCheck = await Promise.all(completedTournaments.map(async tournament => {
      const summaryCount = await prisma.userTournamentSummary.count({
        where: { tournamentId: tournament.id }
      });

      // If no summaries or fewer summaries than participants
      if (summaryCount === 0 || summaryCount < tournament._count.participants) {
        return tournament;
      }
      return null;
    }));

    // Filter out nulls
    const tournamentsNeedingSummaries = tournamentsToCheck.filter(t => t !== null);

    if (tournamentsNeedingSummaries.length > 0) {
      logger.info(`Found ${tournamentsNeedingSummaries.length} completed tournaments that need summary processing`);

      // Process each tournament in sequence
      for (const tournament of tournamentsNeedingSummaries) {
        logger.info(`Scheduling summary processing for tournament ${tournament?.id}`);
        if (tournament) {
          setTimeout(() => {
            const SummaryManagerService = require('./services/SummaryManagerService').default;
            SummaryManagerService.processCompletedTournamentDirectly(tournament.id)
              .catch((err: any) => logger.error(`Error processing tournament ${tournament.id} on startup: ${err}`));
          }, 5000); // Small delay to let the server fully start
        }
      }
    }
  } catch (error) {
    logger.error(`Error checking for tournaments needing summaries: ${error}`);
  }
}); 
