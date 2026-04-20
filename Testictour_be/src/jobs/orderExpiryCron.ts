import { prisma } from '../services/prisma';
import logger from '../utils/logger';
import cron from 'node-cron';

export async function expireOldOrders() {
  try {
    const expiredOrders = await prisma.transaction.findMany({
      where: {
        status: { in: ['pending', 'pending_payment'] },
        expiresAt: { lt: new Date() },
      },
      take: 100, // Process in batches
    });

    if (expiredOrders.length === 0) return;

    logger.info(`[OrderExpiryCron] Found ${expiredOrders.length} expired orders.`);

    const ParticipantPaymentService = (await import('../services/ParticipantPaymentService')).default;

    for (const order of expiredOrders) {
      if (order.type === 'entry_fee') {
        await ParticipantPaymentService.cancelEntryFeeRegistration(order.id, 'expired');
      } else {
        await prisma.transaction.update({
          where: { id: order.id },
          data: { status: 'expired' },
        });
      }
    }

    logger.info(`[OrderExpiryCron] Successfully processed ${expiredOrders.length} expired orders.`);
  } catch (error) {
    logger.error(`[OrderExpiryCron] Error expiring orders: ${error}`);
  }
}

// Run every minute
cron.schedule('* * * * *', () => {
    expireOldOrders();
});
