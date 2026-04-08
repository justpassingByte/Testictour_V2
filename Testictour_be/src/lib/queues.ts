import { Queue, Worker, FlowProducer } from 'bullmq';
import { URL } from 'url';

const REDIS_ENABLED = !!process.env.REDIS_URL;

const getRedisConnectionOptions = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const parsedUrl = new URL(redisUrl);
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : 6379;
    return {
      host: parsedUrl.hostname,
      port: port,
      password: parsedUrl.password || undefined,
      username: parsedUrl.username || undefined,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
      db: parsedUrl.pathname ? parseInt(parsedUrl.pathname.substring(1)) : 0,
      family: 0,
      maxRetriesPerRequest: null,
    };
  } catch (error) {
    console.error(`[queues.ts] Failed to parse REDIS_URL`, error);
    return { host: 'localhost', port: 6379, password: undefined, username: undefined, maxRetriesPerRequest: null };
  }
};

const redisConnectionOptions = getRedisConnectionOptions();

// Only create queues if REDIS_URL is explicitly set in .env
let autoTournamentQueue: Queue = null as any;
let autoAdvanceRoundQueue: Queue = null as any;
let fetchMatchDataQueue: Queue = null as any;
let fetchMiniTourMatchDataQueue: Queue = null as any;
let checkRoundCompletionQueue: Queue = null as any;
let syncCompletionQueue: Queue = null as any;
let flowProducer: FlowProducer = null as any;
let lobbyTimerQueue: Queue = null as any;

if (REDIS_ENABLED) {
  console.log('[queues.ts] REDIS_URL set — creating queues.');
  autoTournamentQueue = new Queue('autoTournamentQueue', { connection: redisConnectionOptions });
  autoAdvanceRoundQueue = new Queue('autoAdvanceRoundQueue', { connection: redisConnectionOptions });
  fetchMatchDataQueue = new Queue('fetchMatchDataQueue', { connection: redisConnectionOptions });
  fetchMiniTourMatchDataQueue = new Queue('fetchMiniTourMatchDataQueue', { connection: redisConnectionOptions });
  checkRoundCompletionQueue = new Queue('checkRoundCompletionQueue', { connection: redisConnectionOptions });
  syncCompletionQueue = new Queue('syncCompletionQueue', { connection: redisConnectionOptions });
  flowProducer = new FlowProducer({ connection: redisConnectionOptions });
  lobbyTimerQueue = new Queue('lobbyTimerQueue', { connection: redisConnectionOptions });
} else {
  console.warn('[queues.ts] REDIS_URL not set — all queues disabled. Set REDIS_URL in .env to enable.');
}

export {
  autoTournamentQueue,
  autoAdvanceRoundQueue,
  fetchMatchDataQueue,
  fetchMiniTourMatchDataQueue,
  checkRoundCompletionQueue,
  syncCompletionQueue,
  flowProducer,
  redisConnectionOptions,
  REDIS_ENABLED,
  lobbyTimerQueue,
};
