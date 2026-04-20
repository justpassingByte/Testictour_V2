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
  static async join(tournamentId: string, userId: string, discordId?: string, referralSource?: string, joinAsReserve?: boolean) {
    // ── Phase 1: validate + reserve slot + create participant (in transaction) ──
    const { participant, tournament } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw new ApiError(404, 'Tournament not found');

      console.log(`[JOIN DEBUG] Tournament: ${tournament.name}, entryFee: ${tournament.entryFee}, type: ${typeof tournament.entryFee}, status: ${tournament.status}`);

      if (tournament.status !== 'UPCOMING' && tournament.status !== 'pending') {
        throw new ApiError(400, 'Tournament is no longer accepting registrations');
      }

      if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
        throw new ApiError(400, 'Registration deadline has passed');
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
      // Check if main slots are available first
      const currentCount = tournament.actualParticipantsCount || 0;
      const mainSlotsFull = currentCount >= tournament.maxPlayers;
      const isReserve = joinAsReserve || mainSlotsFull;

      if (isReserve) {
        // Reserve player registration
        const reserveLimit = (tournament as any).reservePlayersLimit || 0;
        if (reserveLimit <= 0) {
          throw new ApiError(400, 'Tournament is full and does not accept reserve players');
        }
        // Count existing reserve players
        const reserveCount = await tx.participant.count({
          where: { tournamentId, isReserve: true }
        });
        if (reserveCount >= reserveLimit) {
          throw new ApiError(400, 'All reserve slots are full');
        }
        logger.info(`[Reserve] Player ${userId} joining tournament ${tournamentId} as reserve (slot ${reserveCount + 1}/${reserveLimit})`);
      } else {
        // Main player registration — atomic slot reservation
        // Uses conditional UPDATE — only succeeds if count < maxPlayers.
        const slotReserved = await tx.tournament.updateMany({
          where: {
            id: tournamentId,
            status: { in: ['UPCOMING', 'pending'] },
            actualParticipantsCount: tournament.actualParticipantsCount,
          },
          data: { actualParticipantsCount: currentCount + 1 },
        });

        if (slotReserved.count === 0) {
          // Main slots full — check if reserve is available
          const reserveLimit = (tournament as any).reservePlayersLimit || 0;
          if (reserveLimit > 0) {
            throw new ApiError(400, 'Main slots are full. You can join as a reserve player instead.');
          }
          throw new ApiError(400, 'Tournament is full');
        }
      }

      const entryFee = tournament.entryFee || 0;

      // Create participant — paid=true for free tournaments, paid=false until payment confirmed
      const participant = await tx.participant.create({
        data: { tournamentId, userId, paid: entryFee === 0, referralSource, isReserve },
      });

      return { participant, tournament };
    });

    // ── Phase 2: if paid tournament, generate payment checkout URL ─────────────
    const entryFee = tournament.entryFee || 0;
    logger.info(`[Join] Tournament ${tournamentId} entryFee=${tournament.entryFee}, resolved=${entryFee}, type=${typeof tournament.entryFee}`);
    if (entryFee === 0) {
      // Free tournament — done immediately
      return { participant, checkoutUrl: null, requiresPayment: false };
    }

    // Determine payment provider from settings
    // Determine payment provider from settings
    const settings = await SettingsService.getEscrowSettings();
    const provider = settings.escrowDefaultProvider || 'sepay';
    const feUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl = process.env.API_URL || 'http://localhost:4000/api';

    console.log(`[JOIN DEBUG Phase2] provider=${provider}, feUrl=${feUrl}, apiUrl=${apiUrl}`);

    const successUrl = `${feUrl}/tournaments/${tournamentId}?paymentSuccess=true&participantId=${participant.id}`;
    const cancelUrl  = `${feUrl}/tournaments/${tournamentId}/register?paymentCancelled=true`;

    let checkoutUrl = '';
    let transaction: any;
    let paymentDetails = null;

    try {
      const OrderService = (await import('./OrderService')).default;
      const orderRef = OrderService.generateOrderRef();
      const externalRefId = `ORDER_${orderRef}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      transaction = await prisma.transaction.create({
        data: {
          userId,
          tournamentId,
          type: 'entry_fee',
          amount: entryFee,
          currency: 'usd',
          status: 'pending',
          refId: participant.id,
          externalRefId,
          paymentMethod: provider,
          expiresAt,
          reviewNotes: `Entry fee for tournament ${tournamentId}`,
        },
      });

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
      } else if (provider === 'sepay' || provider === 'bank_transfer' || provider === 'manual') {
        const CurrencyService = (await import('./CurrencyService')).default;
        const usdToVndRate = await CurrencyService.getUsdToVndRate();
        let amountVnd = Math.round(entryFee * usdToVndRate);
        
        // Add random suffix to amount to help deduplication
        amountVnd = OrderService.generateRandomSuffixAmount(amountVnd);

        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { reviewNotes: `Entry fee. Exact pay: ${amountVnd} VND` }
        });

        // The checkoutUrl routes to our backend handler for automatic payment gateway redirection
        checkoutUrl = `${apiUrl}/payments/sepay-pg/${transaction.id}`;
        paymentDetails = { externalRefId, amountVnd, checkoutUrl };
        console.log(`[JOIN DEBUG] Generated checkoutUrl: ${checkoutUrl}`);
      }
    } catch (err: any) {
      // Payment URL generation failed — clean up: remove participant + decrement slot
      logger.error(`[EntryFee] Checkout URL generation failed for participant ${participant.id}: ${err.message}`);
      await prisma.$transaction(async (tx) => {
        const failedParticipant = await tx.participant.findUnique({ where: { id: participant.id } });
        await tx.participant.delete({ where: { id: participant.id } });
        // Only decrement count for main players (reserves don't increment it)
        if (!failedParticipant?.isReserve) {
          await tx.tournament.update({
            where: { id: tournamentId },
            data: { actualParticipantsCount: { decrement: 1 } },
          });
        }
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
      
      const FeeCalculationService = (await import('./FeeCalculationService')).default;
      const financials = await FeeCalculationService.calculateTournamentAggregateFinancials(
        tournamentId, 
        participantCount
      );

      let prizePool = financials.aggregates.entryPrizePool;
      const basePool = tournament.escrowRequiredAmount || financials.aggregates.totalEntryRevenue;

      if (!tournament.isCommunityMode && tournament.escrow) {
        // Find how many entries worth of money is actually funded
        const effectiveFundedEntries = tournament.entryFee > 0 ? Math.floor(tournament.escrow.fundedAmount / tournament.entryFee) : 0;
        const netFunded = effectiveFundedEntries * financials.perEntryBreakdown.prizeContribution;
        
        if (tournament.escrow.fundedAmount > basePool) {
          prizePool = netFunded;
        } else if (tournament.escrow.fundedAmount > 0) {
          prizePool = Math.max(prizePool, netFunded);
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
              reviewNotes: participant.isReserve
                ? 'Entry fee refund — reserve player removed'
                : 'Entry fee refund — participant removed before tournament start',
            },
          });
        }
      }

      await tx.participant.delete({ where: { id: participantId } });

      // Only decrement actualParticipantsCount for main players (reserves don't count toward max)
      if (!participant.isReserve) {
        await tx.tournament.update({
          where: { id: tournament.id },
          data: { actualParticipantsCount: { decrement: 1 } },
        });
      }

      return;
    });
  }

  /**
   * List reserve players for a tournament (for admin/partner dashboards)
   */
  static async listReserves(tournamentId: string) {
    return prisma.participant.findMany({
      where: { tournamentId, isReserve: true },
      include: {
        user: { select: { id: true, username: true, riotGameName: true, riotGameTag: true, email: true, puuid: true, rank: true } }
      },
      orderBy: { joinedAt: 'asc' },
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