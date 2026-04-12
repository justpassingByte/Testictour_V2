import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';

export default class TransactionService {
  private static async _executeTransaction(
    tx: Prisma.TransactionClient | undefined,
    logic: (db: Prisma.TransactionClient) => Promise<any>
  ) {
    if (tx) {
      return logic(tx);
    } else {
      return prisma.$transaction(logic);
    }
  }

  static async entryFee(userId: string, tournamentId: string, amount: number, tx?: Prisma.TransactionClient, currency: string = 'usd') {
    return this._executeTransaction(tx, async (db) => {
      const balance = await db.balance.findUnique({ where: { userId } });
      if (!balance) throw new ApiError(400, 'Balance not found');
      
      if (currency === 'coins') {
        if (balance.coins < amount) throw new ApiError(400, 'Insufficient coins balance');
        await db.balance.update({ where: { userId }, data: { coins: { decrement: amount } } });
      } else {
        if (balance.amount < amount) throw new ApiError(400, 'Insufficient USD balance');
        await db.balance.update({ where: { userId }, data: { amount: { decrement: amount } } });
      }

      await db.transaction.create({ data: { userId, type: 'entry_fee', amount, currency, status: 'success', refId: tournamentId } });
      return true;
    });
  }

  static async refund(userId: string, tournamentId: string, amount: number, tx?: Prisma.TransactionClient, currency: string = 'usd') {
    return this._executeTransaction(tx, async (db) => {
      const updateData = currency === 'coins' ? { coins: { increment: amount } } : { amount: { increment: amount } };
      await db.balance.update({ where: { userId }, data: updateData });
      await db.transaction.create({ data: { userId, type: 'refund', amount, currency, status: 'success', refId: tournamentId } });
      return true;
    });
  }

  static async payout(userId: string, tournamentId: string, amount: number, tx?: Prisma.TransactionClient, currency: string = 'usd') {
    return this._executeTransaction(tx, async (db) => {
      // Create the Reward record
      const reward = await db.reward.create({
        data: {
          participant: { connect: { userId_tournamentId: { userId, tournamentId } } }, // Connect to participant (assuming unique on userId and tournamentId)
          tournament: { connect: { id: tournamentId } },
          amount: amount,
          status: 'success',
        },
      });

      // Update participant's rewarded status
      await db.participant.update({
        where: { userId_tournamentId: { userId, tournamentId } },
        data: { rewarded: true },
      });

      // Create the Transaction record, referencing the newly created reward ID
      const updateData = currency === 'coins' ? { coins: { increment: amount } } : { amount: { increment: amount } };
      await db.balance.update({ where: { userId }, data: updateData });
      await db.transaction.create({ data: { userId, type: 'reward', amount, currency, status: 'success', refId: reward.id } });
      return true;
    });
  }
} 