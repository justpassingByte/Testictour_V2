import { prisma } from './prisma';
import ApiError from '../utils/ApiError';

export default class BalanceService {
  static async deposit(userId: string, amount: number) {
    if (amount <= 0) throw new ApiError(400, 'Invalid amount');
    return prisma.$transaction(async (tx: any) => {
      const balance = await tx.balance.upsert({
        where: { userId },
        update: { amount: { increment: amount } },
        create: { userId, amount }
      });
      await tx.transaction.create({
        data: { userId, type: 'deposit', amount, status: 'success' }
      });
      return balance;
    });
  }
  static async getBalance(userId: string) {
    return prisma.balance.findUnique({ where: { userId } });
  }
  static async getTransactions(userId: string) {
    return prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
} 