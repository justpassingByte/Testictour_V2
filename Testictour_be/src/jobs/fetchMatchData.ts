import { Job } from 'bullmq';
import MatchResultService from '../services/MatchResultService';
import GrimoireService from '../services/GrimoireService';
import LobbyStateService from '../services/LobbyStateService';
import { LOBBY_STATE } from '../constants/lobbyStates';
import logger from '../utils/logger';
import { prisma } from '../services/prisma';
import { Socket } from 'socket.io-client';
import { fetchMatchDataQueue } from '../lib/queues';

interface FetchMatchDataJobData {
  lobbyId: string;
  puuids?: string[];      // provided for context but fetched dynamically at runtime
  region: string;
  candidateMatchId?: string;
}

export default async function fetchMatchData(job: Job<FetchMatchDataJobData>, ioClient: Socket) {
  logger.info(`MatchDataWorker: Processing job ${job.id} of type ${job.name}`);
  const { lobbyId, region, candidateMatchId } = job.data;

  // 1. Fetch lobby + current state
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      round: {
        include: { phase: { include: { tournament: { select: { region: true } } } } }
      }
    }
  });

  if (!lobby) {
    logger.error(`MatchDataWorker: lobby ${lobbyId} not found`);
    return;
  }

  if (lobby.state !== LOBBY_STATE.PLAYING) {
    logger.warn(`MatchDataWorker: lobby ${lobbyId} is not in PLAYING state (state=${lobby.state}). Aborting poll.`);
    return;
  }

  // 2. Get CURRENT active participants (dynamically — accounts for post-assignment dropouts)
  const participantUserIds = lobby.participants as string[];
  const participants = await prisma.participant.findMany({
    where: { userId: { in: participantUserIds }, eliminated: false },
    include: { user: { select: { puuid: true } } },
  });
  const puuids = participants
    .map(p => p.user?.puuid)
    .filter((puuid): puuid is string => Boolean(puuid));

  if (puuids.length === 0) {
    logger.warn(`MatchDataWorker: lobby ${lobbyId} — no PUUIDs found for participants. Flagging for admin review.`);
    await LobbyStateService.flagForAdminReview(lobbyId, 'no_puuids');
    return;
  }

  // Detect fake/simulated PUUIDs (e.g. puuid_sim_*, puuid_tour_*, puuid_mt_*)
  // These are created by dev seed scripts and will never resolve on Riot API — abort immediately.
  const FAKE_PUUID_PATTERNS = ['puuid_sim_', 'puuid_tour_', 'puuid_mt_', 'puuid_ft_', '_sim_', '_tour_', '_mt_'];
  const allFake = puuids.every(p => FAKE_PUUID_PATTERNS.some(pat => p.includes(pat)));
  if (allFake) {
    logger.warn(`MatchDataWorker: lobby ${lobbyId} — all ${puuids.length} PUUIDs are simulated/fake. Skipping Riot API poll. Use Dev Tools → Simulate Match (Mock) instead.`);
    // Do NOT flag for admin review or transition — this lobby needs manual sim via dev tools.
    return;
  }

  // 3. Smart polling delay calculation based on elapsed since matchStartedAt
  //    matchStartedAt is set to now + 90s when lobby enters PLAYING (loading screen offset)
  const matchStartedAt = lobby.matchStartedAt ? new Date(lobby.matchStartedAt).getTime() : Date.now();
  const elapsedMin = (Date.now() - matchStartedAt) / 60_000;

  // 4. Check 50-min max polling timeout → flag for admin review
  if (elapsedMin > 50) {
    logger.warn(`MatchDataWorker: lobby ${lobbyId} exceeded 50-min polling limit. Flagging for admin review.`);
    await LobbyStateService.flagForAdminReview(lobbyId, 'match_timeout');
    return;
  }

  // 5. Determine effective region (from tournament if not in job data)
  const effectiveRegion = region
    || lobby.round.phase.tournament?.region
    || 'sea';

  // 6. Call Grimoire /validate — throws on Grimoire API errors (handled by BullMQ retry)
  let result: Awaited<ReturnType<typeof GrimoireService.validateMatch>>;
  try {
    result = await GrimoireService.validateMatch(
      puuids,
      Math.floor(matchStartedAt / 1000),  // epoch seconds
      effectiveRegion,
      candidateMatchId,
    );
  } catch (grimoireError: any) {
    const statusCode = grimoireError?.response?.status || grimoireError?.status;
    // 400 = Bad Request (invalid/fake PUUIDs, wrong region, etc.) — terminal, do NOT retry
    if (statusCode === 400) {
      logger.warn(`MatchDataWorker: lobby ${lobbyId} — Grimoire returned 400 (likely invalid/fake PUUIDs). Aborting without retry.`);
      await LobbyStateService.flagForAdminReview(lobbyId, 'grimoire_400_invalid_puuid');
      return;
    }
    // 5xx / network errors → throw → BullMQ retries with exponential backoff
    logger.warn(`MatchDataWorker: Grimoire API error for lobby ${lobbyId}: ${grimoireError.message}`);
    throw grimoireError;
  }

  if (result.status === 'pending') {
    // No valid match found yet — re-queue with smart polling delay
    let retryDelay = 15_000; // Poll every 15s after 20 mins

    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && elapsedMin < 20) {
      // Wait until 20 minutes mark
      retryDelay = (20 - elapsedMin) * 60_000;
      logger.info(`MatchDataWorker: lobby ${lobbyId} — waiting 20 minutes before polling. Re-queuing in ${Math.round(retryDelay / 1000)}s`);
    } else {
      logger.info(`MatchDataWorker: lobby ${lobbyId} — no match yet. Re-queuing in 30s`);
    }

    await fetchMatchDataQueue.add('fetchMatchData', job.data, {
      delay: retryDelay,
      jobId: `fetch-${lobbyId}-${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: 100,
    });
    await prisma.lobby.update({ where: { id: lobbyId }, data: { lastPolledAt: new Date() } });
    return;
  }

  if (result.status === 'invalid') {
    // Match found but failed validation — log and keep polling
    logger.warn(`MatchDataWorker: lobby ${lobbyId} — match invalid: ${result.reason}. Re-polling in 10s.`);
    await fetchMatchDataQueue.add('fetchMatchData', job.data, {
      delay: 10_000,
      jobId: `fetch-invalid-${lobbyId}-${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: 100,
    });
    return;
  }

  // 7. status === 'valid' — create Match record NOW (not at lobby creation)
  const match = await prisma.match.create({
    data: {
      matchIdRiotApi: result.matchId!,
      lobbyId,
      fetchedAt: new Date(),
      matchData: result.enrichedMatch as any,
    },
  });

  logger.info(`MatchDataWorker: lobby ${lobbyId} — match ${result.matchId} validated and created (Match.id=${match.id})`);

  // 8. Process results via MatchResultService (awards points, emits events)
  await MatchResultService.processMatchResults(match.id, result.enrichedMatch as any, ioClient);

  // 8.5 Queue Match Summary to update Player Profiles immediately
  try {
    const SummaryManagerService = require('../services/SummaryManagerService').default;
    const { prisma } = require('../services/prisma');
    const finalResults = await prisma.matchResult.findMany({ where: { matchId: match.id } });
    if (finalResults.length > 0) {
      await SummaryManagerService.queueMatchSummary(match.id, finalResults);
      logger.info(`MatchDataWorker: queued match summary for match ${match.id}`);
    }
  } catch (err) {
    logger.error(`MatchDataWorker: Failed to queue match summary: ${err}`);
  }

  // 9. Transition lobby to FINISHED (only if fully done)
  // Re-fetch the fresh lobby to see if MatchResultService marked it as completely fetched
  const freshLobby = await prisma.lobby.findUnique({ where: { id: lobbyId }, select: { fetchedResult: true } });
  if (freshLobby?.fetchedResult) {
    await LobbyStateService.transitionPhase(lobbyId, LOBBY_STATE.PLAYING, LOBBY_STATE.FINISHED);
    logger.info(`MatchDataWorker: job ${job.id} completed — lobby ${lobbyId} fully done → FINISHED`);
  } else {
    logger.info(`MatchDataWorker: job ${job.id} completed — lobby ${lobbyId} needs more matches, staying in PLAYING state`);
  }
}

