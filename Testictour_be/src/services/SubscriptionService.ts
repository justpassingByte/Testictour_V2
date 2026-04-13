import { prisma } from './prisma';
import logger from '../utils/logger';

export default class SubscriptionService {
  /**
   * Completes a subscription upgrade upon successful webhook notification
   */
  static async completeUpgrade(params: {
    partnerId: string;
    transactionId: string;
    plan: string;
    providerEventId: string;
  }) {
    logger.info(`[Subscription] Completing upgrade for Partner ${params.partnerId} to ${params.plan}`);
    
    return prisma.$transaction(async (tx) => {
      // 1. Mark transaction as success
      await tx.transaction.update({
        where: { id: params.transactionId },
        data: {
          status: 'success',
          refId: params.providerEventId,
        }
      });
      
      // 2. Lookup plan config
      const liveConfig = await tx.subscriptionPlanConfig.findUnique({
        where: { plan: params.plan }
      });
      
      if (!liveConfig) {
        throw new Error(`Plan config not found for ${params.plan}`);
      }
      
      const features = {
        ...(typeof liveConfig.features === 'object' && liveConfig.features ? liveConfig.features : {}),
        maxLobbies: liveConfig.maxLobbies,
        maxTournamentSize: liveConfig.maxTournamentSize,
      };
      
      // 3. Upsert Partner Subscription
      return tx.partnerSubscription.upsert({
        where: { userId: params.partnerId },
        update: {
            plan: params.plan,
            features,
            monthlyPrice: liveConfig.monthlyPrice,
            annualPrice: liveConfig.annualPrice,
            status: 'ACTIVE',
        },
        create: {
            userId: params.partnerId,
            plan: params.plan,
            features,
            monthlyPrice: liveConfig.monthlyPrice,
            annualPrice: liveConfig.annualPrice,
            status: 'ACTIVE',
        },
      });
    });
  }
}
