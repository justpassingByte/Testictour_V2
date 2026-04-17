import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import LobbyService from './LobbyService';
import logger from '../utils/logger';
import { Prisma, Participant } from '@prisma/client';
import EscrowService from './EscrowService';
import { bracketCache } from './BracketCacheService';
import { tournamentCache } from './TournamentCacheService';
import LeaderboardService from './LeaderboardService';
import ConsistencyPipeline from './ConsistencyPipeline';
import TournamentEventBus from './TournamentEventBus';

import { autoAdvanceRoundQueue } from '../lib/queues';
import { fetchMatchDataQueue } from '../lib/queues';
import SummaryManagerService from './SummaryManagerService';
import PrizeCalculationService from './PrizeCalculationService';
import { calculatePlayerPosition } from '../utils/matchUtils';
import { fisherYatesShuffle } from '../utils/shuffle';
import crypto from 'crypto';

// Assume we have access to io (Socket.IO server) via global or injected
const io = (global as any).io;

// Service for handling tournament round logic
export default class RoundService {

  /** Convert roundNumber → Group letter: 1→A, 2→B, 3→C... */
  static groupNameFromNumber(roundNumber: number): string {
    return String.fromCharCode(64 + roundNumber); // 65='A'
  }

  static async list(phaseId: string) {
    return prisma.round.findMany({ where: { phaseId } });
  }

  static async detail(id: string) {
    return prisma.round.findUnique({ where: { id } });
  }

  static async create(phaseId: string, data: {
    roundNumber: number;
    startTime: Date;
    status?: string;
  }) {
    const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
    if (!phase) throw new ApiError(404, 'Phase not found for round creation');

    return prisma.round.create({
      data: {
        phaseId,
        roundNumber: data.roundNumber,
        startTime: data.startTime,
        status: data.status || 'pending',
      }
    });
  }

