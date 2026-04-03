import { Worker } from 'bullmq';
import fetchMatchData from './jobs/fetchMatchData';
import fetchMiniTourMatchData from './jobs/fetchMiniTourMatchData';
import logger from './utils/logger';
import RoundService from './services/RoundService';
import { autoAdvanceRoundQueue, fetchMatchDataQueue, fetchMiniTourMatchDataQueue, syncCompletionQueue, redisConnectionOptions } from './lib/queues';
import './jobs/roundCompletionWorker'; // Import to initialize the worker
import SummaryManagerService from './services/SummaryManagerService';
import { io as ClientIO } from 'socket.io-client';

import syncCompletionProcessor from './jobs/syncCompletion';

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
    return RoundService.autoAdvance(roundId);
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
