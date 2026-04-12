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
// import './jobs/autoRoundAdvanceCron';
import { REDIS_ENABLED } from './lib/queues';
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
    const { tournamentId, lobbyId, ...lobbyData } = data;
    logger.info(`Received worker_lobby_update for tournament ${tournamentId}, lobby ${lobbyId}. Re-emitting to clients.`);
    io.to(`tournament:${tournamentId}`).emit('tournament_update', lobbyData);
    if (lobbyId) {
      io.to(`lobby:${lobbyId}`).emit('lobby:state_update', lobbyData);
    }
    // Also notify player profile pages — emit globally (filtered on frontend by userId)
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
app.use(express.json()); // Re-enable JSON body parsing
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
