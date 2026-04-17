import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';
import PrizeCalculationService from './PrizeCalculationService';
import { getMajorRegion } from '../utils/RegionMapper';
import StripeService from './StripeService';
import MomoService from './MomoService';
import CurrencyService from './CurrencyService';
import SettingsService from './SettingsService';
import crypto from 'crypto';
import logger from '../utils/logger';

export default class ParticipantService {
  static async join(tournamentId: string, userId: string, discordId?: string, referralSource?: string) {
    // ── Phase 1: validate + reserve slot + create participant (in transaction) ──
    const { participant, tournament } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      if (tournament.status !== 'UPCOMING') {
        throw new ApiError(400, 'Tournament is no longer accepting registrations');
      }

      // Update discordId if provided
      if (discordId) {
        await tx.user.update({ where: { id: userId }, data: { discordId } });
      }

      // Region check
      if (tournament.region) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user?.region) {
          const userMajorRegion = getMajorRegion(user.region);
          if (userMajorRegion !== tournament.region) {
            throw new ApiError(403, `Region mismatch: Your account is in ${userMajorRegion}, but this tournament is for ${tournament.region}.`);
          }
        }
      }

      // Duplicate check
      const existing = await tx.participant.findFirst({ where: { tournamentId, userId } });
      if (existing) throw new ApiError(409, 'User already joined this tournament');

      // ── ATOMIC slot reservation ─────────────────────────────────────────────
      // Uses conditional UPDATE — only succeeds if count < maxPlayers.
      // If 2 concurrent requests race, only 1 gets count=1; the other gets 0 → reject.
      const slotReserved = await tx.tournament.updateMany({
        where: {
          id: tournamentId,
          status: 'UPCOMING',
          actualParticipantsCount: { lt: tournament.maxPlayers },
        },
        data: { actualParticipantsCount: { increment: 1 } },
      });

      if (slotReserved.count === 0) {
        throw new ApiError(400, 'Tournament is full');
      }

      const entryFee = tournament.entryFee || 0;

      // Create participant — paid=true for free tournaments, paid=false until payment confirmed
      const participant = await tx.participant.create({
        data: { tournamentId, userId, paid: entryFee === 0, referralSource },
      });

      return { participant, tournament };
    });

    // ── Phase 2: if paid tournament, generate payment checkout URL ─────────────
    const entryFee = tournament.entryFee || 0;
    if (entryFee === 0) {
      // Free tournament — done immediately
      return { participant, checkoutUrl: null, requiresPayment: false };
    }

    // Determine payment provider from settings
    const settings = await SettingsService.getEscrowSettings();
    const provider = settings.escrowDefaultProvider || 'stripe';
    const feUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl = process.env.API_URL || 'http://localhost:3001/api/v1';

    const externalRefId = `entryfee_${participant.id}_${crypto.randomBytes(8).toString('hex')}`;
    const successUrl = `${feUrl}/tournaments/${tournamentId}?paymentSuccess=true&participantId=${participant.id}`;
    const cancelUrl  = `${feUrl}/tournaments/${tournamentId}/register?paymentCancelled=true`;

    // Create pending transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        tournamentId,
        type: 'entry_fee',
        amount: entryFee,
        currency: 'usd',
        status: 'pending',
        refId: participant.id,       // link back to participant
        externalRefId,
        paymentMethod: provider,
        reviewNotes: `Entry fee for tournament ${tournamentId}`,
      },
    });

    let checkoutUrl = '';
    try {
      if (provider === 'stripe') {
        checkoutUrl = await StripeService.createEntryFeeCheckout({
          tournamentId,
          participantId: participant.id,
          transactionId: transaction.id,
          amountUsd: entryFee,
          successUrl,
          cancelUrl,
        });
      } else if (provider === 'momo') {
        const usdToVndRate = await CurrencyService.getUsdToVndRate();
        const amountVnd = Math.round(entryFee * usdToVndRate);
        checkoutUrl = await MomoService.createEntryFeePayment({
          tournamentId,
          participantId: participant.id,
          transactionId: transaction.id,
          amountVnd,
          returnUrl: successUrl,
          notifyUrl: `${apiUrl}/webhooks/payments/momo`,
        });
      }
    } catch (err: any) {
      // Payment URL generation failed — clean up: remove participant + decrement slot
      logger.error(`[EntryFee] Checkout URL generation failed for participant ${participant.id}: ${err.message}`);
      await prisma.$transaction(async (tx) => {
        await tx.participant.delete({ where: { id: participant.id } });
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { actualParticipantsCount: { decrement: 1 } },
        });
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'failed', reviewNotes: `Checkout URL generation failed: ${err.message}` },
        });
      });
      throw new ApiError(502, 'Payment gateway unavailable. Please try again.');
    }

    logger.info(`[EntryFee] Participant ${participant.id} registered. Awaiting payment via ${provider}.`);
    return { participant, checkoutUrl, requiresPayment: true, transactionId: transaction.id };
  }


  static async list(tournamentId: string, page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereClause: any = { tournamentId };

    if (search) {
      whereClause.OR = [
        { inGameName: { contains: search, mode: 'insensitive' } },
        { user: { riotGameName: { contains: search, mode: 'insensitive' } } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.participant.findMany({
        where: whereClause,
        include: { user: true },
        skip: skip,
        take: limit,
      }),
      prisma.participant.count({ where: whereClause })
    ]);
    return { data, total };
  }

  static async leaderboard(tournamentId: string) {
    const participants = await prisma.participant.findMany({
      where: { tournamentId, eliminated: false },
      include: { 
        user: { select: { id: true, username: true, riotGameName: true, riotGameTag: true, rank: true, topFourRate: true, firstPlaceRate: true, region: true } },
        rewards: true 
      }
    });

    const userIds = participants.map(p => p.user?.id).filter(Boolean) as string[];
    const [allMatchResults, tournament] = await Promise.all([
      prisma.matchResult.findMany({
        where: {
          userId: { in: userIds },
          match: {
            lobby: {
              round: {
                phase: { tournamentId }
              }
            }
          }
        },
        select: { userId: true, placement: true, points: true }
      }),
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { escrow: true, _count: { select: { participants: true } } }
      })
    ]);

    const playerStatsMap = new Map<string, { matches: number; placements: number[]; computedScore: number }>();
    for (const res of allMatchResults) {
      const stats = playerStatsMap.get(res.userId) || { matches: 0, placements: [], computedScore: 0 };
      stats.matches += 1;
      stats.placements.push(res.placement);
      stats.computedScore += (res.points || 0);
      playerStatsMap.set(res.userId, stats);
    }

    const { default: RoundService } = await import('./RoundService');

    participants.sort((a, b) => {
      const aUserId = a.user?.id || '';
      const bUserId = b.user?.id || '';
      const statsA = playerStatsMap.get(aUserId) || { matches: 0, placements: [], computedScore: 0 };
      const statsB = playerStatsMap.get(bUserId) || { matches: 0, placements: [], computedScore: 0 };

      // DO NOT OVERWRITE scoreTotal with globally computedScore! 
      // This ensures we respect the carryOverScores=false logic when DB resets scoreTotal to 0.
      return RoundService.tiebreakComparator(
        { score: a.scoreTotal || 0, placements: statsA.placements, userId: aUserId },
        { score: b.scoreTotal || 0, placements: statsB.placements, userId: bUserId }
      );
    });

    // Calculate projected prizes if tournament has prize structure
    let projectedDistribution: any[] = [];
    if (tournament) {
      const participantCount = tournament._count.participants;
      const totalPot = participantCount * tournament.entryFee;
      
      const sub = await prisma.partnerSubscription.findUnique({ where: { userId: tournament.organizerId } });
      const planConfig = await prisma.subscriptionPlanConfig.findUnique({ where: { plan: sub?.plan || 'FREE' } });
      const platformFeePercent = planConfig?.platformFeePercent ?? 0.05;
      
      const basePool = tournament.escrowRequiredAmount || totalPot;
      const computedPrizePool = basePool * (1 - (tournament.hostFeePercent || 0) - platformFeePercent);

      let prizePool = computedPrizePool;
      if (!tournament.isCommunityMode && tournament.escrow) {
        const netFunded = tournament.escrow.fundedAmount * (1 - (tournament.hostFeePercent || 0) - platformFeePercent);
        if (tournament.escrow.fundedAmount > basePool) {
          prizePool = netFunded;
        } else if (tournament.escrow.fundedAmount > 0) {
          prizePool = Math.max(computedPrizePool, netFunded);
        }
      }

      const customStructure = tournament.prizeStructure;
      const hasCustomStructure = customStructure && (
        (Array.isArray(customStructure) && customStructure.length > 0) ||
        (typeof customStructure === 'object' && !Array.isArray(customStructure) && Object.keys(customStructure as object).length > 0)
      );

      const PrizeCalculationService = (await import('./PrizeCalculationService')).default;
      const structureToUse = hasCustomStructure
        ? customStructure
        : PrizeCalculationService.getDynamicPrizeDistribution(participantCount);

      // Calculate projected prizes based on leaderboard position (index-based)
      // instead of score-based ranking to avoid all-same-score players getting rank 1 prizes
      const isArray = Array.isArray(structureToUse);
      for (let i = 0; i < participants.length; i++) {
        const rank = i + 1; // 1-indexed position in sorted leaderboard
        const prizePercentage = isArray
          ? (structureToUse as any)[i]
          : (structureToUse as Record<string, number>)[(rank).toString()];

        if (prizePercentage !== undefined && prizePercentage !== null) {
          const normalizedPercentage = prizePercentage > 1 ? prizePercentage / 100 : prizePercentage;
          const amount = prizePool * normalizedPercentage;
          if (amount > 0) {
            projectedDistribution.push({
              participantId: participants[i].id,
              amount,
              rank,
            });
          }
        }
      }
    }

    return participants.map(p => {
      let rewards = p.rewards || [];
      // If DB has no rewards, inject projected reward for UI
      if (rewards.length === 0) {
        const projectedPrize = projectedDistribution.find(dist => dist.participantId === p.id);
        if (projectedPrize) {
          rewards = [{
            id: `projected_${p.id}`,
            participantId: p.id,
            tournamentId: p.tournamentId,
            amount: projectedPrize.amount,
            status: 'projected',
            sentAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any];
        }
      }

      return {
        ...p,
        rewards,
        matchesPlayed: p.user?.id ? (playerStatsMap.get(p.user.id)?.matches || 0) : 0,
        placements: p.user?.id ? (playerStatsMap.get(p.user.id)?.placements || []) : []
      };
    });
  }

  /**
   * Paginated leaderboard — uses DB-level sorting + LIMIT/OFFSET
   * Much faster than the full leaderboard() method for large tournaments.
   */
  static async paginatedLeaderboard(tournamentId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.participant.findMany({
        where: { tournamentId, eliminated: false },
        include: {
          user: { select: { id: true, username: true, riotGameName: true, riotGameTag: true, rank: true, region: true } },
          rewards: true,
        },
        orderBy: { scoreTotal: 'desc' },
        skip,
        take: limit,
      }),
      prisma.participant.count({ where: { tournamentId, eliminated: false } }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Lightweight top-N participants for winner banners etc.
   * Only fetches the top N participants sorted by score.
   */
  static async topParticipants(tournamentId: string, limit: number = 3) {
    return prisma.participant.findMany({
      where: { tournamentId },
      include: {
        user: { select: { id: true, username: true, riotGameName: true, riotGameTag: true, puuid: true, rank: true, region: true } },
        rewards: true,
      },
      orderBy: { scoreTotal: 'desc' },
      take: limit,
    });
  }

  static async update(participantId: string, data: any) {
    return prisma.participant.update({ where: { id: participantId }, data });
  }

  static async remove(participantId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const participant = await tx.participant.findUnique({ where: { id: participantId } });
      if (!participant) throw new ApiError(404, 'Participant not found');
      const tournament = await tx.tournament.findUnique({ where: { id: participant.tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      // If participant paid, create a pending refund transaction for admin to process via gateway
      // (Entry fees are paid via Stripe/MoMo, so refund must be handled externally)
      if (tournament.status === 'UPCOMING' && participant.paid) {
        const entryFee = (tournament as any).entryFee || 0;
        if (entryFee > 0) {
          await tx.transaction.create({
            data: {
              userId: participant.userId,
              tournamentId: participant.tournamentId,
              type: 'refund',
              amount: entryFee,
              currency: 'usd',
              status: 'pending', // Admin processes gateway refund manually
              refId: participant.id,
              reviewNotes: 'Entry fee refund — participant removed before tournament start',
            },
          });
        }
      }

      await tx.participant.delete({ where: { id: participantId } });

      // Atomic decrement — prevents going below 0 if counts are somehow stale
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { actualParticipantsCount: { decrement: 1 } },
      });

      return;
    });
  }


  /**
   * Get participant's round history
   */
  static async getHistory(participantId: string) {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        user: true,
        roundOutcomes: {
          include: {
            round: {
              include: { phase: true }
            }
          },
          orderBy: {
            round: {
              phase: { phaseNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!participant) throw new ApiError(404, 'Participant not found');

    participant.roundOutcomes.sort((a, b) => {
      if (a.round.phase.phaseNumber !== b.round.phase.phaseNumber) {
        return a.round.phase.phaseNumber - b.round.phase.phaseNumber;
      }
      return a.round.roundNumber - b.round.roundNumber;
    });

    return participant;
  }
}