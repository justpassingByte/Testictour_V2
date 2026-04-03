import api from '../lib/apiConfig';

export class TransactionService {
  static async entryFee(tournamentId: string, amount: number): Promise<boolean> {
    try {
      await api.post('/transactions/entry-fee', { tournamentId, amount });
      return true;
      } catch  {
      console.error('Error during entry fee transaction:');
      throw new Error('Error during entry fee transaction');
    }
  }

  static async refund(tournamentId: string, amount: number): Promise<boolean> {
    try {
      await api.post('/transactions/refund', { tournamentId, amount });
      return true;
    } catch  {
      console.error('Error during refund transaction:');
      throw new Error('Error during refund transaction');
    }
  }

  static async payout(rewardId: string, amount: number): Promise<boolean> {
    try {
      await api.post('/transactions/payout', { rewardId, amount });
      return true;
    } catch  {
      console.error('Error during payout transaction:');
      throw new Error('Error during payout transaction');
    }
  }
} 