  /**
   * Pre-assign all participants into groups (rounds) and lobbies.
   * Called ~5 minutes before tournament starts.
   * Each Round in the first Phase is treated as a "Group" (Bảng A, B, C...).
   */
  static async preAssignGroups(tournamentId: string) {
    logger.info(`[PreAssign] Starting pre-assignment for tournament ${tournamentId}`);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: { orderBy: { roundNumber: 'asc' }, include: { lobbies: true } }
          }
        }
      }
    });

    if (!tournament) throw new ApiError(404, 'Tournament not found');

    const firstPhase = tournament.phases.find(p => p.phaseNumber === 1);
    if (!firstPhase) throw new ApiError(400, 'No first phase configured for tournament');

    // Check if already pre-assigned (lobbies exist)
    const hasLobbies = firstPhase.rounds.some(r => r.lobbies.length > 0);
    if (hasLobbies) {
      logger.info(`[PreAssign] Tournament ${tournamentId} already has lobbies assigned. Skipping.`);
      return { message: 'Already pre-assigned.' };
    }

    const participants = await prisma.participant.findMany({
      where: { tournamentId, eliminated: false },
    });

    if (participants.length === 0) {
      logger.warn(`[PreAssign] No participants for tournament ${tournamentId}`);
      return { message: 'No participants to assign.' };
    }

    const lobbySize = firstPhase.lobbySize || 8;
    const maxLobbiesPerGroup = 4;
    const maxPlayersPerGroup = lobbySize * maxLobbiesPerGroup;

    let requiredNumberOfGroups = Math.ceil(participants.length / maxPlayersPerGroup);
    if (requiredNumberOfGroups < 1) requiredNumberOfGroups = 1;

    // Ensure we have exactly requiredNumberOfGroups in firstPhase
    const existingRoundsCount = firstPhase.rounds.length;

    if (existingRoundsCount > requiredNumberOfGroups) {
      // Delete extra rounds
      const roundsToDelete = firstPhase.rounds.slice(requiredNumberOfGroups);
      await prisma.round.deleteMany({
        where: { id: { in: roundsToDelete.map(r => r.id) } }
      });
      firstPhase.rounds = firstPhase.rounds.slice(0, requiredNumberOfGroups);
    } else if (existingRoundsCount < requiredNumberOfGroups) {
      // Create missing rounds
      for (let i = existingRoundsCount + 1; i <= requiredNumberOfGroups; i++) {
        const newRound = await prisma.round.create({
          data: {
            phaseId: firstPhase.id,
            roundNumber: i,
            startTime: new Date(Date.now() + 6 * 60 * 1000), // Default start
            status: 'pending'
          },
          include: { lobbies: true }
        });
        firstPhase.rounds.push(newRound as any);
      }
    }

    // Update Phase to reflect actual numberOfRounds
    await prisma.phase.update({
      where: { id: firstPhase.id },
      data: { numberOfRounds: requiredNumberOfGroups }
    });

    // Use lobbyAssignment if explicitly set, otherwise infer from phase.type
    // (Swiss phases often have lobbyAssignment=null when created via UI)
    const lobbyAssignment = (firstPhase.lobbyAssignment || (['swiss', 'snake'].includes(firstPhase.type) ? firstPhase.type : 'random')) as 'random' | 'seeded' | 'swiss' | 'snake';

    // Shuffle participants first
    let shuffled = [...participants];
    if (lobbyAssignment === 'random') {
      shuffled = fisherYatesShuffle(shuffled);
    } else {
      shuffled.sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
    }

    // Distribute participants sequentially (fill group up to maxPlayersPerGroup, then move to next)
    const groups: typeof participants[] = Array.from({ length: requiredNumberOfGroups }, () => []);
    shuffled.forEach((p, i) => {
      const groupIndex = Math.floor(i / maxPlayersPerGroup);
      groups[groupIndex].push(p);
    });

    const lobbiesToCreate: any[] = [];
    // Collect all lobbies to create
    for (let groupIndex = 0; groupIndex < requiredNumberOfGroups; groupIndex++) {
      const round = firstPhase.rounds[groupIndex];
      if (!round) {
        logger.warn(`[PreAssign] Round for group ${groupIndex + 1} not found. Skipping.`);
        continue;
      }

      const groupParticipants = groups[groupIndex];
      const groupName = this.groupNameFromNumber(round.roundNumber);
      logger.info(`[PreAssign] Assigning Group ${groupName}: ${groupParticipants.length} players`);

      let lobbyCount = 1;
      for (let i = 0; i < groupParticipants.length; i += lobbySize) {
        const lobbyParticipants = groupParticipants.slice(i, i + lobbySize);
        lobbiesToCreate.push({
          roundId: round.id,
          name: `Lobby ${lobbyCount++}`,
          participants: lobbyParticipants.map(p => p.userId),
          state: 'WAITING',
          phaseStartedAt: new Date(),
        });
      }
    }

    // Atomic transaction to clear existing lobbies and insert new ones
    await prisma.$transaction(async (tx) => {
      // Acquire row-level lock on Phase to prevent concurrent preAssignGroups runs
      await tx.$executeRaw`SELECT 1 FROM "Phase" WHERE id = ${firstPhase.id} FOR UPDATE`;

      // Re-verify no lobbies exist after acquiring lock
      const currentPhase = await tx.phase.findUnique({
        where: { id: firstPhase.id },
        include: { rounds: { include: { _count: { select: { lobbies: true } } } } }
      });
      const hasLobbiesTx = currentPhase?.rounds.some(r => r._count.lobbies > 0);
      if (hasLobbiesTx) {
        logger.info(`[PreAssign] Race condition guarded: Tournament ${tournamentId} already assigned.`);
        return;
      }

      // Clear existing lobbies to prevent duplication if clicked multiple times
      await tx.lobby.deleteMany({
        where: { roundId: { in: firstPhase.rounds.map(r => r.id) } }
      });

      await tx.lobby.createMany({ data: lobbiesToCreate });
    });

    // Update tournament actualParticipantsCount
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { actualParticipantsCount: participants.length }
    });

    // Emit socket event
    if ((global as any).io) {
      await bracketCache.invalidate(tournamentId);
      (global as any).io.to(`tournament:${tournamentId}`).emit('bracket_update', { tournamentId });
      (global as any).io.to(`tournament:${tournamentId}`).emit('tournament_update', { type: 'bracket_assigned' });
    }

    logger.info(`[PreAssign] Successfully pre-assigned ${participants.length} players into ${requiredNumberOfGroups} groups for tournament ${tournamentId}`);
    return { message: `Pre-assigned ${participants.length} players into ${requiredNumberOfGroups} groups.` };
  }

  /**
   * Lightweight bracket summary: Phase → Group (Round) → Lobby → Players list.
   * Does NOT load match history or matchResults — those are fetched on-demand via getLobbyDetail().
   * This keeps the initial bracket load fast even for large tournaments.
   */
  static async getBracket(tournamentId: string) {
    // ── Cache layer ────────────────────────────────────────────────────────────
    const cached = await bracketCache.get(tournamentId);
    if (cached) return cached;

    // Use `any` cast: Prisma struggles to infer deeply nested mixed include+select types.
    // All fields accessed are validated at runtime; shape is stable.
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
              include: {
                lobbies: {
                  // Only load lobby state + completedMatchesCount — no matches/matchResults
                    select: {
                      id: true,
                      name: true,
                      state: true,
                      fetchedResult: true,
                      completedMatchesCount: true,
                      participants: true,
                      matchNumber: true,
                    }
                }
              }
            }
          }
        }
      }
    }) as any;

    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Collect all user IDs from all lobbies
    const allUserIds = new Set<string>();
    for (const phase of tournament.phases) {
      for (const round of phase.rounds) {
        for (const lobby of round.lobbies) {
          const participants = lobby.participants as string[];
          if (Array.isArray(participants)) {
            participants.forEach(id => allUserIds.add(id));
          }
        }
      }
    }

    // Batch fetch user data
    const users = allUserIds.size > 0
      ? await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, username: true, riotGameName: true, riotGameTag: true, rank: true }
      })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Build bracket response — lightweight: no match records loaded, use completedMatchesCount for slot status
    const phases = (tournament.phases as any[]).map((phase: any) => {
      let phaseGroups: any[] = [];
      const matchesPerRound = phase.matchesPerRound || 1;
      const isMultiMatch = matchesPerRound > 1;
      // 'points' type also uses multi-match display (multiple columns per match, same lobby each time)
      const isMultiMatchElimination = (phase.type === 'elimination' || phase.type === 'points') && isMultiMatch && phase.rounds.length > 1;

      if (isMultiMatchElimination) {
        // Elimination BO with multiple groups: show "Vòng 1, Vòng 2..." aggregating all groups
        for (let m = 0; m < matchesPerRound; m++) {
          const allLobbiesForMatch: any[] = [];
          for (const round of phase.rounds) {
            const groupLetter = this.groupNameFromNumber(round.roundNumber);
            for (const lobby of round.lobbies) {
              const completed = lobby.completedMatchesCount || 0;
              allLobbiesForMatch.push({
                id: `${lobby.id}_m${m}`,
                name: `[${groupLetter}] ${lobby.name}`,
                state: completed > m ? 'FINISHED' : completed === m ? (lobby.fetchedResult ? 'WAITING' : lobby.state) : 'WAITING',
                fetchedResult: completed > m,
                completedMatchesCount: completed,
                // Hide players for future matches in Swiss/MultiMatch rounds
                players: m > completed
                  ? []
                  : (lobby.participants as string[]).map(userId => userMap.get(userId) || { id: userId, username: 'Unknown' }),
                roundId: round.id,
              });
            }
          }
          const doneCount = allLobbiesForMatch.filter(l => l.state === 'FINISHED').length;
          const playingCount = allLobbiesForMatch.filter(l => l.state === 'PLAYING').length;
          phaseGroups.push({
            id: phase.rounds[0]?.id || phase.id,
            name: `Vòng ${m + 1}`,
            groupLetter: `Vòng ${m + 1}`,
            groupNumber: m + 1,
            status: allLobbiesForMatch.length > 0 && doneCount === allLobbiesForMatch.length ? 'completed'
              : playingCount > 0 || doneCount > 0 ? 'in_progress' : 'pending',
            startTime: phase.rounds[0]?.startTime,
            endTime: phase.rounds[0]?.endTime,
            lobbies: allLobbiesForMatch,
          });
        }
      } else {
        (phase.rounds as any[]).forEach((round: any) => {
          if (isMultiMatch && phase.rounds.length === 1) {
            const lobbyAssignment = (phase.lobbyAssignment || (['swiss', 'snake'].includes(phase.type) ? phase.type : 'random')) as string;
            const isSwissStyle = lobbyAssignment === 'swiss' || lobbyAssignment === 'seeded' || lobbyAssignment === 'snake';
            
            // Swiss/Points single-round multi-match: show "Trận 1, Trận 2..."
            for (let m = 0; m < matchesPerRound; m++) {
              if (isSwissStyle) {
                const matchLobbies = (round.lobbies as any[]).filter(l => l.matchNumber === m + 1);
                const templateLobbies = (round.lobbies as any[]).filter(l => l.matchNumber === 1);
                
                const allFetched = matchLobbies.length > 0 && matchLobbies.every(l => l.fetchedResult);
                const anyPlaying = matchLobbies.some(l => l.state === 'PLAYING' || l.state === 'FINISHED');
                
                phaseGroups.push({
                  id: `${round.id}_m${m}`,
                  name: `Trận ${m + 1}`,
                  groupLetter: `Trận ${m + 1}`,
                  groupNumber: m + 1,
                  status: allFetched ? 'completed' : (anyPlaying ? 'in_progress' : 'pending'),
                  startTime: round.startTime,
                  endTime: round.endTime,
                  lobbies: matchLobbies.length > 0 
                    ? matchLobbies.map((lobby: any) => ({
                        id: lobby.id,
                        name: lobby.name,
                        state: lobby.state,
                        fetchedResult: lobby.fetchedResult,
                        completedMatchesCount: m,
                        roundId: round.id,
                        players: (lobby.participants as string[]).map(userId => userMap.get(userId) || { id: userId, username: 'Unknown' })
                      }))
                    : templateLobbies.map((lobby: any) => ({
                        id: `${lobby.id}_m${m}`,
                        name: lobby.name,
                        state: 'WAITING',
                        fetchedResult: false,
                        completedMatchesCount: m,
                        roundId: round.id,
                        players: [] // Future matches have no players until reshuffle
                      }))
                });
              } else {
                const firstCompleted = round.lobbies[0]?.completedMatchesCount || 0;
                phaseGroups.push({
                  id: round.id,
                  name: `Trận ${m + 1}`,
                  groupLetter: `Trận ${m + 1}`,
                  groupNumber: m + 1,
                  status: firstCompleted > m ? 'completed' : firstCompleted === m ? 'in_progress' : 'pending',
                  startTime: round.startTime,
                  endTime: round.endTime,
                  lobbies: (round.lobbies as any[]).map((lobby: any) => {
                    const completed = lobby.completedMatchesCount || 0;
                    return {
                      id: `${lobby.id}_m${m}`,
                      name: lobby.name,
                      state: completed > m ? 'FINISHED' : completed === m ? (lobby.fetchedResult ? 'WAITING' : lobby.state) : 'WAITING',
                      fetchedResult: completed > m,
                      completedMatchesCount: completed,
                      roundId: round.id,
                      // Hide players for future matches in Swiss/MultiMatch rounds
                      players: m > completed
                        ? []
                        : (lobby.participants as string[]).map(userId => userMap.get(userId) || { id: userId, username: 'Unknown' }),
                    };
                  }),
                });
              }
            }
          } else {
            // Standard single-match: each round = one Group (A, B, C...)
            phaseGroups.push({
              id: round.id,
              name: `Group ${this.groupNameFromNumber(round.roundNumber)}`,
              groupLetter: this.groupNameFromNumber(round.roundNumber),
              groupNumber: round.roundNumber,
              status: round.status,
              startTime: round.startTime,
              endTime: round.endTime,
              lobbies: (round.lobbies as any[]).map((lobby: any) => ({
                id: lobby.id,
                name: lobby.name,
                state: lobby.state,
                fetchedResult: lobby.fetchedResult,
                completedMatchesCount: lobby.completedMatchesCount || 0,
                players: (lobby.participants as string[]).map(userId => userMap.get(userId) || { id: userId, username: 'Unknown' })
              }))
            });
          }
        });
      }

      return {
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phaseNumber,
        status: phase.status,
        type: phase.type,
        matchesPerRound,
        groups: phaseGroups
      };
    });

    const result = { tournamentId, phases };
    // Cache the computed bracket
    await bracketCache.set(tournamentId, result);
    return result;
  }

  /**
   * Lazy-load detail for a specific lobby — called when user clicks into a lobby card.
   * Returns players with scores, match history, and per-match results.
   * This is the "expensive" data that was previously loaded upfront in getBracket.
   * Frontend calls: GET /api/lobbies/:id/detail
   */
  static async getLobbyDetail(lobbyId: string) {
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        round: {
          include: {
            phase: {
              select: { id: true, name: true, type: true, phaseNumber: true, matchesPerRound: true, pointsMapping: true, tournamentId: true }
            }
          }
        },
        matches: {
          orderBy: { createdAt: 'asc' },
          include: {
            matchResults: { orderBy: { placement: 'asc' } }
          }
        }
      }
    });

    if (!lobby) throw new ApiError(404, 'Lobby not found');

    const allUserIds = new Set<string>();
    (lobby.participants as string[]).forEach(id => allUserIds.add(id));
    for (const match of lobby.matches) {
      for (const r of match.matchResults) allUserIds.add(r.userId);
    }

    const users = allUserIds.size > 0
      ? await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, username: true, riotGameName: true, riotGameTag: true, rank: true }
      })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Aggregate per-player totals across all matches in this lobby
    const playerScores = new Map<string, { points: number; placements: number[] }>();
    for (const match of lobby.matches) {
      for (const r of match.matchResults) {
        const existing = playerScores.get(r.userId) || { points: 0, placements: [] };
        existing.points += r.points || 0;
        existing.placements.push(r.placement);
        playerScores.set(r.userId, existing);
      }
    }

    const players = (lobby.participants as string[]).map(userId => {
      const user = userMap.get(userId) || { id: userId, username: 'Unknown' };
      const score = playerScores.get(userId);
      return { ...user, totalPoints: score?.points || 0, placements: score?.placements || [] };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const matchHistory = lobby.matches.map((match, idx) => ({
      id: match.id,
      matchNumber: idx + 1,
      fetchedAt: (match as any).fetchedAt,
      results: match.matchResults.map(r => ({
        placement: r.placement,
        points: r.points,
        user: userMap.get(r.userId) || { id: r.userId, username: 'Unknown' },
      }))
    }));

    return {
      lobbyId: lobby.id,
      name: lobby.name,
      state: lobby.state,
      fetchedResult: lobby.fetchedResult,
      completedMatchesCount: lobby.completedMatchesCount || 0,
      phase: lobby.round.phase,
      players,
      matchHistory,
    };
  }

  /**
   * Server-side scoreboard for a specific round.
   * Replaces the old pattern of fetching the ENTIRE tournament on the frontend.
   * Single query: Round → Lobbies → Matches → MatchResults + relevant Users/Participants.
   * Returns pre-computed PlayerRoundStats ready for rendering.
   *
   * Frontend calls: GET /api/rounds/:roundId/scoreboard?limitMatch=N
   */
  static async getScoreboard(roundId: string, limitMatch?: number | null) {
    // ── Cache check: return cached scoreboard if available ──
    const cached = await tournamentCache.getScoreboard(roundId, limitMatch ?? null);
    if (cached) return cached;

    // 1. Fetch the round with all data needed
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        phase: {
          select: {
            id: true, name: true, type: true, phaseNumber: true,
            matchesPerRound: true, lobbySize: true, lobbyAssignment: true,
            advancementCondition: true, pointsMapping: true, tournamentId: true,
          }
        },
        lobbies: {
          include: {
            matches: {
              orderBy: { createdAt: 'asc' },
              include: {
                matchResults: { orderBy: { placement: 'asc' } }
              }
            }
          }
        }
      }
    });

    if (!round) throw new ApiError(404, 'Round not found');

    const phase = round.phase;
    const tournamentId = phase.tournamentId;

    // 2. Collect all user IDs from lobbies
    const allUserIds = new Set<string>();
    for (const lobby of round.lobbies) {
      const pIds = lobby.participants as string[];
      if (Array.isArray(pIds)) pIds.forEach(id => allUserIds.add(id));
      for (const match of lobby.matches) {
        for (const r of match.matchResults) allUserIds.add(r.userId);
      }
    }

    // 3. Batch fetch users + participants (with roundOutcomes for this round only)
    const [users, participants] = await Promise.all([
      allUserIds.size > 0
        ? prisma.user.findMany({
          where: { id: { in: Array.from(allUserIds) } },
          select: { id: true, username: true, riotGameName: true, riotGameTag: true, rank: true, region: true }
        })
        : [],
      prisma.participant.findMany({
        where: { tournamentId, userId: { in: Array.from(allUserIds) } },
        select: {
          id: true, userId: true, eliminated: true, scoreTotal: true,
          roundOutcomes: {
            where: { roundId },
            select: { status: true, scoreInRound: true }
          }
        }
      })
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const participantMap = new Map(participants.map(p => [p.userId, p]));

    // 4. Build all matches sorted chronologically across ALL lobbies
    const allMatches = round.lobbies.flatMap(l =>
      l.matches.map(m => ({ ...m, lobbyId: l.id }))
    ).sort((a, b) => {
      const timeA = (a as any).gameCreation ?? new Date(a.createdAt).getTime();
      const timeB = (b as any).gameCreation ?? new Date(b.createdAt).getTime();
      return timeA - timeB;
    });

    // Build matchResults map for frontend compatibility
    const matchResultsMap: Record<string, { matchId: string; participantId: string; placement: number; points: number }[]> = {};
    for (const match of allMatches) {
      matchResultsMap[match.id] = match.matchResults.map(r => ({
        matchId: match.id,
        participantId: r.userId,
        placement: r.placement,
        points: r.points || 0,
      }));
    }

    // 5. Compute per-player stats (mirrors frontend logic exactly)
    // 'elimination': single-match placement ranking (last match score used for ranking)
    // 'points', 'swiss', 'checkmate', etc.: cumulative total across all matches
    const isElimination = phase.type === 'elimination';
    const advancementCondition = (phase.advancementCondition as any) || {};
    const advancementN = advancementCondition.type === 'placement' ? (advancementCondition.value ?? null) : null;
    const matchesPerRound = phase.matchesPerRound || 1;

    type RawPlayer = {
      id: string; userId: string; lobbyId: string; lobbyName: string;
      name: string; region: string; placements: number[]; points: number[];
      lastPlacement: number; total: number;
      roundOutcomeStatus: string | null; eliminatedGlobal: boolean;
    };

    const rawPlayers: RawPlayer[] = [];

    for (const lobby of round.lobbies) {
      const pIds = (lobby.participants as string[]) || [];
      for (const userId of pIds) {
        const user = userMap.get(userId);
        const participant = participantMap.get(userId);
        if (!user) continue;

        // Find all match results for this player across ALL lobbies (reshuffling support)
        const allPlayerResults = allMatches
          .map(match => {
            const result = match.matchResults.find(r => r.userId === userId);
            return result ? { result, lobbyId: match.lobbyId } : null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        // Crop to limitMatch if specified
        const displayResults = (limitMatch && limitMatch > 0)
          ? allPlayerResults.slice(0, limitMatch)
          : allPlayerResults;

        // Determine displaying lobby (historical for limitMatch)
        let finalLobbyId = lobby.id;
        let finalLobbyName = lobby.name;
        if (limitMatch && limitMatch > 0 && displayResults.length > 0) {
          const historicalLobbyId = displayResults[displayResults.length - 1].lobbyId;
          const hLobby = round.lobbies.find(l => l.id === historicalLobbyId);
          if (hLobby) {
            finalLobbyId = hLobby.id;
            finalLobbyName = hLobby.name;
          }
        }

        // Elimination: single-match score; other: cumulative
        let effectiveMatchIndex: number | null = null;
        if (isElimination) {
          effectiveMatchIndex = (limitMatch && limitMatch > 0) ? limitMatch - 1 : displayResults.length - 1;
        }

        const specificResult = (isElimination && effectiveMatchIndex !== null)
          ? displayResults[effectiveMatchIndex] ?? null
          : null;

        const calculatedScore = specificResult
          ? (specificResult.result.points || 0)
          : displayResults.reduce((sum, item) => sum + (item.result.points || 0), 0);

        const placements = displayResults.map(item => item.result.placement);
        const points = displayResults.map(item => item.result.points || 0);
        const lastPlacement = placements.length > 0 ? placements[placements.length - 1] : Infinity;
        const effectivePlacement = specificResult?.result.placement ?? lastPlacement;

        const roundOutcome = participant?.roundOutcomes?.[0] ?? null;
        const isHistoricalView = limitMatch && limitMatch > 0 && limitMatch < matchesPerRound;
        const totalScore = (!isHistoricalView && roundOutcome?.scoreInRound != null)
          ? roundOutcome.scoreInRound
          : calculatedScore;

        rawPlayers.push({
          id: participant?.id || userId,
          userId,
          lobbyId: finalLobbyId,
          lobbyName: finalLobbyName,
          name: user.riotGameName || user.username || 'Unknown',
          region: (user as any).region || 'N/A',
          placements,
          points,
          lastPlacement: effectivePlacement,
          total: isHistoricalView
            ? calculatedScore
            : ((!isElimination && roundOutcome?.scoreInRound != null) ? roundOutcome.scoreInRound : calculatedScore),
          roundOutcomeStatus: roundOutcome?.status ?? null,
          eliminatedGlobal: participant?.eliminated ?? false,
        });
      }
    }

    // Deduplicate: a player can appear in multiple lobbies (reshuffling), keep the one from their "final" lobby
    const deduped = new Map<string, RawPlayer>();
    for (const p of rawPlayers) {
      if (!deduped.has(p.userId) || p.placements.length > (deduped.get(p.userId)!.placements.length)) {
        deduped.set(p.userId, p);
      }
    }
    const uniquePlayers = Array.from(deduped.values());

    // 6. Derive status per lobby
    const lobbyGroups = new Map<string, RawPlayer[]>();
    for (const p of uniquePlayers) {
      const key = p.lobbyId;
      if (!lobbyGroups.has(key)) lobbyGroups.set(key, []);
      lobbyGroups.get(key)!.push(p);
    }

    const scoreboard = uniquePlayers.map(player => {
      let status: 'advanced' | 'eliminated' | 'pending';

      const thisLobby = round.lobbies.find(l => l.id === player.lobbyId);
      const isLobbyCompleted = thisLobby?.state === 'FINISHED' || (thisLobby?.fetchedResult === true && (thisLobby?.completedMatchesCount || 0) >= matchesPerRound);

      if (player.roundOutcomeStatus) {
        status = player.roundOutcomeStatus as 'advanced' | 'eliminated';
      } else if (isLobbyCompleted && player.placements.length > 0 && advancementN !== null) {
        const lobbyPlayers = lobbyGroups.get(player.lobbyId) ?? [];
        const sorted = [...lobbyPlayers].sort((a, b) => {
          const scoreDiff = b.total - a.total;
          if (scoreDiff !== 0) return scoreDiff;
          return a.lastPlacement - b.lastPlacement;
        });
        const rank = sorted.findIndex(p => p.id === player.id) + 1;
        status = rank <= advancementN ? 'advanced' : 'eliminated';
      } else if (isLobbyCompleted && player.placements.length > 0) {
        status = player.eliminatedGlobal ? 'eliminated' : 'advanced';
      } else {
        status = 'pending';
      }

      return {
        id: player.id,
        name: player.name,
        region: player.region,
        lobbyName: player.lobbyName,
        placements: player.placements,
        lastPlacement: player.lastPlacement,
        points: player.points,
        total: player.total,
        status,
      };
    });

    // 7. Compute summary stats
    const maxCompletedLobbyMatches = round.lobbies.reduce((max, l) =>
      Math.max(max, l.completedMatchesCount || 0), 0);

    let numMatchColumns: number;
    if (limitMatch && limitMatch > 0 && limitMatch <= matchesPerRound) {
      numMatchColumns = limitMatch;
    } else {
      numMatchColumns = Math.min(matchesPerRound, maxCompletedLobbyMatches + 1);
    }

    const isCheckmate = phase.type === 'checkmate';
    const actualMatchesCount = round.lobbies.reduce((total, l) => total + l.matches.length, 0);
    const totalMatchesForRound = isCheckmate
      ? actualMatchesCount
      : round.lobbies.length * matchesPerRound;

    // 8. Minimal tournament context for the header
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true, name: true, status: true, entryFee: true, maxPlayers: true,
        prizeStructure: true, image: true,
        hostFeePercent: true, isCommunityMode: true,
      }
    });

    // Build lightweight round object for FE (compatible with IRound type)
    const roundForFE = {
      id: round.id,
      phaseId: round.phaseId,
      roundNumber: round.roundNumber,
      startTime: round.startTime,
      endTime: round.endTime,
      status: round.status,
      lobbies: round.lobbies.map(l => ({
        id: l.id,
        roundId: l.roundId,
        name: l.name,
        participants: l.participants,
        fetchedResult: l.fetchedResult,
        completedMatchesCount: l.completedMatchesCount || 0,
        state: l.state,
        matches: l.matches.map(m => ({
          id: m.id,
          lobbyId: m.lobbyId,
          matchIdRiotApi: m.matchIdRiotApi,
          status: 'completed',
          matchData: m.matchData,
          createdAt: m.createdAt,
          matchResults: m.matchResults.map(r => ({
            matchId: r.matchId,
            participantId: r.userId,
            placement: r.placement,
            points: r.points || 0,
          }))
        }))
      }))
    };

    const result = {
      success: true,
      tournament: tournament || { id: tournamentId, name: 'Unknown' },
      round: roundForFE,
      phase: {
        id: phase.id,
        name: phase.name,
        type: phase.type,
        phaseNumber: phase.phaseNumber,
        matchesPerRound,
        advancementCondition: phase.advancementCondition,
      },
      scoreboard,
      matchResults: matchResultsMap,
      summary: {
        totalMatches: totalMatchesForRound,
        pointsAwarded: scoreboard.reduce((sum, p) => sum + p.total, 0),
        playersAdvanced: scoreboard.filter(p => p.status === 'advanced').length,
        playersEliminated: scoreboard.filter(p => p.status === 'eliminated').length,
        numMatchColumns,
        maxCompletedLobbyMatches,
      }
    };

    // ── Cache the scoreboard result ──
    tournamentCache.setScoreboard(roundId, limitMatch ?? null, result).catch(() => {});

    return result;
  }

  /**
   * Reshuffle lobbies after elimination or group completion.
   * When a group (round) completes, surviving players are redistributed into remaining active groups.
   */
  static async reshuffleAfterElimination(tournamentId: string, completedRoundId: string) {
    logger.info(`[Reshuffle] Starting reshuffle for tournament ${tournamentId} after round ${completedRoundId}`);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
              include: { lobbies: true }
            }
          }
        }
      }
    });

    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Find the current active phase
    const activePhase = tournament.phases.find(p => p.status === 'in_progress');
    if (!activePhase) {
      logger.info(`[Reshuffle] No active phase found. Skipping reshuffle.`);
      return;
    }

    // Find remaining active rounds (groups) that are still in_progress
    const activeRounds = activePhase.rounds.filter(r => r.status === 'in_progress' && r.id !== completedRoundId);

    if (activeRounds.length === 0) {
      logger.info(`[Reshuffle] No remaining active groups. All groups completed.`);
      return;
    }

    // Get surviving players from the completed round
    const completedRound = activePhase.rounds.find(r => r.id === completedRoundId);
    if (!completedRound) return;

    // Find the surviving players (not eliminated) who were in the completed round
    const completedRoundUserIds = new Set<string>();
    for (const lobby of completedRound.lobbies) {
      const participants = lobby.participants as string[];
      if (Array.isArray(participants)) {
        participants.forEach(id => completedRoundUserIds.add(id));
      }
    }

    // Check which of these players are still alive (not eliminated)
    const survivingParticipants = await prisma.participant.findMany({
      where: {
        tournamentId,
        userId: { in: Array.from(completedRoundUserIds) },
        eliminated: false
      }
    });

    if (survivingParticipants.length === 0) {
      logger.info(`[Reshuffle] No surviving players to redistribute.`);
      return;
    }

    logger.info(`[Reshuffle] Redistributing ${survivingParticipants.length} surviving players into ${activeRounds.length} active groups.`);

    const lobbySize = activePhase.lobbySize || 8;

    // For each active round, collect existing players, add redistributed ones, re-create lobbies
    const playersPerGroup = Math.ceil(survivingParticipants.length / activeRounds.length);
    let redistributed = fisherYatesShuffle([...survivingParticipants]);

    for (const round of activeRounds) {
      // Get chunk of players to add to this group  
      const extraPlayers = redistributed.splice(0, playersPerGroup);
      if (extraPlayers.length === 0) continue;

      // Get existing players in this round's lobbies
      const existingUserIds: string[] = [];
      for (const lobby of round.lobbies) {
        const participants = lobby.participants as string[];
        if (Array.isArray(participants)) {
          existingUserIds.push(...participants);
        }
      }

      // Combine existing + new players
      const allPlayers = [...existingUserIds, ...extraPlayers.map(p => p.userId)];

      // Delete old lobbies for this round
      await prisma.lobby.deleteMany({ where: { roundId: round.id } });

      // Re-create lobbies with combined player list
      let lobbyCount = 1;
      for (let i = 0; i < allPlayers.length; i += lobbySize) {
        const lobbyParticipants = allPlayers.slice(i, i + lobbySize);
        await prisma.lobby.create({
          data: {
            roundId: round.id,
            name: `Lobby ${lobbyCount++}`,
            participants: lobbyParticipants,
            state: 'WAITING',
            phaseStartedAt: new Date(),
          }
        });
      }

      logger.info(`[Reshuffle] Group ${this.groupNameFromNumber(round.roundNumber)}: ${existingUserIds.length} existing + ${extraPlayers.length} redistributed = ${allPlayers.length} total players`);
    }

    // Emit bracket update
    if ((global as any).io) {
      await bracketCache.invalidate(tournamentId);
      (global as any).io.to(`tournament:${tournamentId}`).emit('bracket_update', { tournamentId });
      (global as any).io.to(`tournament:${tournamentId}`).emit('tournament_update', { type: 'bracket_reshuffled' });
    }

    logger.info(`[Reshuffle] Completed reshuffle for tournament ${tournamentId}`);
  }

  /**
   * Force-advance an entire phase to the next phase.
   * Production-safe emergency override when:
   *   - All groups have finished playing but phase is stuck as 'in_progress'
   *   - Individual group Force Advance buttons don't resolve the stuck phase
   *   - Race condition between parallel groups prevented automatic phase transition
   *
   * Steps:
   *   1. Mark all lobbies in all rounds of this phase as fetchedResult=true
   *   2. Mark all non-completed rounds as 'completed'
   *   3. Trigger autoAdvance on the last round → enters the recovery path and performs phase transition
   *
   * Works with both mock and real Riot API data — only operates on state flags, not match data.
   */
  static async forceAdvancePhase(phaseId: string) {
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        rounds: {
          include: { lobbies: { select: { id: true, state: true, fetchedResult: true } } }
        }
      }
    });

    if (!phase) throw new ApiError(404, 'Phase not found');
    if (phase.status === 'completed') {
      return { message: `Phase ${phase.name} is already completed.`, alreadyCompleted: true };
    }
    if (phase.status !== 'in_progress') {
      throw new ApiError(400, `Phase ${phase.name} is '${phase.status}', not 'in_progress'. Cannot force-advance a phase that hasn't started.`);
    }

    logger.warn(`[ForceAdvancePhase] Admin forced phase advance for: ${phase.name} (${phaseId})`);

    let lastRoundId: string | null = null;

    for (const round of phase.rounds) {
      // Step 1: Mark all lobbies as fetched
      const unfetchedLobbies = round.lobbies.filter(l => !l.fetchedResult);
      if (unfetchedLobbies.length > 0) {
        await prisma.lobby.updateMany({
          where: { id: { in: unfetchedLobbies.map(l => l.id) } },
          data: { fetchedResult: true }
        });
        logger.info(`[ForceAdvancePhase] Marked ${unfetchedLobbies.length} lobbies as fetched in round ${round.roundNumber}`);
      }

      // Step 1b: Transition any non-FINISHED lobbies to FINISHED (prevent stale lobby states)
      const nonFinishedLobbies = round.lobbies.filter(l => l.state !== 'FINISHED' && l.state !== 'COMPLETED');
      if (nonFinishedLobbies.length > 0) {
        await prisma.lobby.updateMany({
          where: { id: { in: nonFinishedLobbies.map(l => l.id) } },
          data: { state: 'FINISHED' }
        });
        logger.info(`[ForceAdvancePhase] Forced ${nonFinishedLobbies.length} lobbies to FINISHED in round ${round.roundNumber}`);
      }

      // Step 2: Mark round as completed
      if (round.status !== 'completed') {
        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'completed', endTime: new Date() }
        });
        logger.info(`[ForceAdvancePhase] Marked round ${round.roundNumber} (${round.id}) as completed`);
      }

      lastRoundId = round.id;
    }

    if (!lastRoundId) {
      throw new ApiError(400, 'Phase has no rounds to advance.');
    }

    // Step 3: Trigger autoAdvance on the last round — it will enter the recovery path
    // (round.status === 'completed' + phase.status === 'in_progress') and perform the phase transition
    logger.info(`[ForceAdvancePhase] Triggering autoAdvance on last round ${lastRoundId} to run recovery/phase-transition path.`);
    const result = await RoundService.autoAdvance(lastRoundId);

    // Emit real-time updates via pipeline
    try {
      await ConsistencyPipeline.onTournamentStateChanged({
        tournamentId: phase.tournamentId,
        type: 'phase_advanced',
        detail: 'force_advanced',
      });
    } catch (_) { /* non-fatal */ }

    return { message: `Phase "${phase.name}" force-advanced successfully.`, result };
  }

  /**
   * Safely enqueue an autoAdvance job, or call it directly if BullMQ is unavailable (no Redis).
   * Using setTimeout(0) for direct calls avoids blocking the current call stack and
   * prevents recursive stack overflows when advancing multiple phases in sequence.
   */
  private static async _queueOrCallAutoAdvance(roundId: string): Promise<void> {
    if (autoAdvanceRoundQueue) {
      const uniqueSuffix = Date.now();
      await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId }, {
        jobId: `advance-${roundId}-${uniqueSuffix}`,
        removeOnComplete: true,
        removeOnFail: { count: 5 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    } else {
      // Redis not available — run directly in a deferred microtask so the caller's
      // transaction / response can finish first before we recurse.
      logger.info(`[NoRedis] Queue unavailable — scheduling direct autoAdvance for round ${roundId}`);
      setTimeout(() => {
        RoundService.autoAdvance(roundId).catch(err => {
          logger.error(`[NoRedis] Direct autoAdvance failed for round ${roundId}: ${err instanceof Error ? err.message : String(err)}`);
        });
      }, 100);
    }
  }

  static async autoAdvance(roundId: string) {
    // Initial check to prevent transaction for non-existent round
    const initialRound = await prisma.round.findUnique({ where: { id: roundId } });
    if (!initialRound) {
      logger.warn(`autoAdvance called for a round that does not exist: ${roundId}. Job will be skipped.`);
      return { message: 'Round not found, job skipped.' };
    }

    let result: any;
    let jobsToQueue: any[] = [];
    const emitter = TournamentEventBus.createTransactionalEmitter();

    try {
      // Use explicit timeouts to prevent P2028 on complex tournaments.
      // maxWait: how long Prisma waits to obtain a connection (5s default → 10s)
      // timeout: max transaction duration (5s default → 30s)
      result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // [LOCKING] Fetch round with fresh data inside transaction. 
        // We use a separate count for lobbies if prisma version doesn't support interactive locking.
        const currentRound = await tx.round.findUnique({
          where: { id: roundId },
          include: {
            phase: { include: { tournament: true } },
            lobbies: {
              include: { matches: { include: { matchResults: true } } }
            },
          },
        }) as any;

        if (!currentRound) throw new ApiError(404, 'Round not found for auto-advancement.');

        // --- LOGIC TO START A PENDING ROUND ---
        if (currentRound.status === 'pending') {
          const tournament = currentRound.phase.tournament;

          // CRUCIAL CHECK: Only for the very first round of the tournament
          if (currentRound.roundNumber === 1 && currentRound.phase.phaseNumber === 1) {
            // This count should come from a finalizeRegistration step that runs before the tournament starts
            if ((tournament.actualParticipantsCount || 0) === 0) {
              logger.warn(`Tournament ${tournament.id} has no participants. Cancelling tournament.`);
              await tx.tournament.update({
                where: { id: tournament.id },
                data: { status: 'cancelled' },
              });
              return { message: 'Tournament cancelled due to no participants.' };
            }
          }

          // If this is the first round of the first phase, update tournament status
          if (currentRound.phase.phaseNumber === 1 && (tournament.status === 'pending' || tournament.status === 'UPCOMING')) {
            await EscrowService.assertTournamentCanStart(tournament.id, tx);
            await tx.tournament.update({
              where: { id: tournament.id },
              data: { status: 'in_progress' },
            });
            await tx.phase.update({
              where: { id: currentRound.phaseId },
              data: { status: 'in_progress' },
            });

            // ═══ PARALLEL GROUPS: Start ALL rounds in this phase simultaneously ═══
            const allRoundsInPhase = await tx.round.findMany({
              where: { phaseId: currentRound.phaseId },
              orderBy: { roundNumber: 'asc' },
              include: { lobbies: true }
            });


            const participants = await tx.participant.findMany({
              where: { tournamentId: tournament.id, eliminated: false },
            });
            const shuffled = fisherYatesShuffle(participants);

            const lobbySize = currentRound.phase.lobbySize || 8;
            const maxLobbiesPerGroup = 4;
            const maxPlayersPerGroup = lobbySize * maxLobbiesPerGroup; // 32 per group

            for (let i = 0; i < allRoundsInPhase.length; i++) {
              const round = allRoundsInPhase[i];
              if (round.status === 'pending') {
                await tx.round.update({
                  where: { id: round.id },
                  data: { status: 'in_progress' },
                });
                logger.info(`[ParallelGroups] Started Group ${this.groupNameFromNumber(round.roundNumber)} (Round ${round.id})`);
              }

              // If this round has no lobbies yet, assign them now (pre-assign may have failed)
              if (round.lobbies.length === 0) {
                const start = i * maxPlayersPerGroup;
                const end = Math.min(start + maxPlayersPerGroup, shuffled.length);
                const groupParticipants = shuffled.slice(start, end);

                if (groupParticipants.length > 0) {
                  const lobbyAssignment = (currentRound.phase.lobbyAssignment || (['swiss', 'snake'].includes(currentRound.phase.type) ? currentRound.phase.type : 'random')) as 'random' | 'seeded' | 'swiss' | 'snake';
                  const matchesPerRound = currentRound.phase.matchesPerRound || 1;
                  await LobbyService.autoAssignLobbies(round.id, groupParticipants, lobbySize, lobbyAssignment, matchesPerRound, tx);
                  logger.info(`[ParallelGroups] Auto-assigned ${groupParticipants.length} participants to Group ${this.groupNameFromNumber(round.roundNumber)}`);
                } else {
                  logger.warn(`[ParallelGroups] No participants available for Group ${this.groupNameFromNumber(round.roundNumber)} (Round ${round.id})`);
                }
              }
            }
          } else {
            // ═══ Non-first-phase round — apply PARALLEL GROUPS logic (same as Phase 1) ═══
            // Start ALL rounds in this phase simultaneously and distribute participants across groups
            const allRoundsInPhase = await tx.round.findMany({
              where: { phaseId: currentRound.phaseId },
              orderBy: { roundNumber: 'asc' },
              include: { lobbies: true }
            });

            const participants = await tx.participant.findMany({
              where: { tournamentId: currentRound.phase.tournamentId, eliminated: false },
            });

            const lobbySize = currentRound.phase.lobbySize || 8;
            const maxLobbiesPerGroup = 4;
            const maxPlayersPerGroup = lobbySize * maxLobbiesPerGroup;
            const lobbyAssignment = (currentRound.phase.lobbyAssignment || (['swiss', 'snake'].includes(currentRound.phase.type) ? currentRound.phase.type : 'random')) as 'random' | 'seeded' | 'swiss' | 'snake';
            const matchesPerRound = currentRound.phase.matchesPerRound || 1;

            // Check if we need MORE groups than currently exist
            const requiredGroups = Math.max(1, Math.ceil(participants.length / maxPlayersPerGroup));
            if (allRoundsInPhase.length < requiredGroups) {
              // Create additional rounds/groups dynamically
              for (let i = allRoundsInPhase.length + 1; i <= requiredGroups; i++) {
                const newRound = await tx.round.create({
                  data: {
                    phaseId: currentRound.phaseId,
                    roundNumber: i,
                    startTime: new Date(Date.now() + 5 * 60 * 1000),
                    status: 'pending'
                  },
                  include: { lobbies: true }
                });
                allRoundsInPhase.push(newRound as any);
              }
              // Update phase numberOfRounds to reflect actual count
              await tx.phase.update({
                where: { id: currentRound.phaseId },
                data: { numberOfRounds: requiredGroups }
              });
              logger.info(`[ParallelGroups/Phase${currentRound.phase.phaseNumber}] Expanded to ${requiredGroups} groups to hold ${participants.length} players (max ${maxPlayersPerGroup}/group).`);
            }

            // Shuffle/sort participants for distribution
            let shuffled = [...participants];
            if (lobbyAssignment === 'random') {
              shuffled = fisherYatesShuffle(shuffled);
            } else {
              shuffled.sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
            }

            // Start ALL rounds and distribute participants
            for (let i = 0; i < allRoundsInPhase.length; i++) {
              const round = allRoundsInPhase[i];
              if (round.status === 'pending') {
                await tx.round.update({
                  where: { id: round.id },
                  data: { status: 'in_progress' },
                });
                logger.info(`[ParallelGroups/Phase${currentRound.phase.phaseNumber}] Started Group ${this.groupNameFromNumber(round.roundNumber)} (Round ${round.id})`);
              }

              // If this round has no lobbies yet, assign them
              if (round.lobbies.length === 0) {
                const start = i * maxPlayersPerGroup;
                const end = Math.min(start + maxPlayersPerGroup, shuffled.length);
                const groupParticipants = shuffled.slice(start, end);

                if (groupParticipants.length > 0) {
                  await LobbyService.autoAssignLobbies(round.id, groupParticipants, lobbySize, lobbyAssignment, matchesPerRound, tx);
                  logger.info(`[ParallelGroups/Phase${currentRound.phase.phaseNumber}] Auto-assigned ${groupParticipants.length} participants to Group ${this.groupNameFromNumber(round.roundNumber)}`);
                } else {
                  logger.warn(`[ParallelGroups/Phase${currentRound.phase.phaseNumber}] No participants available for Group ${this.groupNameFromNumber(round.roundNumber)}`);
                }
              }
            }
          }

          jobsToQueue = [];

          if ((global as any).io) {
            await bracketCache.invalidate(currentRound.phase.tournamentId);
            emitter.queue(`tournament:${currentRound.phase.tournamentId}`, 'tournament_update', { type: 'round_started', round: { id: roundId } });
            emitter.queue(`tournament:${currentRound.phase.tournamentId}`, 'bracket_update', { tournamentId: currentRound.phase.tournamentId });
          }
          return { message: 'Round(s) started successfully', roundId };
        }

        // --- LOGIC TO COMPLETE AN IN_PROGRESS ROUND ---
        if (currentRound.status === 'in_progress') {
          // Freshly count non-fetched lobbies to avoid stale memory issues
          const pendingLobbiesCount = await tx.lobby.count({
            where: { roundId: roundId, fetchedResult: false }
          });
          const allLobbiesFetched = pendingLobbiesCount === 0;

          logger.debug(`Round ${currentRound.id}: pendingLobbiesCount = ${pendingLobbiesCount}.`);

          // For checkmate phases, we bypass the allLobbiesFetched check
          if (!allLobbiesFetched && currentRound.phase.type !== 'checkmate') {
            return { message: `Cannot complete round. ${pendingLobbiesCount} lobbies still pending results.` };
          }

          // ═══ MULTI-MATCH SUPPORT: matchesPerRound > 1 → play multiple matches, reshuffle between each ═══
          const matchesPerRound = currentRound.phase.matchesPerRound || 1;
          if (matchesPerRound > 1) {
            // For Swiss phases with separate lobbies per match, determine completion
            // by counting the distinct matchNumbers that have ALL their lobbies fetched.
            const lobbyAssignment = (currentRound.phase.lobbyAssignment || (['swiss', 'snake'].includes(currentRound.phase.type) ? currentRound.phase.type : 'random')) as string;
            const isSwissStyle = lobbyAssignment === 'swiss' || lobbyAssignment === 'seeded' || lobbyAssignment === 'snake';

            let completedMatchCount: number;
            if (isSwissStyle) {
              // Swiss: each match has its own set of lobbies (matchNumber=1,2,3...).
              // A match is "completed" when ALL lobbies of that matchNumber have fetchedResult=true.
              const allLobbies = await tx.lobby.findMany({
                where: { roundId: currentRound.id },
                select: { matchNumber: true, fetchedResult: true }
              });
              const matchNumbers = [...new Set(allLobbies.map(l => l.matchNumber))].sort((a, b) => a - b);
              completedMatchCount = 0;
              for (const mn of matchNumbers) {
                const lobbiesForMatch = allLobbies.filter(l => l.matchNumber === mn);
                const allFetched = lobbiesForMatch.every(l => l.fetchedResult);
                if (allFetched) completedMatchCount = mn; // mn is 1-based
                else break;
              }
            } else {
              // Points/elimination: single set of lobbies, use completedMatchesCount
              const lobbiesFresh = await tx.lobby.findMany({
                where: { roundId: currentRound.id },
                select: { completedMatchesCount: true }
              });
              completedMatchCount = Math.min(...lobbiesFresh.map((l: any) => l.completedMatchesCount || 0));
            }

            logger.info(`[MultiMatch] Round ${currentRound.id}: ${completedMatchCount}/${matchesPerRound} matches completed (isSwissStyle=${isSwissStyle}).`);

            if (completedMatchCount < matchesPerRound) {
              const nextMatchNumber = completedMatchCount + 1;
              logger.info(`[MultiMatch] Preparing match ${nextMatchNumber}/${matchesPerRound}.`);

              if (currentRound.phase.type === 'elimination' || currentRound.phase.type === 'points' || lobbyAssignment === 'none') {
                // ELIMINATION / POINTS BO2/BO3: Do NOT shuffle! Players play against the same opponents.
                // Reset the SAME lobbies for the next match (in-place).
                logger.info(`[MultiMatch] ${currentRound.phase.type} phase: Skipping reshuffle, resetting same lobbies for next match.`);
                
                const lobbyIdsToReset: string[] = [];
                for (let i = 0; i < currentRound.lobbies.length; i++) {
                  const lobby = currentRound.lobbies[i];
                  // ONLY reset lobbies that have exactly finished the current stage
                  if ((lobby as any).completedMatchesCount !== completedMatchCount) {
                    continue;
                  }
                  lobbyIdsToReset.push(lobby.id);
                  
                  await tx.lobby.update({
                    where: { id: lobby.id },
                    data: {
                      fetchedResult: false,
                      state: 'WAITING',
                      matchStartedAt: null,
                      phaseStartedAt: new Date(),
                    }
                  });
                  logger.debug(`[MultiMatch] Lobby ${lobby.id} reset with same ${((lobby.participants as any[]) || []).length} players.`);
                }
                
                if (lobbyIdsToReset.length === 0) {
                     return { _action: 'none', message: `Match ${nextMatchNumber} already active across lobbies.` };
                }

                // Emit events & return sentinel
                const tId = currentRound.phase.tournamentId;
                await bracketCache.invalidate(tId);
                emitter.queue(`tournament:${tId}`, 'bracket_update', { tournamentId: tId });
                emitter.queue(`tournament:${tId}`, 'tournament_update', { type: 'lobbies_reshuffled', matchNumber: completedMatchCount, matchesPerRound });

                return {
                  _action: 'schedule_lobby_timers',
                  lobbyIds: lobbyIdsToReset,
                  delayMs: 300_000,
                  message: `Match ${completedMatchCount}/${matchesPerRound} completed. Lobbies reset for next match.`,
                  matchNumber: completedMatchCount,
                  matchesPerRound,
                  tournamentId: currentRound.phase.tournamentId
                };

              } else {
                // ═══ SWISS/SNAKE/SEEDED: CREATE NEW LOBBIES for the next match ═══
                // Explicitly seal previous match's lobbies as FINISHED to prevent UI getting stuck in PLAYING
                await tx.lobby.updateMany({
                  where: { roundId: currentRound.id, matchNumber: completedMatchCount, state: 'PLAYING' },
                  data: { state: 'FINISHED' }
                });

                // Collect all unique participant IDs from the LATEST match's lobbies
                const latestMatchLobbies = await tx.lobby.findMany({
                  where: { roundId: currentRound.id, matchNumber: completedMatchCount },
                  select: { participants: true }
                });
                const allParticipantIds: string[] = [];
                for (const lobby of latestMatchLobbies) {
                  const pIds = lobby.participants as string[];
                  if (Array.isArray(pIds)) allParticipantIds.push(...pIds);
                }
                const uniqueParticipantIds = [...new Set(allParticipantIds)];

                // Fetch participants with scores for sorting
                const parts = await tx.participant.findMany({
                  where: { userId: { in: uniqueParticipantIds }, tournamentId: currentRound.phase.tournamentId },
                  select: { userId: true, scoreTotal: true, user: { select: { username: true } } }
                });

                // Fetch MatchResults for tiebreaker
                const matchResultsForTiebreak = await tx.matchResult.findMany({
                  where: {
                    userId: { in: uniqueParticipantIds },
                    match: { lobby: { roundId: currentRound.id } }
                  },
                  select: { userId: true, placement: true }
                });

                const placementsMap = new Map<string, number[]>();
                for (const result of matchResultsForTiebreak) {
                  const existing = placementsMap.get(result.userId) || [];
                  existing.push(result.placement);
                  placementsMap.set(result.userId, existing);
                }

                const partsWithPlacements = parts.map(p => ({
                  userId: p.userId,
                  score: p.scoreTotal || 0,
                  placements: placementsMap.get(p.userId) || [],
                  username: p.user?.username
                }));

                partsWithPlacements.sort(RoundService.tiebreakComparator);

                logger.info(`[MultiMatch] Sorted logic (${lobbyAssignment}) for Round ${currentRound.id}:`);
                partsWithPlacements.forEach((p, idx) => {
                  logger.info(`  ${idx + 1}. ${p.username || p.userId}: ${p.score} pts (placements: [${p.placements.join(', ')}])`);
                });

                let shuffled: string[];
                const lobbySize = currentRound.phase.lobbySize || 8;
                const numLobbies = Math.ceil(partsWithPlacements.length / lobbySize);

                if (lobbyAssignment === 'snake') {
                  const tempLobbies: any[][] = Array.from({ length: numLobbies }, () => []);
                  for (let i = 0; i < partsWithPlacements.length; i++) {
                    const lobbyIndex = i % numLobbies;
                    const isReversed = Math.floor(i / numLobbies) % 2 !== 0;
                    if (isReversed) tempLobbies[numLobbies - 1 - lobbyIndex].push(partsWithPlacements[i]);
                    else tempLobbies[lobbyIndex].push(partsWithPlacements[i]);
                  }
                  shuffled = tempLobbies.flat().map(p => p.userId);
                } else {
                  shuffled = partsWithPlacements.map(p => p.userId);
                }

                // CREATE NEW LOBBIES for Match N+1
                const newLobbyIds: string[] = [];
                for (let i = 0; i < numLobbies; i++) {
                  const start = i * lobbySize;
                  const end = Math.min(start + lobbySize, shuffled.length);
                  const newParticipants = shuffled.slice(start, end);
                  if (newParticipants.length === 0) continue;

                  const newLobby = await tx.lobby.create({
                    data: {
                      roundId: currentRound.id,
                      name: `Lobby ${i + 1}`,
                      participants: newParticipants,
                      matchNumber: nextMatchNumber,
                      state: 'WAITING',
                      fetchedResult: false,
                      completedMatchesCount: 0,
                      phaseStartedAt: new Date(),
                    }
                  });
                  newLobbyIds.push(newLobby.id);
                  logger.info(`[MultiMatch] Created NEW lobby ${newLobby.id} (matchNumber=${nextMatchNumber}) with ${newParticipants.length} players.`);
                }

                // Emit events for frontend
                const tId = currentRound.phase.tournamentId;
                await bracketCache.invalidate(tId);
                emitter.queue(`tournament:${tId}`, 'bracket_update', { tournamentId: tId });
                emitter.queue(`tournament:${tId}`, 'tournament_update', { type: 'lobbies_reshuffled', matchNumber: completedMatchCount, matchesPerRound });

                return {
                  _action: 'schedule_lobby_timers',
                  lobbyIds: newLobbyIds,
                  delayMs: 300_000,
                  message: `Match ${completedMatchCount}/${matchesPerRound} completed. New lobbies created for match ${nextMatchNumber}.`,
                  matchNumber: completedMatchCount,
                  matchesPerRound,
                  tournamentId: currentRound.phase.tournamentId
                };
              }
            }
            logger.info(`[MultiMatch] All ${matchesPerRound} matches done for round ${currentRound.id}. Finalizing round.`);
          }

          logger.debug(`Attempting to update Round ${roundId} status to 'completed'.`);
          // Ensure all lobbies are sealed as FINISHED
          await tx.lobby.updateMany({
            where: { roundId: roundId },
            data: { state: 'FINISHED' }
          });
          await tx.round.update({ where: { id: roundId }, data: { status: 'completed', endTime: new Date() } });
          logger.debug(`Round ${currentRound.id} status updated to 'completed'.`);

          const allPhases = await tx.phase.findMany({ where: { tournamentId: currentRound.phase.tournament.id }, orderBy: { phaseNumber: 'asc' } });
          const currentPhase = allPhases.find(p => p.id === currentRound.phaseId);
          if (!currentPhase) throw new ApiError(404, 'Current phase not found');

          // Participant total scores are already dynamically incremented by MatchResultService.processMatchResults
          // Removing this._updateParticipantTotalScores to prevent double-counting of scores.
          logger.debug(`Round ${currentRound.id}: Participant total scores up to date.`);

          const totalRoundsInPhase = currentPhase.numberOfRounds || 1;
          const completedRoundsInPhase = await tx.round.count({ where: { phaseId: currentPhase.id, status: 'completed' } });
          const advancementType = (currentPhase as any).advancementCondition?.type;
          logger.debug(`Round ${currentRound.id}: completedRoundsInPhase = ${completedRoundsInPhase}/${totalRoundsInPhase}, advancementType = ${advancementType}.`);

          // ── PLACEMENT mode: eliminate per-lobby immediately, no need to wait for other groups ──
          if (advancementType === 'placement') {
            const topNPerLobby = (currentPhase as any).advancementCondition?.value;
            if (topNPerLobby) {
              logger.info(`[ParallelGroups/Placement] Group ${currentRound.roundNumber} done. Applying per-lobby elimination (top ${topNPerLobby}/lobby) immediately.`);
              // Pass no phaseId → operates only on THIS round's lobbies
              // Phase-wide advancement if transitioning, or round-specific if just one round
              await this._advanceByPlacement(tx, currentRound, topNPerLobby, currentPhase.id);
            }
            // If more groups are still running, stop here (don't advance phase yet)
            if (totalRoundsInPhase > 1 && completedRoundsInPhase < totalRoundsInPhase) {
              logger.info(`[ParallelGroups/Placement] ${totalRoundsInPhase - completedRoundsInPhase} more group(s) still running. Waiting before phase transition.`);
              return { message: `Group ${currentRound.roundNumber} completed and eliminated. Waiting for remaining groups.` };
            }
            // All groups done — proceed to phase transition below (skip _applyAdvancementCondition, already applied)
            logger.info(`[ParallelGroups/Placement] All ${totalRoundsInPhase} groups done. Proceeding to phase transition.`);
          } else {
            // ── SCORE mode (top_n_scores, swiss, etc.): wait for ALL groups, then rank globally ──
            if (totalRoundsInPhase > 1 && completedRoundsInPhase < totalRoundsInPhase) {
              logger.info(`[ParallelGroups/Scores] Group ${currentRound.roundNumber}/${totalRoundsInPhase} completed. Waiting for ${totalRoundsInPhase - completedRoundsInPhase} more group(s) before global ranking.`);
              return { message: `Group ${currentRound.roundNumber} completed. Waiting for other groups.` };
            }

            // All groups done — apply global advancement/elimination
            const advancementResult = await this._applyAdvancementCondition(tx, currentRound, currentPhase);
            if (!advancementResult.continue) {
              logger.debug(`Round ${currentRound.id}: Advancement logic prevented immediate finalization (e.g., Checkmate created new round).`);
              return { message: `Round ${currentRound.id} completed. Waiting for next round in Checkmate phase.` };
            }
          }

          // ═══ PHASE TRANSITION: ALL parallel groups completed! ═══
          logger.info(`[ParallelGroups] All ${totalRoundsInPhase} groups completed. Checking for phase transition.`);
          // (Delay removed for better UX, relying on post-transaction RaceConditionFix for final consistency)

          logger.debug(`Round ${currentRound.id}: All rounds in current phase (${currentPhase.id}) are completed. Checking for next phase.`);
          // Check if this was the last phase
          const nextPhaseIndex = allPhases.findIndex(p => p.id === currentPhase.id) + 1;
          logger.debug(`Round ${currentRound.id}: nextPhaseIndex = ${nextPhaseIndex}, allPhases.length = ${allPhases.length}.`);
          if (nextPhaseIndex < allPhases.length) {
            // Advance to the next phase
            const nextPhase = allPhases[nextPhaseIndex];
            logger.info(`Round ${currentRound.id} completed. Advancing to next phase: ${nextPhase.name} (${nextPhase.id}).`);

            if (nextPhase.carryOverScores === false) {
              await tx.participant.updateMany({
                where: { tournamentId: currentRound.phase.tournament.id, eliminated: false },
                data: { scoreTotal: 0 }
              });
              logger.info(`Round ${currentRound.id}: Scores reset for new phase ${nextPhase.id} due to carryOverScores=false.`);
            }

            await tx.phase.update({ where: { id: currentPhase.id }, data: { status: 'completed' } });
            logger.info(`Phase ${currentPhase.id} status updated to 'completed'.`);

            await tx.phase.update({ where: { id: nextPhase.id }, data: { status: 'in_progress' } });
            logger.info(`Phase ${nextPhase.id} status updated to 'in_progress'.`);

            // ── IMPORTANT: Do NOT create rounds inside the transaction ──
            // Creating rounds here causes P2028 (transaction timeout) because the transaction
            // has already spent too long on score updates and advancement logic.
            // Instead, return a sentinel so rounds are created AFTER the transaction commits.
            logger.debug(`Round ${currentRound.id}: Deferring round creation for new phase ${nextPhase.id} to post-transaction.`);
            return {
              _action: 'create_next_phase_rounds',
              completedPhaseId: currentPhase.id,
              nextPhaseId: nextPhase.id,
              numberOfRounds: (nextPhase as any).numberOfRounds || 1,
              tournamentId: currentRound.phase.tournament.id,
              message: `Phase ${currentPhase.id} completed. Next phase ${nextPhase.id} scheduled.`,
            };
          }

          logger.info(`Round ${currentRound.id}: This was the last round of the last phase. Finalizing tournament.`);
          logger.debug(`Finalizing tournament ${currentRound.phase.tournament.id}.`);

          // Only mark tournament as COMPLETED inside the transaction (fast, minimal locks).
          // Payout logic runs AFTER the transaction commits to prevent P2028 timeouts.
          await tx.tournament.update({
            where: { id: currentRound.phase.tournament.id },
            data: { status: 'COMPLETED', endTime: new Date() }
          });

          logger.info(`Tournament ${currentRound.phase.tournament.id} marked COMPLETED. Payout deferred to post-commit.`);

          return {
            _action: 'payout_prizes',
            message: 'Tournament completed. Prize payout deferred to post-commit.',
            tournamentId: currentRound.phase.tournament.id
          };
        }

        // ── RECOVERY: Round is 'completed' but phase may still be stuck as 'in_progress' ──
        // This happens when the last group completes but the phase transition was interrupted
        // (e.g. network timeout, server restart, BullMQ job failure, or race condition).
        // Instead of silently returning, try to recover by re-running the phase transition.
        if (currentRound.status === 'completed') {
          const allPhases = await tx.phase.findMany({ where: { tournamentId: currentRound.phase.tournament.id }, orderBy: { phaseNumber: 'asc' } });
          const currentPhase = allPhases.find(p => p.id === currentRound.phaseId);

          if (!currentPhase) {
            logger.warn(`[Recovery] Phase ${currentRound.phaseId} not found for completed round ${roundId}.`);
            return { message: 'Round already completed, phase not found.' };
          }

          // Only attempt recovery if the phase is still in_progress (stuck)
          if (currentPhase.status !== 'in_progress') {
            logger.info(`[Recovery] Round ${roundId} already completed and phase ${currentPhase.id} is '${currentPhase.status}'. No recovery needed.`);
            // Phase already advanced — check if there's a pending round in the next phase that needs starting
            if (currentPhase.status === 'completed') {
              const nextPhase = allPhases.find(p => p.status === 'in_progress' || p.status === 'pending');
              if (nextPhase && nextPhase.status === 'in_progress') {
                const pendingRound = await tx.round.findFirst({
                  where: { phaseId: nextPhase.id, status: 'pending' },
                  orderBy: { roundNumber: 'asc' }
                });
                if (pendingRound) {
                  logger.info(`[Recovery] Found pending round ${pendingRound.id} in next phase ${nextPhase.id}. Queuing for start.`);
                  return { _action: 'queue_next_round', nextRoundId: pendingRound.id, message: 'Recovery: queuing pending round in next phase.' };
                }
              }
            }
            return { message: 'Round already completed, no recovery needed.' };
          }

          // Phase is stuck in 'in_progress' — check if all rounds are completed
          const totalRoundsInPhase = await tx.round.count({ where: { phaseId: currentPhase.id } });
          const completedRoundsInPhase = await tx.round.count({ where: { phaseId: currentPhase.id, status: 'completed' } });

          if (completedRoundsInPhase < totalRoundsInPhase) {
            // Not all rounds are done — check if there are in_progress rounds that need advancing
            const inProgressRound = await tx.round.findFirst({
              where: { phaseId: currentPhase.id, status: 'in_progress' },
              include: { lobbies: true }
            });
            if (inProgressRound) {
              const allFetched = inProgressRound.lobbies.every(l => l.fetchedResult);
              if (allFetched && inProgressRound.lobbies.length > 0) {
                logger.info(`[Recovery] Found in_progress round ${inProgressRound.id} with all lobbies fetched. Queuing for advance.`);
                return { _action: 'queue_next_round', nextRoundId: inProgressRound.id, message: 'Recovery: advancing stalled in_progress round.' };
              }
            }
            logger.info(`[Recovery] Phase ${currentPhase.id}: ${completedRoundsInPhase}/${totalRoundsInPhase} rounds completed. Still waiting for remaining rounds.`);
            return { message: `Round already completed. ${totalRoundsInPhase - completedRoundsInPhase} group(s) still running.` };
          }

          // ═══ ALL rounds completed but phase stuck as in_progress — RE-RUN PHASE TRANSITION ═══
          logger.warn(`[Recovery] Phase ${currentPhase.id} stuck as 'in_progress' with ALL ${totalRoundsInPhase} rounds completed! Waiting 1s for DB consistency...`);
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Apply advancement condition if scores or placement need recalculation
          const advancementType = (currentPhase as any).advancementCondition?.type;
          if (advancementType) {
            try {
              const advancementResult = await this._applyAdvancementCondition(tx, currentRound, currentPhase);
              if (!advancementResult.continue) {
                logger.info(`[Recovery] Advancement condition for phase ${currentPhase.id} returned continue=false.`);
                return { message: 'Recovery: advancement condition prevents phase transition.' };
              }
            } catch (advErr) {
              logger.warn(`[Recovery] Advancement condition failed (may have already been applied): ${advErr instanceof Error ? advErr.message : String(advErr)}`);
              // Continue anyway — the advancement may have already been applied
            }
          }

          // Proceed with phase transition
          const nextPhaseIndex = allPhases.findIndex(p => p.id === currentPhase.id) + 1;
          if (nextPhaseIndex < allPhases.length) {
            const nextPhase = allPhases[nextPhaseIndex];
            logger.info(`[Recovery] Advancing to next phase: ${nextPhase.name} (${nextPhase.id}).`);

            if (nextPhase.carryOverScores === false) {
              await tx.participant.updateMany({
                where: { tournamentId: currentRound.phase.tournament.id, eliminated: false },
                data: { scoreTotal: 0 }
              });
            }

            await tx.phase.update({ where: { id: currentPhase.id }, data: { status: 'completed' } });
            await tx.phase.update({ where: { id: nextPhase.id }, data: { status: 'in_progress' } });

            return {
              _action: 'create_next_phase_rounds',
              completedPhaseId: currentPhase.id,
              nextPhaseId: nextPhase.id,
              numberOfRounds: (nextPhase as any).numberOfRounds || 1,
              tournamentId: currentRound.phase.tournament.id,
              message: `[Recovery] Phase ${currentPhase.id} completed. Next phase ${nextPhase.id} scheduled.`,
            };
          }

          // Last phase — finalize tournament
          logger.info(`[Recovery] Last phase completed. Finalizing tournament ${currentRound.phase.tournament.id}.`);
          await tx.phase.update({ where: { id: currentPhase.id }, data: { status: 'completed' } });
          await tx.tournament.update({
            where: { id: currentRound.phase.tournament.id },
            data: { status: 'COMPLETED', endTime: new Date() }
          });

          return {
            _action: 'payout_prizes',
            message: '[Recovery] Tournament completed via recovery. Prize payout deferred.',
            tournamentId: currentRound.phase.tournament.id
          };
        }

        // If status is truly unexpected (not pending, in_progress, or completed), warn
        logger.warn(`autoAdvance called for round ${roundId} with unexpected status: ${currentRound.status}`);
        return { message: 'Round in unexpected state, no action taken.' };
      }, { maxWait: 10000, timeout: 30000 }); // 30s timeout to handle large tournaments

      // Flush socket emissions after transaction commits successfully
      emitter.flush();

      // After the transaction commits, queue the jobs (only if queue is available)
      if (jobsToQueue.length > 0 && fetchMatchDataQueue) {
        logger.info(`Queuing ${jobsToQueue.length} match data jobs after transaction commit.`);
        for (const jobData of jobsToQueue) {
          await fetchMatchDataQueue.add('fetchMatchData', jobData);
        }
      }

      // ── POST-TRANSACTION RACE CONDITION FIX ──────────────────────────────────
      // When parallel groups (e.g. Group A & B) complete simultaneously, each
      // transaction only sees ITSELF as newly completed (1/2). Both return
      // "Waiting for remaining groups" and neither triggers the phase transition.
      // Fix: After committing, re-check (outside transaction) if ALL rounds in the
      // phase are now completed. If so, re-trigger autoAdvance which will enter the
      // recovery path (round.status === 'completed' + phase.status === 'in_progress')
      // and correctly perform the phase transition.
      if (result && typeof result.message === 'string' && result.message.includes('Waiting for')) {
        setTimeout(async () => {
          try {
            const completedRound = await prisma.round.findUnique({
              where: { id: roundId },
              include: { phase: true },
            });
            if (!completedRound || completedRound.phase.status !== 'in_progress') return;

            const totalInPhase = await prisma.round.count({ where: { phaseId: completedRound.phaseId } });
            const doneInPhase = await prisma.round.count({ where: { phaseId: completedRound.phaseId, status: 'completed' } });

            if (doneInPhase >= totalInPhase) {
              logger.warn(`[RaceConditionFix] All ${totalInPhase} rounds in phase ${completedRound.phaseId} are completed but phase is still 'in_progress'. Re-triggering autoAdvance for recovery.`);
              await RoundService._queueOrCallAutoAdvance(roundId);
            } else {
              logger.debug(`[RaceConditionFix] Phase ${completedRound.phaseId}: ${doneInPhase}/${totalInPhase} rounds done. No re-trigger needed.`);
            }
          } catch (recheckErr) {
            logger.error(`[RaceConditionFix] Post-tx recheck failed: ${recheckErr instanceof Error ? recheckErr.message : String(recheckErr)}`);
          }
        }, 1500); // 1.5s delay to allow the parallel transaction to commit first
      }

      // ── Schedule lobby timers AFTER transaction commits ──
      // autoAssignLobbies returns transitionsToSchedule but cannot call LobbyTimerService
      // inside a transaction (BullMQ requires committed IDs). We query newly created lobbies
      // from the pending→in_progress path and schedule their WAITING→READY_CHECK timers here.
      if (result && result.message === 'Round(s) started successfully') {
        try {
          const LobbyTimerSvc = (await import('./LobbyTimerService')).default;
          // Find all lobbies in the started rounds that have no BullMQ timer scheduled yet
          // (those created inside the transaction above will have state WAITING and no timer)
          const newLobbies = await prisma.lobby.findMany({
            where: {
              round: { phase: { rounds: { some: { id: result.roundId } } } },
              state: 'WAITING',
            },
            select: { id: true },
          });
          if (newLobbies.length > 0) {
            logger.info(`[PostTx] Scheduling WAITING→READY_CHECK timers for ${newLobbies.length} new lobbies.`);
            for (const lobby of newLobbies) {
              await LobbyTimerSvc.scheduleTransition(lobby.id, 'READY_CHECK' as any, 120_000).catch(err => {
                logger.warn(`[PostTx] Failed to schedule lobby timer for ${lobby.id}: ${err instanceof Error ? err.message : String(err)}`);
              });
            }
          }
        } catch (timerErr) {
          logger.warn(`[PostTx] Lobby timer scheduling failed (non-fatal): ${timerErr instanceof Error ? timerErr.message : String(timerErr)}`);
        }
      }

      // ── Handle schedule_lobby_timers sentinel (multi-match reshuffle) ──────────
      // When autoAdvance reshuffles lobbies between matches in a BO2/BO3 round,
      // it returns this sentinel. We must schedule WAITING→READY_CHECK timers
      // AFTER the transaction commits so Redis/BullMQ can operate on committed data.
      if (result && result._action === 'schedule_lobby_timers' && result.lobbyIds) {
        try {
          const LobbyTimerSvc = (await import('./LobbyTimerService')).default;
          const { LOBBY_STATE: LB_STATE } = await import('../constants/lobbyStates');
          logger.info(`[PostTx] Scheduling WAITING→READY_CHECK timers for ${result.lobbyIds.length} lobbies (multi-match reshuffle, delay=${result.delayMs}ms).`);

          // Clear stale Redis ready-sets from the previous match so new match starts fresh
          try {
            const { createClient } = await import('../lib/redis');
            const redis = createClient();
            for (const lobbyId of result.lobbyIds) {
              await redis.del(`lobby:ready:${lobbyId}`);
            }
            logger.info(`[PostTx] Cleared Redis ready-sets for ${result.lobbyIds.length} lobbies after reshuffle.`);
          } catch (redisErr) {
            logger.warn(`[PostTx] Failed to clear Redis ready-sets (non-fatal): ${redisErr instanceof Error ? redisErr.message : String(redisErr)}`);
          }

          for (const lobbyId of result.lobbyIds) {
            await LobbyTimerSvc.scheduleTransition(lobbyId, LB_STATE.READY_CHECK, result.delayMs || 300_000).catch(err => {
              logger.warn(`[PostTx] Failed to schedule lobby timer for ${lobbyId}: ${err instanceof Error ? err.message : String(err)}`);
            });
          }

          // Emit bracket update so frontend immediately sees lobbies in WAITING state
          if ((global as any).io && result.tournamentId) {
            await bracketCache.invalidate(result.tournamentId);
            (global as any).io.to(`tournament:${result.tournamentId}`).emit('bracket_update', { tournamentId: result.tournamentId });
            (global as any).io.to(`tournament:${result.tournamentId}`).emit('tournament_update', { type: 'lobbies_reset_for_next_match' });
          }
        } catch (timerErr) {
          logger.warn(`[PostTx] schedule_lobby_timers handling failed (non-fatal): ${timerErr instanceof Error ? timerErr.message : String(timerErr)}`);
        }
      }

      // ── Handle 'queue_next_round' sentinel (same-phase, next sequential round) ──
      if (result && result._action === 'queue_next_round') {
        logger.info(`[PostTx] Queuing/starting next round ${result.nextRoundId} after transaction commit.`);
        await RoundService._queueOrCallAutoAdvance(result.nextRoundId);
        return result;
      }

      // ── Handle deferred round creation for next phase (post-transaction, no timeout risk) ──
      if (result && result._action === 'create_next_phase_rounds') {
        const { nextPhaseId, completedPhaseId, tournamentId: tId } = result;

        // ── Dynamically calculate required groups based on surviving participants ──
        const nextPhaseData = await prisma.phase.findUnique({ where: { id: nextPhaseId } });
        const survivingCount = await prisma.participant.count({
          where: { tournamentId: tId, eliminated: false }
        });
        const lobbySize = nextPhaseData?.lobbySize || 8;
        const maxLobbiesPerGroup = 4;
        const maxPlayersPerGroup = lobbySize * maxLobbiesPerGroup;
        const dynamicNumberOfRounds = Math.max(1, Math.ceil(survivingCount / maxPlayersPerGroup));
        const numberOfRounds = dynamicNumberOfRounds;

        logger.info(`[PostTx] Creating ${numberOfRounds} rounds for new phase ${nextPhaseId} (${survivingCount} surviving players, max ${maxPlayersPerGroup}/group).`);

        // Update phase to reflect actual number of rounds
        await prisma.phase.update({
          where: { id: nextPhaseId },
          data: { numberOfRounds }
        });

        let lastRoundStartTime = new Date(Date.now() + 1000 * 60 * 5); // 5 min from now
        let firstRoundOfNextPhaseId: string | null = null;

        for (let i = 1; i <= numberOfRounds; i++) {
          const currentRoundStartTime = i === 1
            ? lastRoundStartTime
            : new Date(lastRoundStartTime.getTime() + 45 * 60 * 1000); // 45 min between rounds

          const newRound = await prisma.round.create({
            data: {
              phaseId: nextPhaseId,
              roundNumber: i,
              startTime: currentRoundStartTime,
              status: 'pending',
            },
          });

          if (i === 1) firstRoundOfNextPhaseId = newRound.id;
          lastRoundStartTime = currentRoundStartTime;
          logger.debug(`[PostTx] Created round ${newRound.id} (number ${i}) for phase ${nextPhaseId}.`);
        }

        if (!firstRoundOfNextPhaseId) {
          logger.error(`[PostTx] Failed to create first round for phase ${nextPhaseId}.`);
          throw new ApiError(500, 'Failed to create the first round of the next phase (post-transaction).');
        }

        // Emit bracket update so frontend sees the new rounds immediately
        if ((global as any).io) {
          await bracketCache.invalidate(tId);
          (global as any).io.to(`tournament:${tId}`).emit('bracket_update', { tournamentId: tId });
          (global as any).io.to(`tournament:${tId}`).emit('tournament_update', { type: 'phase_advanced' });
        }

        // Queue (or directly call) first round of next phase
        await RoundService._queueOrCallAutoAdvance(firstRoundOfNextPhaseId!);
        logger.info(`[PostTx] Phase ${completedPhaseId} completed. Next phase ${nextPhaseId} first round (${firstRoundOfNextPhaseId}) queued with ${numberOfRounds} groups.`);

        return result; // return original sentinel message
      }
      // ── Handle deferred prize payout (post-transaction, separate from round completion) ──
      if (result && result._action === 'payout_prizes') {
        const tId = result.tournamentId;
        logger.info(`[PostTx] Running deferred payoutPrizes for tournament ${tId} in separate transaction.`);

        try {
          // Run payout in its own transaction — completely independent from the round transaction
          await prisma.$transaction(async (payoutTx: Prisma.TransactionClient) => {
            const finalParticipants = await payoutTx.participant.findMany({
              where: { tournamentId: tId, eliminated: false },
              orderBy: { scoreTotal: 'desc' },
            });

            await this.payoutPrizes(payoutTx, tId, finalParticipants);
          }, { maxWait: 10000, timeout: 30000 });

          logger.info(`[PostTx] Prize payout completed for tournament ${tId}.`);
        } catch (payoutError) {
          // Payout failure must NOT crash the tournament flow — tournament is already COMPLETED.
          // Log the error and the admin can trigger manual payout via the dashboard.
          const errMsg = payoutError instanceof Error ? payoutError.message : String(payoutError);
          logger.error(`[PostTx] CRITICAL: Prize payout failed for tournament ${tId}: ${errMsg}. Manual payout required.`);
        }

        // Fall through to the summary processing below (result.tournamentId is set)
      }

      // Process tournament summary after transaction if tournament was completed
      if (result && result.tournamentId) {
        // Emit tournament completed event to all connected clients
        if ((global as any).io) {
          (global as any).io.to(`tournament:${result.tournamentId}`).emit('tournament_update', { type: 'tournament_completed' });
          await bracketCache.invalidate(result.tournamentId);
          (global as any).io.to(`tournament:${result.tournamentId}`).emit('bracket_update', { tournamentId: result.tournamentId });
        }

        // Log để biết rằng xử lý async đã được lên lịch
        logger.info(`Scheduling async processing for tournament ${result.tournamentId}`);

        // Tách biệt xử lý bất đồng bộ để không block response
        // Sử dụng setTimeout thay vì setImmediate để tránh lỗi TypeScript
        setTimeout(async () => {
          try {
            logger.info(`Starting async post-transaction processing for tournament ${result.tournamentId}`);

            // Kiểm tra xem tournament đã tồn tại hay chưa
            const tournamentExists = await prisma.tournament.findUnique({
              where: { id: result.tournamentId }
            });

            if (!tournamentExists) {
              logger.error(`Cannot process tournament summary: Tournament ${result.tournamentId} not found in database`);
              return;
            }

            // Sử dụng phương thức processCompletedTournamentDirectly mới để xử lý tất cả các summaries
            try {
              await SummaryManagerService.processCompletedTournamentDirectly(result.tournamentId);
            } catch (directError) {
              const errorMsg = directError instanceof Error ? directError.message : String(directError);
              logger.error(`Error in direct tournament summary processing: ${errorMsg}`);

              // Fallback: nếu xử lý trực tiếp thất bại, kiểm tra từng phần
              logger.info(`Using fallback approach to process tournament ${result.tournamentId} summaries`);

              // Tiếp tục với cách tiếp cận ban đầu
              try {
                // Kiểm tra điều kiện bảng UserTournamentSummary
                const tournamentSummaries = await prisma.userTournamentSummary.findMany({
                  where: { tournamentId: result.tournamentId }
                });

                if (tournamentSummaries.length > 0) {
                  logger.info(`Tournament ${result.tournamentId} already has ${tournamentSummaries.length} summaries. Skipping direct update.`);
                } else {
                  await SummaryManagerService.updateTournamentSummaries(result.tournamentId);
                  logger.info(`Direct summary update completed for tournament ${result.tournamentId}`);

                  // Kiểm tra xem summary đã được tạo chưa
                  const createdSummaries = await prisma.userTournamentSummary.findMany({
                    where: { tournamentId: result.tournamentId }
                  });

                  logger.info(`After direct update: Tournament ${result.tournamentId} now has ${createdSummaries.length} summaries.`);
                }
              } catch (secondaryError) {
                // Thêm vào queue nếu tất cả cách trực tiếp đều thất bại
                logger.warn(`All direct summary approaches failed for tournament ${result.tournamentId}, adding to queue`);
                await SummaryManagerService.queueTournamentSummary(result.tournamentId);
              }

              // Kiểm tra các bảng khác liên quan đến summary
              try {
                // Kiểm tra PlayerMatchSummary
                const matchSummaries = await prisma.playerMatchSummary.findMany({
                  where: { tournamentId: result.tournamentId }
                });

                logger.info(`Tournament ${result.tournamentId} has ${matchSummaries.length} match summaries.`);

                // Kiểm tra nếu không có match summary, có thể cần tạo từ MatchResult
                if (matchSummaries.length === 0) {
                  logger.warn(`No match summaries found for tournament ${result.tournamentId}. Will try to create from match results.`);

                  // Lấy tất cả round trong tournament
                  const rounds = await prisma.round.findMany({
                    where: {
                      phase: { tournamentId: result.tournamentId }
                    },
                    include: {
                      lobbies: {
                        include: {
                          matches: {
                            include: {
                              matchResults: true
                            }
                          }
                        }
                      }
                    }
                  });

                  // Tạo match summaries từ match results
                  for (const round of rounds) {
                    for (const lobby of round.lobbies) {
                      for (const match of lobby.matches) {
                        if (match.matchResults && match.matchResults.length > 0) {
                          await SummaryManagerService.createMatchSummaries(match.id, match.matchResults);
                        }
                      }
                    }
                  }
                }
              } catch (checkError) {
                logger.error(`Error checking summary tables: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
              }
            }

            // Lấy danh sách người chơi để cập nhật thống kê
            const participants = await prisma.participant.findMany({
              where: { tournamentId: result.tournamentId }
            });

            // Xử lý người chơi theo batch để tối ưu
            logger.info(`Processing stats for ${participants.length} players in batches`);
            const batchSize = 10;
            for (let i = 0; i < participants.length; i += batchSize) {
              const batch = participants.slice(i, i + batchSize);
              const promises = batch.map(p => {
                return SummaryManagerService.updatePlayerStats(p.userId)
                  .catch(err => {
                    const playerError = err instanceof Error ? err : new Error(String(err));
                    logger.error(`Error updating stats for player ${p.userId}: ${playerError.message}`);
                  });
              });
              await Promise.all(promises);
              logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(participants.length / batchSize)}`);
            }

            logger.info(`Async post-transaction processing completed for tournament ${result.tournamentId}`);
          } catch (error) {
            const processError = error instanceof Error ? error : new Error(String(error));
            logger.error(`Error in async summary processing: ${processError.message}`, processError);

            // Fallback: đảm bảo ít nhất thêm vào queue
            try {
              await SummaryManagerService.queueTournamentSummary(result.tournamentId);
              logger.info(`Fallback: Added tournament ${result.tournamentId} to summary queue after error`);
            } catch (queueError) {
              const fallbackError = queueError instanceof Error ? queueError : new Error(String(queueError));
              logger.error(`Failed to add to queue as fallback: ${fallbackError.message}`);
            }
          }
        }, 0);
      }

      return result; // Return the original result of the transaction

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`AutoAdvanceRoundWorker: Job for round ${roundId} failed with error: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw error; // Re-throw to ensure BullMQ marks the job as failed
    }
  }

  private static async _applyAdvancementCondition(tx: Prisma.TransactionClient, round: any, phase: any) {
    logger.debug(`[Advancement] Applying condition for Round ${round.roundNumber} in Phase ${phase.phaseNumber}`);

    let jobsToQueue: any[] = []; // Initialize jobsToQueue here

    // Handle advancement based on phase type (for single-round advancement or specific conditions like checkmate)
    if (phase.advancementCondition) {
      switch (phase.advancementCondition.type) {
        case 'placement':
          if (phase.advancementCondition.value) {
            logger.debug(`[Advancement] Applying placement-based advancement for Phase ${phase.phaseNumber}.`);
            await this._advanceByPlacement(tx, round, phase.advancementCondition.value, phase.id);
          }
          return { continue: true, jobsToQueue: [] }; // Allows the parent autoAdvance to continue
        case 'top_n_scores':
          if (phase.advancementCondition.value) {
            logger.debug(`[Advancement] Applying top_n_scores advancement for Phase ${phase.phaseNumber}.`);
            await this._advanceTopNPlayers(tx, round, phase.advancementCondition.value, phase.id);
          }
          return { continue: true, jobsToQueue: [] }; // Allows the parent autoAdvance to continue
        case 'checkmate':
          const checkmateResult = await this._advanceCheckmate(tx, round, phase); // Call the new extracted function
          // Assign jobs to the outer scope variable `jobsToQueue` in autoAdvance
          jobsToQueue.push(...checkmateResult.jobsToQueue);
          return { continue: checkmateResult.continue, jobsToQueue: jobsToQueue }; // Ensure jobsToQueue is returned
        case 'tiered_advancement':
          interface RoundAdvancementDetail { round: number; advances: number; }
          const advancementDetails = phase.advancementCondition.details as RoundAdvancementDetail[];
          if (advancementDetails && advancementDetails.length > 0) {
            const roundDetail = advancementDetails.find(d => d.round === round.roundNumber);
            if (roundDetail && roundDetail.advances) {
              const numberOfPlayersToAdvance = roundDetail.advances;
              logger.debug(`[Advancement] Using tiered advancement for Round ${round.roundNumber}. Advancing top ${numberOfPlayersToAdvance} players.`);
              await this._advanceTopNPlayers(tx, round, numberOfPlayersToAdvance);
            }
          }
          return { continue: true, jobsToQueue: [] }; // Allows the parent autoAdvance to continue
        default:
          logger.warn(`[Advancement] Unknown advancement condition type: ${phase.advancementCondition.type}. No specific logic applied.`);
          return { continue: true, jobsToQueue: [] }; // Default to allow continuation
      }
    }
    logger.debug(`[Advancement] Advancement logic applied for Round ${round.roundNumber} in Phase ${phase.phaseNumber}.`)
    return { continue: true, jobsToQueue: [] }; // Default return if no specific condition met
  }

  private static async _advanceCheckmate(tx: Prisma.TransactionClient, round: any, phase: any): Promise<{ continue: boolean; jobsToQueue: any[] }> {
    logger.debug(`[Advancement] Applying Checkmate condition for Phase ${phase.phaseNumber}.`);

    let jobsToQueue: any[] = [];

    // Set a reasonable default for pointsToActivate if it's missing or too high (> 20)
    const configuredPoints = phase.advancementCondition.pointsToActivate;
    const pointsToActivate = configuredPoints;
    // Lấy maxRounds từ cấu hình thay vì cố định giá trị
    const maxRounds = phase.advancementCondition.maxRounds || phase.numberOfRounds || 3;
    logger.debug(`[Advancement] Checkmate phase configured with maxRounds=${maxRounds}, pointsToActivate=${pointsToActivate}`);
    logger.debug(`[Advancement] Derived pointsToActivate for round ${round.id}: ${pointsToActivate}`);

    // Fetch all active participants and their current total scores
    const currentParticipants = await tx.participant.findMany({
      where: { tournamentId: round.phase.tournamentId, eliminated: false },
      orderBy: { scoreTotal: 'desc' },
      include: {
        roundOutcomes: {
          include: {
            round: true
          }
        }
      }
    });

    if (currentParticipants.length === 0) {
      logger.warn(`[Advancement] No active participants found in Checkmate phase ${phase.phaseNumber}. Forcing completion.`);
      return { continue: true, jobsToQueue: [] };
    }

    // Log chi tiết điểm của các người chơi hàng đầu để debug
    if (currentParticipants.length > 0) {
      const topPlayers = currentParticipants.slice(0, Math.min(3, currentParticipants.length));
      logger.debug(`[Advancement] Top players in Checkmate phase ${phase.phaseNumber}, Round ${round.roundNumber}: ${topPlayers.map(p => {
        const latestOutcome = p.roundOutcomes.find(ro => ro.roundId === round.id);
        return `${p.userId} (scoreInRound: ${latestOutcome?.scoreInRound || 0}, scoreTotal: ${p.scoreTotal})`;
      }).join(', ')
        }`);
      logger.debug(`[Advancement] Required score to win: ${pointsToActivate}`);
    }

    let winnerFound = false;
    for (const participant of currentParticipants) {
      const latestRoundOutcome = participant.roundOutcomes.find(ro => ro.roundId === round.id);

      if (!latestRoundOutcome) {
        logger.debug(`[Advancement] Player ${participant.userId} has no round outcome for round ${round.id}. Skipping.`);
        continue;
      }

      // Kiểm tra xem người chơi có đạt top 1 trong trận đấu gần nhất không
      // Lấy kết quả trận đấu gần nhất của người chơi trong round hiện tại
      const isTop1InLatestMatch = await tx.matchResult.findFirst({
        where: {
          userId: participant.userId,
          match: {
            lobby: {
              roundId: round.id
            }
          },
          placement: 1 // Check for placement 1 directly in the query
        },
        orderBy: {
          id: 'desc'
        },
        take: 1
      }).then(result => !!result); // Convert result to boolean

      // Debug log cho kết quả trận đấu
      logger.debug(`[Advancement] Player ${participant.userId} (Round ${round.id}): scoreInRound = ${latestRoundOutcome.scoreInRound}, isTop1InLatestMatch = ${isTop1InLatestMatch}, pointsToActivate = ${pointsToActivate}`);

      // Kiểm tra cả hai điều kiện: top 1 trong trận đấu gần nhất VÀ đủ điểm trong vòng hiện tại
      if (isTop1InLatestMatch && latestRoundOutcome.scoreInRound >= pointsToActivate) {
        logger.info(`[Advancement] Checkmate winner found: ${participant.userId} with scoreInRound ${latestRoundOutcome.scoreInRound} >= ${pointsToActivate} AND placement = 1 in latest match.`);
        winnerFound = true;
        break;
      }
    }

    // Refactored logic to handle round completion based on winnerFound and maxRounds
    if (winnerFound) {
      logger.debug(`[Advancement] Checkmate winner found. Round ${round.id} advancement logic complete.`);
      // Mark the round and phase as completed when a winner is found
      await tx.round.update({
        where: { id: round.id },
        data: { status: 'completed', endTime: new Date() }
      });
      await tx.phase.update({
        where: { id: round.phaseId },
        data: { status: 'completed' }
      });
      return { continue: true, jobsToQueue: [] };
    } else if (round.roundNumber >= maxRounds) {
      logger.info(`[Advancement] Max rounds (${maxRounds}) reached and no Checkmate winner found. Completing phase without winner.`);
      // No winner found and max rounds reached, complete the round/phase without declaring a specific winner based on checkmate conditions.
      await tx.round.update({
        where: { id: round.id },
        data: { status: 'completed', endTime: new Date() }
      });
      await tx.phase.update({
        where: { id: round.phaseId },
        data: { status: 'completed' }
      });
      return { continue: true, jobsToQueue: [] };
    } else {
      logger.debug(`[Advancement] No Checkmate winner found in Round ${round.id} (${round.roundNumber}/${maxRounds}). Creating new match for next attempt.`);
      logger.debug(`[Advancement] Current round number: ${round.roundNumber}, Max rounds: ${maxRounds}`);

      // Hiển thị chi tiết lý do không tìm thấy người thắng
      logger.info(`[Advancement] Checkmate conditions: Player must have placement=1 in latest match AND scoreInRound >= ${pointsToActivate}`);

      // Hiển thị thông tin người chơi có điểm cao nhất
      if (currentParticipants.length > 0) {
        const topPlayer = currentParticipants[0]; // Assuming currentParticipants is sorted by scoreTotal
        const topPlayerOutcome = topPlayer.roundOutcomes.find(ro => ro.roundId === round.id);

        logger.debug(`[Advancement] Top scoring participant (by scoreTotal): ${topPlayer.userId}`);
        if (topPlayerOutcome) {
          logger.debug(`[Advancement] Top player's scoreInRound for this round: ${topPlayerOutcome.scoreInRound}, needs ${pointsToActivate}`);
          const hasEnoughPoints = topPlayerOutcome.scoreInRound >= pointsToActivate;
          logger.debug(`[Advancement] Top player has enough points (${hasEnoughPoints})`);
        } else {
          logger.warn(`[Advancement] Top scoring participant has no round outcome for this round.`);
        }

        // Kiểm tra kết quả trận đấu gần nhất của người chơi điểm cao nhất
        const topPlayerLatestMatch = await tx.matchResult.findFirst({
          where: {
            userId: topPlayer.userId,
            match: {
              lobby: {
                roundId: round.id
              }
            }
          },
          orderBy: {
            id: 'desc'
          },
          include: {
            match: true
          }
        });

        if (topPlayerLatestMatch) {
          logger.debug(`[Advancement] Top scoring player's latest match placement: ${topPlayerLatestMatch.placement}`);

          // Giải thích lý do không thắng
          const hasEnoughPoints = topPlayerOutcome ? topPlayerOutcome.scoreInRound >= pointsToActivate : false;
          const hasTop1Placement = topPlayerLatestMatch.placement === 1;

          if (!hasEnoughPoints && !hasTop1Placement) {
            logger.info(`[Advancement] Top player doesn't meet either condition: needs more scoreInRound AND top 1 placement`);
          } else if (!hasEnoughPoints) {
            logger.info(`[Advancement] Top player has placement 1 but needs more scoreInRound: ${topPlayerOutcome?.scoreInRound || 0}/${pointsToActivate}`);
          } else if (!hasTop1Placement) {
            logger.info(`[Advancement] Top player has enough scoreInRound but placement is ${topPlayerLatestMatch.placement}, needs 1`);
          }
        } else {
          logger.warn(`[Advancement] Top scoring player has no match results in this round`);
        }
      }

      const currentPhase = await tx.phase.findUnique({
        where: { id: round.phaseId },
        include: { rounds: true }
      });
      if (currentPhase) {
        // Instead of creating a new round, we need to create a new match within the existing lobby
        // and then return a job to fetch data for that match.
        const lobby = await tx.lobby.findFirst({
          where: { roundId: round.id },
          // Order by creation to consistently pick one if multiple exist (though ideally 1 per checkmate round)
          orderBy: { id: 'asc' }
        });

        if (lobby) {
          logger.debug(`[Advancement] Found lobby ${lobby.id} for new match creation.`);
          const newRiotMatchId = 'mock_riot_match_id_' + crypto.randomUUID();
          const newMatch = await tx.match.create({
            data: {
              matchIdRiotApi: newRiotMatchId,
              lobbyId: lobby.id,
            },
          });

          jobsToQueue.push({
            name: 'fetchMatchData',
            data: {
              matchId: newMatch.id
            },
          });
          logger.info(`[Advancement] No winner found. New match ${newMatch.id} created and queued for Checkmate phase. (Lobby: ${lobby.id})`);
        } else {
          logger.error(`[Advancement] No lobby found for round ${round.id}. Cannot create new match.`);
        }
      } else {
        logger.error(`[Advancement] Current phase not found for round ${round.id}. Cannot create new match.`);
      }
      return { continue: false, jobsToQueue };
    }
  }

  private static async _calculateScoresForRound(tx: Prisma.TransactionClient, roundId: string): Promise<Map<string, number>> {
    // Single SQL aggregate — replaces O(n×m) iteration over lobbies→matches→results
    const scores = await tx.$queryRaw<{ userId: string; total: number }[]>`
      SELECT mr."userId", COALESCE(SUM(mr."points"), 0)::int as total
      FROM "MatchResult" mr
      JOIN "Match" m ON m.id = mr."matchId"
      JOIN "Lobby" l ON l.id = m."lobbyId"
      WHERE l."roundId" = ${roundId}
      GROUP BY mr."userId"
    `;

    const scoreMap = new Map<string, number>();
    for (const row of scores) {
      scoreMap.set(row.userId, Number(row.total) || 0);
    }

    logger.debug(`[Scoring] Round ${roundId}: ${scoreMap.size} players scored via SQL aggregate`);
    return scoreMap;
  }

  private static async _updateParticipantTotalScores(tx: Prisma.TransactionClient, tournamentId: string, currentRoundId: string) {
    logger.debug(`[Scores] Starting _updateParticipantTotalScores for Tournament ${tournamentId}, Round ${currentRoundId}`);

    const roundOutcomes = await tx.roundOutcome.findMany({
      where: { roundId: currentRoundId },
      select: {
        participantId: true,
        scoreInRound: true,
      },
    });

    const participantScores = new Map<string, number>();
    for (const outcome of roundOutcomes) {
      const currentScore = participantScores.get(outcome.participantId) || 0;
      participantScores.set(outcome.participantId, currentScore + (outcome.scoreInRound || 0));
    }

    // Fetch existing participants to update their scoreTotal
    const participantsToUpdate = await tx.participant.findMany({
      where: {
        tournamentId: tournamentId,
        id: {
          in: Array.from(participantScores.keys())
        }
      },
      select: {
        id: true,
        scoreTotal: true,
      }
    });

    // ── BULK UPDATE: Batched Prisma updates (parameterized, transaction-safe) ──
    if (participantsToUpdate.length > 0) {
      await Promise.all(
        participantsToUpdate.map(p => {
          const newScoreInRound = participantScores.get(p.id) || 0;
          const newTotalScore = (p.scoreTotal || 0) + newScoreInRound;
          logger.debug(`[Scores] Participant ${p.id}: current=${p.scoreTotal || 0}, roundDelta=+${newScoreInRound}, new=${newTotalScore}`);
          return tx.participant.update({
            where: { id: p.id },
            data: { scoreTotal: newTotalScore },
          });
        })
      );
      logger.debug(`[Scores] Batch-updated scoreTotal for ${participantsToUpdate.length} participants.`);
    }
    logger.debug(`[Scores] Finished _updateParticipantTotalScores.`);
  }

  /**
   * Shared tie-break comparator for all advancement modes (elimination, swiss, top_n_scores).
   * Sort order (all criteria preserved consistently):
   *   1. Total points            → descending (higher = better)
   *   2. Sum of placements       → ascending  (lower avg placement = better)
   *   3. Count of 1st-place wins → descending (more wins = better)
   *   4. Best single placement   → ascending  (lower = better)
   *   5. userId string           → ascending  (deterministic final fallback)
   */
  public static tiebreakComparator(
    a: { score: number; placements: number[]; userId: string },
    b: { score: number; placements: number[]; userId: string },
  ): number {
    // 1. Total score
    if (b.score !== a.score) return b.score - a.score;
    // 2. Sum of placements (lower is better: 1st+1st=2 beats 2nd+3rd=5)
    const sumA = a.placements.reduce((s, p) => s + (Number(p) || 0), 0);
    const sumB = b.placements.reduce((s, p) => s + (Number(p) || 0), 0);
    if (sumA !== sumB) return sumA - sumB;
    // 3. Count of 1st-place finishes
    const wins1A = a.placements.filter(p => Number(p) === 1).length;
    const wins1B = b.placements.filter(p => Number(p) === 1).length;
    if (wins1B !== wins1A) return wins1B - wins1A;
    // 4. Best (lowest) single placement
    const bestA = a.placements.length > 0 ? Math.min(...a.placements.map(p => Number(p) || 999)) : 999;
    const bestB = b.placements.length > 0 ? Math.min(...b.placements.map(p => Number(p) || 999)) : 999;
    if (bestA !== bestB) return bestA - bestB;
    // 5. Deterministic string fallback (prevents sort instability between runs)
    return String(a.userId).localeCompare(String(b.userId));
  }

  private static async _advanceByPlacement(tx: Prisma.TransactionClient, round: any, topNPerLobby: number, phaseId?: string) {

    const scopeLabel = phaseId ? `phase ${phaseId}` : `round ${round.id}`;
    logger.debug(`[Advancement] Starting per-lobby top-${topNPerLobby} advancement for ${scopeLabel}`);

    // Fetch all lobbies — either for the whole phase (parallel groups) or just this round
    const lobbies = await tx.lobby.findMany({
      where: phaseId
        ? { round: { phaseId } }  // All groups in the phase
        : { roundId: round.id },  // Single round only
      include: {
        matches: {
          include: { matchResults: true }
        }
      }
    });

    if (lobbies.length === 0) {
      logger.warn(`[Advancement] No lobbies found for ${scopeLabel}. Skipping.`);
      return;
    }

    // Collect sets of advanced vs eliminated userIds — processed per lobby so top-N is per lobby
    const advancedUserIds = new Set<string>();
    const eliminatedUserIds = new Set<string>();

    for (const lobby of lobbies) {
      const lobbyParticipantIds = lobby.participants as string[];
      if (!Array.isArray(lobbyParticipantIds) || lobbyParticipantIds.length === 0) continue;

      // Build a score map AND placement history for this lobby (for tiebreak)
      const lobbyScoreMap = new Map<string, number>();
      const lobbyPlacementsMap = new Map<string, number[]>(); // userId → [p1, p2, p3...]
      for (const match of lobby.matches) {
        for (const result of match.matchResults) {
          const prev = lobbyScoreMap.get(result.userId) || 0;
          lobbyScoreMap.set(result.userId, prev + (result.points || 0));
          const prevPlacements = lobbyPlacementsMap.get(result.userId) || [];
          lobbyPlacementsMap.set(result.userId, [...prevPlacements, result.placement]);
        }
      }

      // Sort with shared 4-level tie-break (Points→SumPlacements→1stCount→BestPlacement→userId)
      const lobbyRanked = lobbyParticipantIds
        .map(uid => ({
          userId: uid,
          score: lobbyScoreMap.get(uid) || 0,
          placements: lobbyPlacementsMap.get(uid) || [],
        }))
        .sort(RoundService.tiebreakComparator);

      logger.debug(`[Advancement] Lobby ${lobby.id} ranking (top ${topNPerLobby} advance): ${lobbyRanked.map((p, i) => `#${i + 1} ${p.userId}(${p.score}pts placements:[${p.placements}])`).join(', ')}`);

      // Top-N advance, rest are eliminated
      lobbyRanked.forEach((player, index) => {
        if (index < topNPerLobby) {
          advancedUserIds.add(player.userId);
        } else {
          eliminatedUserIds.add(player.userId);
        }
      });
    }

    logger.info(`[Advancement] Round ${round.id}: ${advancedUserIds.size} will advance (top ${topNPerLobby}/lobby), ${eliminatedUserIds.size} will be eliminated`);

    // Fetch participant records for everyone in this round
    const allUserIds = [...advancedUserIds, ...eliminatedUserIds];
    const participantsInRound = await tx.participant.findMany({
      where: {
        userId: { in: allUserIds },
        tournamentId: round.phase.tournamentId,
      },
    });

    // Calculate score map for roundOutcome records
    const scoreMap = await this._calculateScoresForRound(tx, round.id);

    // Apply advancement / elimination
    for (const participant of participantsInRound) {
      const status: 'advanced' | 'eliminated' = advancedUserIds.has(participant.userId) ? 'advanced' : 'eliminated';
      const scoreInRound = scoreMap.get(participant.userId) || 0;

      await tx.roundOutcome.upsert({
        where: { participantId_roundId: { participantId: participant.id, roundId: round.id } },
        update: { scoreInRound, status },
        create: { participantId: participant.id, roundId: round.id, scoreInRound, status },
      });

      if (status === 'eliminated') {
        await tx.participant.update({
          where: { id: participant.id },
          data: { eliminated: true },
        });
        logger.info(`[Advancement] Eliminated participant ${participant.id} (User ${participant.userId}) — placed outside top ${topNPerLobby} in their lobby.`);
      } else {
        logger.info(`[Advancement] Advanced participant ${participant.id} (User ${participant.userId}) — top ${topNPerLobby} in their lobby.`);
      }
    }

    const advancedCount = await tx.roundOutcome.count({ where: { roundId: round.id, status: 'advanced' } });
    const eliminatedCount = await tx.roundOutcome.count({ where: { roundId: round.id, status: 'eliminated' } });
    logger.info(`[Advancement] Round ${round.id} complete: ${advancedCount} advanced, ${eliminatedCount} eliminated.`);
  }

  /**
   * Per-lobby immediate elimination for placement mode.
   * Called from checkAndAdvanceRound BEFORE all lobbies are done — processes each
   * completed lobby independently so eliminated players are marked right away.
   * Idempotent: skips lobbies that already have RoundOutcome records.
   */
  static async eliminateCompletedLobbies(roundId: string, topNPerLobby: number, tournamentId: string) {
    const completedLobbies = await prisma.lobby.findMany({
      where: { roundId, fetchedResult: true },
      include: { matches: { include: { matchResults: true } } }
    });

    if (completedLobbies.length === 0) return;

    for (const lobby of completedLobbies) {
      const lobbyParticipantIds = lobby.participants as string[];
      if (!Array.isArray(lobbyParticipantIds) || lobbyParticipantIds.length === 0) continue;

      // Skip if already processed — check for existing RoundOutcome records for any player in this lobby
      const existingOutcome = await prisma.roundOutcome.findFirst({
        where: {
          roundId,
          participant: { userId: { in: lobbyParticipantIds }, tournamentId }
        }
      });
      if (existingOutcome) {
        logger.debug(`[Placement/Immediate] Lobby ${lobby.id} already processed. Skipping.`);
        continue;
      }

      // Build score map and placement history from match results
      const scoreMap = new Map<string, number>();
      const placementsMap = new Map<string, number[]>();
      for (const match of lobby.matches) {
        for (const result of match.matchResults) {
          scoreMap.set(result.userId, (scoreMap.get(result.userId) || 0) + (result.points || 0));
          placementsMap.set(result.userId, [...(placementsMap.get(result.userId) || []), result.placement]);
        }
      }

      // Sort with shared 4-level tie-break
      const ranked = lobbyParticipantIds
        .map(uid => ({
          userId: uid,
          score: scoreMap.get(uid) || 0,
          placements: placementsMap.get(uid) || [],
        }))
        .sort(RoundService.tiebreakComparator);

      logger.info(`[Placement/Immediate] Lobby ${lobby.id}: Ranking ${ranked.length} players (top ${topNPerLobby} advance)`);
      logger.debug(`[Placement/Immediate] Lobby ${lobby.id} ranking: ${ranked.map((p, i) => `#${i + 1} ${p.userId}(${p.score}pts)`).join(', ')}`);

      const advancedUserIds = new Set(ranked.slice(0, topNPerLobby).map(p => p.userId));
      const participants = await prisma.participant.findMany({
        where: { userId: { in: lobbyParticipantIds }, tournamentId }
      });

      let advancedCount = 0;
      let eliminatedCount = 0;

      for (const participant of participants) {
        const status: 'advanced' | 'eliminated' = advancedUserIds.has(participant.userId) ? 'advanced' : 'eliminated';
        const scoreInRound = scoreMap.get(participant.userId) || 0;

        await prisma.roundOutcome.upsert({
          where: { participantId_roundId: { participantId: participant.id, roundId } },
          update: { scoreInRound, status },
          create: { participantId: participant.id, roundId, scoreInRound, status },
        });

        if (status === 'eliminated') {
          await prisma.participant.update({
            where: { id: participant.id },
            data: { eliminated: true },
          });
          eliminatedCount++;
          logger.info(`[Placement/Immediate] Eliminated ${participant.userId} from lobby ${lobby.id}`);
        } else {
          advancedCount++;
        }
      }

      logger.info(`[Placement/Immediate] Lobby ${lobby.id} done: ${advancedCount} advanced, ${eliminatedCount} eliminated`);

      // Emit real-time update so frontend refreshes immediately
      if ((global as any).io) {
        (global as any).io.to(`tournament:${tournamentId}`).emit('tournament_update', { type: 'lobby_eliminated', lobbyId: lobby.id });
        await bracketCache.invalidate(tournamentId);
        (global as any).io.to(`tournament:${tournamentId}`).emit('bracket_update', { tournamentId });
      }
    }
  }

  private static async _advanceTopNPlayers(tx: Prisma.TransactionClient, round: any, topN: number, phaseId?: string) {
    const scopeLabel = phaseId ? `phase ${phaseId}` : `round ${round.id}`;
    logger.debug(`[Advancement Logic] Advancing top ${topN} players for ${scopeLabel}`);

    // Gather all participant user IDs from ALL lobbies in the phase (or just this round)
    const lobbies = await tx.lobby.findMany({
      where: phaseId
        ? { round: { phaseId } }   // All groups in phase
        : { roundId: round.id },   // Single round
      select: { participants: true }
    });

    const participantUserIds = new Set<string>();
    lobbies.forEach(lobby => {
      const lobbyParticipants = lobby.participants as string[];
      if (Array.isArray(lobbyParticipants)) {
        lobbyParticipants.forEach(userId => participantUserIds.add(userId));
      }
    });

    logger.debug(`[Advancement Logic] Found ${participantUserIds.size} participants in ${scopeLabel}`);

    if (participantUserIds.size === 0) {
      logger.warn(`[Advancement Logic] No participants found in ${scopeLabel}. Skipping advancement.`);
      return;
    }

    // Fetch participant records (not eliminated)
    const participants = await tx.participant.findMany({
      where: {
        tournamentId: round.phase.tournamentId,
        userId: { in: Array.from(participantUserIds) },
        eliminated: false
      }
    });

    if (participants.length === 0) {
      logger.warn(`[Advancement Logic] No active participants found. Skipping.`);
      return;
    }

    // For cross-phase ranking, use scoreTotal + placement history for full tie-break
    let sortedParticipants: (typeof participants[number] & { score: number; placements: number[] })[];
    if (phaseId) {
      // Cross-group: load placement history from ALL lobbies in this phase for each player
      const phaseMatchResults = await tx.matchResult.findMany({
        where: { match: { lobby: { round: { phaseId } } } },
        select: { userId: true, placement: true },
      });
      const phasePlacementsMap = new Map<string, number[]>();
      for (const r of phaseMatchResults) {
        const arr = phasePlacementsMap.get(r.userId) || [];
        arr.push(r.placement);
        phasePlacementsMap.set(r.userId, arr);
      }
      sortedParticipants = participants
        .map(p => ({ ...p, score: p.scoreTotal || 0, placements: phasePlacementsMap.get(p.userId) || [] }))
        .sort(RoundService.tiebreakComparator);
    } else {
      const scoresInRound = await this._calculateScoresForRound(tx, round.id);
      // Load per-round placement history for tie-break
      const roundMatchResults = await tx.matchResult.findMany({
        where: { match: { lobby: { roundId: round.id } } },
        select: { userId: true, placement: true },
      });
      const roundPlacementsMap = new Map<string, number[]>();
      for (const r of roundMatchResults) {
        const arr = roundPlacementsMap.get(r.userId) || [];
        arr.push(r.placement);
        roundPlacementsMap.set(r.userId, arr);
      }
      sortedParticipants = participants
        .map(p => ({ ...p, score: scoresInRound.get(p.userId) || 0, placements: roundPlacementsMap.get(p.userId) || [] }))
        .sort(RoundService.tiebreakComparator);
    }

    logger.debug(`[Advancement Logic] Ranking (${scopeLabel}, top ${topN} advance): ${sortedParticipants.map((p, i) => `#${i + 1} ${p.userId}(${p.score}pts placements:[${p.placements}])`).join(', ')}`);

    // Guard: if fewer or equal participants than topN, advance all
    if (sortedParticipants.length <= topN) {
      logger.info(`[Advancement Logic] Only ${sortedParticipants.length} participants, which is <= ${topN} required. Not eliminating any.`);
      for (const p of sortedParticipants) {
        await tx.roundOutcome.upsert({
          where: { participantId_roundId: { participantId: p.id, roundId: round.id } },
          update: { status: 'advanced', scoreInRound: p.score },
          create: { participantId: p.id, roundId: round.id, status: 'advanced', scoreInRound: p.score },
        });
      }
      return;
    }

    const playersToAdvance = sortedParticipants.slice(0, topN);
    const playersToEliminate = sortedParticipants.slice(topN);
    const playerIdsToEliminate = playersToEliminate.map(p => p.id);

    logger.info(`[Advancement Logic] ${scopeLabel}: ${playersToAdvance.length} advance, ${playersToEliminate.length} eliminated`);

    // Upsert RoundOutcomes
    for (const p of sortedParticipants) {
      const isEliminated = playerIdsToEliminate.includes(p.id);
      await tx.roundOutcome.upsert({
        where: { participantId_roundId: { participantId: p.id, roundId: round.id } },
        update: { status: isEliminated ? 'eliminated' : 'advanced', scoreInRound: p.score },
        create: { participantId: p.id, roundId: round.id, status: isEliminated ? 'eliminated' : 'advanced', scoreInRound: p.score },
      });
    }

    // Mark eliminated in DB
    if (playerIdsToEliminate.length > 0) {
      await tx.participant.updateMany({
        where: { id: { in: playerIdsToEliminate } },
        data: { eliminated: true },
      });
      logger.info(`[Advancement Logic] Eliminated ${playerIdsToEliminate.length} participants.`);
    }
  }
  static async payoutPrizes(tx: Prisma.TransactionClient, tournamentId: string, winners?: any[]) {
    if (!winners || winners.length === 0) {
      const participants = await tx.participant.findMany({ where: { tournamentId } });
      const phaseMatchResults = await tx.matchResult.findMany({
        where: { match: { lobby: { round: { phase: { tournamentId } } } } },
        select: { userId: true, placement: true },
      });
      const phasePlacementsMap = new Map<string, number[]>();
      for (const r of phaseMatchResults) {
        const arr = phasePlacementsMap.get(r.userId) || [];
        arr.push(r.placement);
        phasePlacementsMap.set(r.userId, arr);
      }
      
      winners = participants
        .map(p => ({ ...p, score: p.scoreTotal || 0, placements: phasePlacementsMap.get(p.userId) || [] }))
        .sort(RoundService.tiebreakComparator);
    }

    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        escrow: true,
        _count: {
          select: { participants: true }
        }
      }
    });

    if (!tournament) {
      logger.warn(`Tournament ${tournamentId} has no prize structure to pay out.`);
      return;
    }

    const participantCount = tournament._count.participants;
    const totalPot = participantCount * tournament.entryFee;
    const computedPrizePool = totalPot * (1 - (tournament.hostFeePercent || 0));

    let prizePool = computedPrizePool;
    if (!tournament.isCommunityMode && tournament.escrow) {
      if (tournament.escrow.fundedAmount > computedPrizePool) {
        prizePool = tournament.escrow.fundedAmount;
      } else if (tournament.escrow.fundedAmount > 0) {
        prizePool = Math.max(computedPrizePool, tournament.escrow.fundedAmount);
      }
    }

    logger.debug(`Calculating prizes for tournament ${tournamentId}. Total pot: ${totalPot}, Prize pool: ${prizePool}`);

    const customStructure = tournament.prizeStructure;
    const hasCustomStructure = customStructure && (
      (Array.isArray(customStructure) && customStructure.length > 0) ||
      (typeof customStructure === 'object' && !Array.isArray(customStructure) && Object.keys(customStructure as object).length > 0)
    );

    const structureToUse = hasCustomStructure
      ? customStructure
      : PrizeCalculationService.getDynamicPrizeDistribution(participantCount);

    // Use the PrizeCalculationService to get the optimized distribution
    const prizeDistribution = PrizeCalculationService.getFinalPrizeDistribution(winners, structureToUse as any, prizePool);
    logger.info(`Prize distribution calculated with ${prizeDistribution.length} winners`);

    // Process each winner and create reward records
    for (const prize of prizeDistribution) {
      // Guard against double payout
      const participantRecord = winners.find(w => w.id === prize.participantId);
      if (participantRecord?.rewarded) {
        logger.info(`Participant ${prize.participantId} is already rewarded, skipping duplicate payout validation.`);
        continue;
      }

      const existingRewardCount = await tx.reward.count({
        where: { participantId: prize.participantId, tournamentId: tournamentId }
      });

      if (existingRewardCount > 0) {
        logger.info(`Participant ${prize.participantId} already has a reward for tournament ${tournamentId}. Skipping.`);
        continue;
      }

      logger.debug(`Payout: Participant ${prize.participantId} (Rank ${prize.rank}) receives ${prize.amount} from the prize pool.`);

      // Create a Reward record in the database
      await tx.reward.create({
        data: {
          participantId: prize.participantId,
          tournamentId: tournamentId,
          amount: prize.amount,
          status: 'completed', // Or 'pending' if there's a manual approval step
          sentAt: new Date(),
        },
      });

      // Mark participant as rewarded
      await tx.participant.update({
        where: { id: prize.participantId },
        data: { rewarded: true },
      });
    }

    // Đảm bảo tất cả rounds, lobbies và roundOutcomes đều được đánh dấu completed khi tournament kết thúc
    await this._ensureAllResourcesCompleted(tx, tournamentId);

    logger.info(`Paid out prizes for tournament ${tournamentId} to ${prizeDistribution.length} winners`);
  }

  // Batch-optimized: ensures all rounds, lobbies and roundOutcomes are marked completed
  private static async _ensureAllResourcesCompleted(tx: Prisma.TransactionClient, tournamentId: string) {
    logger.info(`Ensuring all resources are marked as completed for tournament ${tournamentId}`);

    // Batch 1: Mark all phases as completed
    const phasesUpdated = await tx.phase.updateMany({
      where: { tournamentId, status: { not: 'completed' } },
      data: { status: 'completed' },
    });

    // Batch 2: Mark all rounds as completed
    const roundsUpdated = await tx.round.updateMany({
      where: { phase: { tournamentId }, status: { not: 'completed' } },
      data: { status: 'completed', endTime: new Date() },
    });

    // Batch 3: Mark all lobbies as fetched
    const lobbiesUpdated = await tx.lobby.updateMany({
      where: { round: { phase: { tournamentId } }, fetchedResult: false },
      data: { fetchedResult: true },
    });

    // Batch 4: Update pending roundOutcomes based on participant.eliminated status
    await tx.$executeRaw`
      UPDATE "RoundOutcome" ro
      SET status = CASE
        WHEN p.eliminated = true THEN 'eliminated'
        ELSE 'advanced'
      END
      FROM "Participant" p
      WHERE ro."participantId" = p.id
        AND p."tournamentId" = ${tournamentId}
        AND ro.status NOT IN ('advanced', 'eliminated')
    `;

    logger.info(`All resources batch-updated: ${phasesUpdated.count} phases, ${roundsUpdated.count} rounds, ${lobbiesUpdated.count} lobbies`);
  }

  static async getResults(roundId: string) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        lobbies: {
          include: {
            matches: {
              include: {
                matchResults: true,
              }
            }
          }
        },
        phase: {
          include: {
            tournament: true
          }
        }
      }
    });

    if (!round) {
      throw new ApiError(404, 'Round not found');
    }

    // Collect all match results from all lobbies
    const matchResults = round.lobbies.flatMap(lobby => lobby.matches.flatMap(match => match.matchResults));

    // Collect all participant user IDs from all lobbies
    const userIds = new Set<string>();
    round.lobbies.forEach(lobby => {
      const lobbyParticipants = lobby.participants as string[]; // Assuming participants is an array of user IDs
      if (Array.isArray(lobbyParticipants)) {
        lobbyParticipants.forEach(userId => userIds.add(userId));
      }
    });

    // Fetch all required participant details in a single query
    const participantsDetails = await prisma.participant.findMany({
      where: {
        tournamentId: round.phase.tournamentId,
        userId: { in: Array.from(userIds) },
      },
      include: {
        user: true, // Include the user data
      },
    });

    // Create a quick-access map for participant details
    const participantsMap = new Map(participantsDetails.map(p => [p.userId, p]));

    // Create the result object
    const results = {
      ...round,
      matchResults: matchResults.map(result => ({
        ...result,
        participant: participantsMap.get(result.userId)
      })),
      participants: participantsDetails,
    };

    // Remove heavy nested data that is now flattened
    delete (results as any).phase.tournament;
    results.lobbies.forEach(lobby => {
      delete (lobby as any).matches;
    });

    return results;
  }
}
