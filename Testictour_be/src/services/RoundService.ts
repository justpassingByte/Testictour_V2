import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import LobbyService from './LobbyService';
import logger from '../utils/logger';
import { Prisma, Participant } from '@prisma/client';

import { autoAdvanceRoundQueue } from '../lib/queues';
import { fetchMatchDataQueue } from '../lib/queues';
import SummaryManagerService from './SummaryManagerService';
import PrizeCalculationService from './PrizeCalculationService';
import { calculatePlayerPosition } from '../utils/matchUtils';
import crypto from 'crypto'; // Import crypto for UUID generation

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

    const lobbyAssignment = (firstPhase.lobbyAssignment || 'random') as 'random' | 'seeded' | 'swiss' | 'snake';

    // Shuffle participants first
    let shuffled = [...participants];
    if (lobbyAssignment === 'random') {
      shuffled.sort(() => Math.random() - 0.5);
    } else {
      shuffled.sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
    }

    // Distribute participants sequentially (fill group up to maxPlayersPerGroup, then move to next)
    const groups: typeof participants[] = Array.from({ length: requiredNumberOfGroups }, () => []);
    shuffled.forEach((p, i) => {
      const groupIndex = Math.floor(i / maxPlayersPerGroup);
      groups[groupIndex].push(p);
    });

    // Create lobbies in each group (round)
    for (let groupIndex = 0; groupIndex < requiredNumberOfGroups; groupIndex++) {
      const round = firstPhase.rounds[groupIndex];
      if (!round) {
        logger.warn(`[PreAssign] Round for group ${groupIndex + 1} not found. Skipping.`);
        continue;
      }

      const groupParticipants = groups[groupIndex];
      const groupName = this.groupNameFromNumber(round.roundNumber);
      logger.info(`[PreAssign] Assigning Group ${groupName}: ${groupParticipants.length} players`);

      // Split group participants into lobbies
      let lobbyCount = 1;
      for (let i = 0; i < groupParticipants.length; i += lobbySize) {
        const lobbyParticipants = groupParticipants.slice(i, i + lobbySize);
        const participantUserIds = lobbyParticipants.map(p => p.userId);

        await prisma.lobby.create({
          data: {
            roundId: round.id,
            name: `Lobby ${lobbyCount++}`,
            participants: participantUserIds,
            state: 'WAITING',
            phaseStartedAt: new Date(),
          }
        });
      }
    }

    // Update tournament actualParticipantsCount
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { actualParticipantsCount: participants.length }
    });

    // Emit socket event
    if ((global as any).io) {
      (global as any).io.to(`tournament:${tournamentId}`).emit('bracket_update', { tournamentId });
      (global as any).io.to(`tournament:${tournamentId}`).emit('tournament_update', { type: 'bracket_assigned' });
    }

    logger.info(`[PreAssign] Successfully pre-assigned ${participants.length} players into ${requiredNumberOfGroups} groups for tournament ${tournamentId}`);
    return { message: `Pre-assigned ${participants.length} players into ${requiredNumberOfGroups} groups.` };
  }

  /**
   * Get bracket data for a tournament, organized by Phase → Group (Round) → Lobby → Players.
   */
  static async getBracket(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
              include: {
                lobbies: true
              }
            }
          }
        }
      }
    });

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

    // Build bracket response
    const phases = tournament.phases.map(phase => ({
      id: phase.id,
      name: phase.name,
      phaseNumber: phase.phaseNumber,
      status: phase.status,
      type: phase.type,
      groups: phase.rounds.map(round => ({
        id: round.id,
        name: `Group ${this.groupNameFromNumber(round.roundNumber)}`,
        groupLetter: this.groupNameFromNumber(round.roundNumber),
        groupNumber: round.roundNumber,
        status: round.status,
        startTime: round.startTime,
        endTime: round.endTime,
        lobbies: round.lobbies.map(lobby => ({
          id: lobby.id,
          name: lobby.name,
          state: lobby.state,
          fetchedResult: lobby.fetchedResult,
          players: (lobby.participants as string[]).map(userId => userMap.get(userId) || { id: userId, username: 'Unknown' })
        }))
      }))
    }));

    return { tournamentId, phases };
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
    let redistributed = [...survivingParticipants].sort(() => Math.random() - 0.5);

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
      (global as any).io.to(`tournament:${tournamentId}`).emit('bracket_update', { tournamentId });
      (global as any).io.to(`tournament:${tournamentId}`).emit('tournament_update', { type: 'bracket_reshuffled' });
    }

    logger.info(`[Reshuffle] Completed reshuffle for tournament ${tournamentId}`);
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

    try {
      result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const currentRound = await tx.round.findUnique({
          where: { id: roundId },
          include: {
            phase: { include: { tournament: true } },
            lobbies: true,
          },
        });

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
          if (currentRound.phase.phaseNumber === 1 && tournament.status === 'pending') {
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

            for (const round of allRoundsInPhase) {
              if (round.status === 'pending') {
                await tx.round.update({
                  where: { id: round.id },
                  data: { status: 'in_progress' },
                });
                logger.info(`[ParallelGroups] Started Group ${this.groupNameFromNumber(round.roundNumber)} (Round ${round.id})`);
              }

              // If this round has no lobbies yet, assign them now (pre-assign may have failed)
              if (round.lobbies.length === 0) {
                const participants = await tx.participant.findMany({
                  where: { tournamentId: tournament.id, eliminated: false },
                });
                const lobbySize = currentRound.phase.lobbySize || 8;
                const lobbyAssignment = (currentRound.phase.lobbyAssignment || 'random') as 'random' | 'seeded' | 'swiss' | 'snake';
                const matchesPerRound = currentRound.phase.matchesPerRound || 1;
                await LobbyService.autoAssignLobbies(round.id, participants, lobbySize, lobbyAssignment, matchesPerRound, tx);
              }
            }
          } else {
            // Non-first-phase round — just start this single round
            await tx.round.update({
              where: { id: roundId },
              data: { status: 'in_progress' },
            });

            // If no lobbies, assign them
            if (currentRound.lobbies.length === 0) {
              const participants = await tx.participant.findMany({
                where: { tournamentId: currentRound.phase.tournamentId, eliminated: false },
              });
              const lobbySize = currentRound.phase.lobbySize || 8;
              const lobbyAssignment = (currentRound.phase.lobbyAssignment || 'random') as 'random' | 'seeded' | 'swiss' | 'snake';
              const matchesPerRound = currentRound.phase.matchesPerRound || 1;
              await LobbyService.autoAssignLobbies(roundId, participants, lobbySize, lobbyAssignment, matchesPerRound, tx);
            }
          }

          jobsToQueue = [];

          if ((global as any).io) {
            (global as any).io.to(`tournament:${currentRound.phase.tournamentId}`).emit('tournament_update', { type: 'round_started', round: { id: roundId } });
            (global as any).io.to(`tournament:${currentRound.phase.tournamentId}`).emit('bracket_update', { tournamentId: currentRound.phase.tournamentId });
          }
          return { message: 'Round(s) started successfully', roundId };
        }

        // --- LOGIC TO COMPLETE AN IN_PROGRESS ROUND ---
        if (currentRound.status === 'in_progress') {
          // Removed verbose log for completing round.
          // logger.info(`Completing round ${currentRound.id}...`);

          const allLobbiesFetched = currentRound.lobbies.every(l => l.fetchedResult);
          logger.debug(`Round ${currentRound.id}: allLobbiesFetched = ${allLobbiesFetched}. Lobbies: ${JSON.stringify(currentRound.lobbies.map(l => ({ id: l.id, fetchedResult: l.fetchedResult })))}`);
          
          // For checkmate phases, we bypass the allLobbiesFetched check, as matches are created continuously.
          // The _advanceCheckmate function will determine completion for this phase type.
          if (!allLobbiesFetched && currentRound.phase.type !== 'checkmate') {
            throw new ApiError(400, 'Cannot complete round. Not all lobbies have results fetched yet.');
          }

          logger.debug(`Attempting to update Round ${roundId} status to 'completed'.`);
          await tx.round.update({ where: { id: roundId }, data: { status: 'completed', endTime: new Date() } });
          logger.debug(`Round ${currentRound.id} status updated to 'completed'.`);
          
          const allPhases = await tx.phase.findMany({ where: { tournamentId: currentRound.phase.tournament.id }, orderBy: { phaseNumber: 'asc' } });
          const currentPhase = allPhases.find(p => p.id === currentRound.phaseId);
          if (!currentPhase) throw new ApiError(404, 'Current phase not found');

          // Apply advancement/elimination logic
          const continueToFinalize = await this._applyAdvancementCondition(tx, currentRound, currentPhase);

          if (!continueToFinalize) {
              logger.debug(`Round ${currentRound.id}: Advancement logic prevented immediate finalization (e.g., Checkmate created new round).`);
              return { message: `Round ${currentRound.id} completed. Waiting for next round in Checkmate phase.` };
          }

          // --- NEW LOGIC: Update participant total scores after round completion ---
          await this._updateParticipantTotalScores(tx, currentRound.phase.tournament.id, currentRound.id);
          logger.debug(`Round ${currentRound.id}: Participant total scores updated.`);

          // Check if this was the last round of the phase
          const completedRoundsInPhase = await tx.round.count({ where: { phaseId: currentPhase.id, status: 'completed' } });
          logger.debug(`Round ${currentRound.id}: completedRoundsInPhase = ${completedRoundsInPhase}, currentPhase.numberOfRounds = ${currentPhase.numberOfRounds || 1}.`);
          if (completedRoundsInPhase < (currentPhase.numberOfRounds || 1)) {
            // Advance to the next round in the same phase
            const nextRound = await tx.round.findUnique({
              where: { phaseId_roundNumber: { phaseId: currentPhase.id, roundNumber: currentRound.roundNumber + 1 } }
            });
            if (!nextRound) {
              logger.error(`Round ${currentRound.id}: Next round (number ${currentRound.roundNumber + 1}) not found for phase ${currentPhase.id}. This might indicate a misconfiguration of numberOfRounds.`);
              throw new ApiError(404, 'Next round not found.');
            }
            
            // Dynamically update start time for the next round
            const updatedNextRound = await tx.round.update({
              where: { id: nextRound.id },
              data: { startTime: new Date(Date.now() + 1000 * 60 * 5) } // 5 minutes from now
            });

            // Queue up the next round to be started immediately
            await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: updatedNextRound.id });
            logger.info(`Round ${currentRound.id} completed. Next round ${updatedNextRound.id} queued for start.`);
            return { message: `Round ${currentRound.id} completed. Next round ${updatedNextRound.id} queued.` };
          }

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
            
            await tx.phase.update({ where: { id: nextPhase.id }, data: { status: 'in_progress' } });
            logger.info(`Phase ${nextPhase.id} status updated to 'in_progress'.`);
            
            // --- NEW LOGIC: Create rounds for the new phase ---
            const numberOfRounds = (nextPhase as any).numberOfRounds || 1;
            let lastRoundStartTime = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes from now
            let firstRoundOfNextPhaseId: string | null = null;

            logger.debug(`Round ${currentRound.id}: Creating ${numberOfRounds} rounds for new phase ${nextPhase.id}.`);
            for (let i = 1; i <= numberOfRounds; i++) {
              const currentRoundStartTime = (i === 1)
                ? lastRoundStartTime
                : new Date(lastRoundStartTime.getTime() + 45 * 60 * 1000); // 45 mins between rounds

              const newRound = await tx.round.create({
                data: {
                  phaseId: nextPhase.id,
                  roundNumber: i,
                  startTime: currentRoundStartTime,
                  status: 'pending',
                },
              });

              if (i === 1) {
                firstRoundOfNextPhaseId = newRound.id;
              }
              lastRoundStartTime = currentRoundStartTime;
              logger.debug(`Round ${currentRound.id}: Created round ${newRound.id} (number ${newRound.roundNumber}) for phase ${nextPhase.id}.`);
            }

            if (!firstRoundOfNextPhaseId) {
              logger.error(`Round ${currentRound.id}: Failed to create the first round of the next phase ${nextPhase.id}.`);
              throw new ApiError(500, 'Failed to create the first round of the next phase.');
            }
            
            // Queue up the first round of the next phase to be started
            await autoAdvanceRoundQueue.add('autoAdvanceRound', { roundId: firstRoundOfNextPhaseId });
            logger.info(`Phase ${currentPhase.id} completed. Next phase ${nextPhase.id} started and first round (${firstRoundOfNextPhaseId}) queued.`);
            return { message: `Phase ${currentPhase.id} completed. Next phase ${nextPhase.id} scheduled.` };
          }
          
          logger.info(`Round ${currentRound.id}: This was the last round of the last phase. Finalizing tournament.`);
          // This was the last round of the last phase. Finalize tournament.
          logger.debug(`Finalizing tournament ${currentRound.phase.tournament.id}.`);
          
          // Tìm tất cả người chơi không bị loại
          const finalParticipants = await tx.participant.findMany({
              where: { tournamentId: currentRound.phase.tournament.id, eliminated: false },
              orderBy: { scoreTotal: 'desc' }
          });
          
          // Cập nhật trạng thái tournament
          await tx.tournament.update({ 
              where: { id: currentRound.phase.tournament.id }, 
              data: { status: 'completed' } 
          });
          
          // Phát thưởng trong transaction
          await this.payoutPrizes(tx, currentRound.phase.tournament.id, finalParticipants);
          
          logger.info(`Tournament ${currentRound.phase.tournament.id} completed.`);
          
          return { 
              message: 'Tournament completed and prizes paid out.',
              tournamentId: currentRound.phase.tournament.id
          };
        }

        // If status is neither pending nor in_progress, do nothing.
        logger.warn(`autoAdvance called for round ${roundId} with unexpected status: ${currentRound.status}`);
        return { message: 'Round in unexpected state, no action taken.' };
      });

      // After the transaction commits, queue the jobs
      if (jobsToQueue.length > 0) {
        logger.info(`Queuing ${jobsToQueue.length} match data jobs after transaction commit.`);
        for (const jobData of jobsToQueue) {
          await fetchMatchDataQueue.add('fetchMatchData', jobData);
        }
      }
      
      // Process tournament summary after transaction if tournament was completed
      if (result && result.tournamentId) {
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
              logger.debug(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(participants.length/batchSize)}`);
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
                    await this._advanceByPlacement(tx, round, phase.advancementCondition.value);
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
                    logger.debug(`[Advancement] Top players in Checkmate phase ${phase.phaseNumber}, Round ${round.roundNumber}: ${
            topPlayers.map(p => {
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
    const lobbiesInRound = await tx.lobby.findMany({
        where: { roundId },
        include: { matches: { include: { matchResults: true } } }
    });

    const scores = new Map<string, number>();
    let matchCount = 0;
    let resultCount = 0;

    logger.debug(`[Scoring] Processing ${lobbiesInRound.length} lobbies for round ${roundId}`);

    for (const lobby of lobbiesInRound) {
        logger.debug(`[Scoring] Processing lobby ${lobby.id} with ${lobby.matches?.length || 0} matches`);
        for (const match of lobby.matches) {
            matchCount++;
            logger.debug(`[Scoring] Processing match ${match.id} with ${match.matchResults?.length || 0} results`);
            for (const result of match.matchResults) {
                resultCount++;
                const currentScore = scores.get(result.userId) || 0;
                scores.set(result.userId, currentScore + result.points);
                logger.debug(`[Scoring] User ${result.userId} scored ${result.points}. Current total: ${scores.get(result.userId)}`);
            }
        }
    }
    
    logger.debug(`[Scoring] Calculated scores for round ${roundId}: ${scores.size} players, ${matchCount} matches, ${resultCount} results`);
    
    // Log the scores for debugging
    if (scores.size > 0) {
        const scoresLog = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])  // Sort by score descending
            .map(([userId, score]) => {
              if (score === 0) {
                logger.debug(`[Scoring] User ${userId} has 0 score in round ${roundId}. This might indicate missing match results for this user.`);
              }
              return `${userId}: ${score}`;
            })
            .join(', ');
        logger.debug(`[Scoring] Round ${roundId} scores: ${scoresLog}`);
    }
    
    return scores;
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

    // Perform updates
    for (const participant of participantsToUpdate) {
        const newScoreInRound = participantScores.get(participant.id) || 0;
        const currentScoreTotal = participant.scoreTotal || 0;
        const newTotalScore = currentScoreTotal + newScoreInRound; // Add scoreInRound to current scoreTotal

        logger.debug(`[Scores] Updating participant ${participant.id}: currentScoreTotal=${currentScoreTotal}, scoreInRoundToAdd=${newScoreInRound}, newScoreTotal=${newTotalScore}`);

        await tx.participant.update({
            where: { id: participant.id },
            data: { scoreTotal: newTotalScore },
        });
    }
    logger.debug(`[Scores] Finished _updateParticipantTotalScores.`);
  }

  private static async _advanceByPlacement(tx: Prisma.TransactionClient, round: any, scoreThreshold: number) {
    logger.debug(`[Advancement] Starting score-based advancement for round ${round.id} with scoreThreshold=${scoreThreshold}`);
    logger.debug(`[Advancement] Actual scoreThreshold received: ${scoreThreshold}`);

    // Calculate scores for all participants in this round
    const scoreMap = await this._calculateScoresForRound(tx, round.id);
    
    // Get participants who have scores in this round
    const participantUserIdsInRound = Array.from(scoreMap.keys());

    if (participantUserIdsInRound.length === 0) {
      logger.warn(`[Advancement] No participants with scores found for round ${round.id}. Skipping score advancement.`);
      return;
    }

    const participantsInRound = await tx.participant.findMany({
      where: {
        userId: { in: participantUserIdsInRound },
        tournamentId: round.phase.tournamentId, // Ensure they belong to the current tournament
      },
      include: { // Include roundOutcomes to update existing ones if needed
        roundOutcomes: {
          where: { roundId: round.id }
        }
      }
    });

    // Combine participants with their scores in the current round
    const participantsWithScores = participantsInRound.map(p => ({
      ...p,
      roundScore: scoreMap.get(p.userId) || 0, // Should always find a score now
    }));

    // Sort participants by their round score in descending order (for logging/understanding, not strictly needed for this logic)
    const sortedParticipants = participantsWithScores.sort((a, b) => b.roundScore - a.roundScore);

    logger.debug(`[Advancement] Sorted participants by round score: ${sortedParticipants.map(p => `${p.userId}: ${p.roundScore}`).join(', ')}`);

    // Process each active participant to create/update their round outcome
    for (const participant of participantsWithScores) { // Use participantsWithScores directly, no need for sorting here for advancement logic
      const userId = participant.userId;
      if (!userId) continue; // Skip participants without a userId
      
      logger.debug(`[Advancement] Processing participant ID: ${participant.id}, User ID: ${userId}`);

      const participantScoreInRound = participant.roundScore; // Already combined
      
      const status: "advanced" | "eliminated" = participantScoreInRound >= scoreThreshold ? 'advanced' : 'eliminated';

      await tx.roundOutcome.upsert({
        where: { participantId_roundId: { participantId: participant.id, roundId: round.id } },
        update: {
          scoreInRound: participantScoreInRound,
          status: status,
        },
        create: {
          participantId: participant.id,
          roundId: round.id,
          scoreInRound: participantScoreInRound,
          status: status,
        },
      });
      logger.info(`[Advancement] Upserted roundOutcome for participant ${participant.id} (User ${userId}) with scoreInRound: ${participantScoreInRound} and status: ${status}`);
        
      // If eliminated by this round's logic, mark participant as eliminated in the tournament
      if (status === 'eliminated') {
        await tx.participant.update({
          where: { id: participant.id },
          data: { eliminated: true },
        });
        logger.info(`[Advancement] Marked participant ${participant.id} (User ${userId}) as eliminated.`);
      }
    }

    // Log a summary of outcome - count directly from upserted results
    const advancedCount = await tx.roundOutcome.count({
      where: { roundId: round.id, status: 'advanced' }
    });
    
    const eliminatedCount = await tx.roundOutcome.count({
      where: { roundId: round.id, status: 'eliminated' }
    });
    
    logger.info(`[Advancement] Round ${round.id} score-based advancement complete: ${advancedCount} advanced, ${eliminatedCount} eliminated`);
  }

  private static async _advanceTopNPlayers(tx: Prisma.TransactionClient, round: any, topN: number) {
    logger.debug(`[Advancement Logic] Advancing top ${topN} players for Round ID: ${round.id}`);
    
    // Lấy danh sách người chơi thực sự tham gia round này
    // Đầu tiên, lấy tất cả id người chơi trong các lobby của round
    const lobbies = await tx.lobby.findMany({
      where: { roundId: round.id },
      include: {
        matches: {
          include: {
            matchResults: true
          }
        }
      }
    });
    
    const participantUserIds = new Set<string>();
    lobbies.forEach(lobby => {
      const lobbyParticipants = lobby.participants as string[];
      if (Array.isArray(lobbyParticipants)) {
        lobbyParticipants.forEach(userId => participantUserIds.add(userId));
      }
    });
    
    logger.debug(`[Advancement Logic] Found ${participantUserIds.size} participants in round ${round.id} lobbies`);
    
    if (participantUserIds.size === 0) {
      logger.warn(`[Advancement Logic] No participants found in lobbies for round ${round.id}. Skipping advancement.`);
      return;
    }
    
    // Lấy thông tin participant cho những người tham gia round này và chưa bị loại
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

    // Lấy điểm của mỗi người trong round hiện tại thay vì dùng tổng điểm
    const scoresInRound = await this._calculateScoresForRound(tx, round.id);

    // Tạo mảng mới bao gồm participant và điểm trong round
    const participantsWithRoundScore = participants.map(p => ({
      ...p,
      roundScore: scoresInRound.get(p.userId) || 0
    }));
    
    // Sắp xếp theo điểm trong round này (không phải scoreTotal)
    const sortedParticipants = [...participantsWithRoundScore].sort((a, b) => b.roundScore - a.roundScore);
    
    logger.debug(`[Advancement Logic] Participants sorted by round score (ID: Score): ${sortedParticipants.map(p => `${p.id}: ${p.roundScore}`).join(', ')}`);

    // Chỉ loại người khi số lượng người chơi vượt quá số người được tiếp tục
    if (sortedParticipants.length <= topN) {
      logger.info(`[Advancement Logic] Only ${sortedParticipants.length} participants, which is <= ${topN} required. Not eliminating any.`);
      
      // Create or update RoundOutcome for all players, marking them as advanced
      for (const p of sortedParticipants) {
        await tx.roundOutcome.upsert({
          where: { participantId_roundId: { participantId: p.id, roundId: round.id } },
          update: {
            status: 'advanced',
            scoreInRound: p.roundScore,
          },
          create: {
        participantId: p.id,
        roundId: round.id,
        status: 'advanced',
        scoreInRound: p.roundScore,
          },
        });
        logger.debug(`[Advancement Logic] Upserted round outcome for participant ${p.id} with status: advanced, score: ${p.roundScore}`);
      }
      return;
    }

    // Lấy top N người dựa trên điểm round
    const playersToAdvance = sortedParticipants.slice(0, topN);
    const playersToEliminate = sortedParticipants.slice(topN);

    logger.debug(`[Advancement Logic] Players to Advance (ID: Round Score): ${playersToAdvance.map(p => `${p.id}: ${p.roundScore}`).join(', ')}`);
    logger.debug(`[Advancement Logic] Players to Eliminate (ID: Round Score): ${playersToEliminate.map(p => `${p.id}: ${p.roundScore}`).join(', ')}`);

    const playerIdsToEliminate = playersToEliminate.map(p => p.id);

    // --- Upsert RoundOutcomes for ALL participants in this round ---
    for (const p of sortedParticipants) {
        const isEliminated = playerIdsToEliminate.includes(p.id);
        await tx.roundOutcome.upsert({
          where: { participantId_roundId: { participantId: p.id, roundId: round.id } },
          update: {
            status: isEliminated ? 'eliminated' : 'advanced',
            scoreInRound: p.roundScore,
          },
          create: {
            participantId: p.id,
            roundId: round.id,
            status: isEliminated ? 'eliminated' : 'advanced',
            scoreInRound: p.roundScore,
          },
        });
        logger.debug(`[Advancement Logic] Upserted round outcome for participant ${p.id} with status: ${isEliminated ? 'eliminated' : 'advanced'}, score: ${p.roundScore}`);
    }

    // --- Eliminate players ---
    if (playerIdsToEliminate.length > 0) {
        logger.debug(`[Advancement Logic] Eliminating ${playerIdsToEliminate.length} players.`);
      await tx.participant.updateMany({
          where: { id: { in: playerIdsToEliminate } },
          data: { eliminated: true },
        });
    } else {
        logger.debug(`[Advancement Logic] No players were eliminated in this round.`);
    }
  }

  static async payoutPrizes(tx: Prisma.TransactionClient, tournamentId: string, winners: Participant[]) {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: { participants: true }
        }
      }
    });

    if (!tournament || !tournament.prizeStructure) {
      logger.warn(`Tournament ${tournamentId} has no prize structure to pay out.`);
      return;
    }

    const participantCount = tournament._count.participants;
    const totalPot = participantCount * tournament.entryFee;
    const prizePool = totalPot * (1 - tournament.hostFeePercent);
    
    logger.debug(`Calculating prizes for tournament ${tournamentId}. Total pot: ${totalPot}, Prize pool: ${prizePool}`);

    const dynamicPrizeStructure = PrizeCalculationService.getDynamicPrizeDistribution(participantCount);

    // Use the PrizeCalculationService to get the optimized distribution
    const prizeDistribution = PrizeCalculationService.getFinalPrizeDistribution(winners, dynamicPrizeStructure, prizePool);
    logger.info(`Prize distribution calculated with ${prizeDistribution.length} winners`);

    // Process each winner and create reward records
    for (const prize of prizeDistribution) {
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

  // Phương thức mới để đảm bảo tất cả rounds, lobbies và roundOutcomes đều được đánh dấu completed
  private static async _ensureAllResourcesCompleted(tx: Prisma.TransactionClient, tournamentId: string) {
    logger.info(`Ensuring all resources are marked as completed for tournament ${tournamentId}`);

    // 1. Tìm tất cả rounds của tournament chưa completed
    const phases = await tx.phase.findMany({
      where: { tournamentId: tournamentId },
      include: { rounds: true }
    });

    for (const phase of phases) {
      // Cập nhật phase status nếu chưa completed
      if (phase.status !== 'completed') {
        await tx.phase.update({
          where: { id: phase.id },
          data: { status: 'completed' }
        });
      }

      // Tìm các rounds chưa completed trong phase
      const incompleteRounds = phase.rounds.filter(r => r.status !== 'completed');
      
      if (incompleteRounds.length > 0) {
        logger.info(`Updating ${incompleteRounds.length} incomplete rounds in phase ${phase.id} to completed`);
        
        for (const round of incompleteRounds) {
          // Cập nhật round status
          await tx.round.update({
            where: { id: round.id },
            data: { status: 'completed', endTime: new Date() }
          });

          // 2. Cập nhật tất cả lobbies của round này
          const lobbies = await tx.lobby.findMany({
            where: { roundId: round.id }
          });
          
          if (lobbies.length > 0) {
            for (const lobby of lobbies) {
              // Cập nhật lobby fetchedResult nếu chưa
              if (!lobby.fetchedResult) {
                await tx.lobby.update({
                  where: { id: lobby.id },
                  data: { fetchedResult: true }
                });
              }
            }
            logger.info(`Updated ${lobbies.length} lobbies to fetchedResult=true for round ${round.id}`);
          }

          // 3. Cập nhật tất cả roundOutcomes của round này
          const pendingOutcomes = await tx.roundOutcome.findMany({
            where: { 
              roundId: round.id,
              status: { notIn: ['advanced', 'eliminated'] }
            }
          });

          if (pendingOutcomes.length > 0) {
            for (const outcome of pendingOutcomes) {
              // Kiểm tra xem participant có bị loại không để xác định trạng thái
              const participant = await tx.participant.findUnique({
                where: { id: outcome.participantId }
              });

              await tx.roundOutcome.update({
                where: { id: outcome.id },
                data: { status: participant && participant.eliminated ? 'eliminated' : 'advanced' }
              });
            }
            logger.info(`Updated ${pendingOutcomes.length} pending round outcomes for round ${round.id}`);
          }
        }
      }
    }

    logger.info(`All resources for tournament ${tournamentId} have been updated to completed status`);
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
