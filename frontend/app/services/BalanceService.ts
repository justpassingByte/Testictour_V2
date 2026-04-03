import { IBalance } from '../types/balance';
import { ITransaction } from '../types/transaction';
import api from '../lib/apiConfig';

export class BalanceService {
  static async deposit(amount: number): Promise<IBalance> {
    try {
      const response = await api.post('/balance/deposit', { amount });
      const balance: IBalance = response.data;
      return balance;
      } catch  {
      console.error('Error during deposit:');
      throw new Error('Error during deposit');
    }
  }

  static async getBalance(userId: string): Promise<IBalance | null> {
    try {
      const response = await api.get(`/balance/${userId}`);
      const balance: IBalance = response.data;
      return balance;
      } catch  {
      console.error('Error fetching balance:');
      throw new Error('Error fetching balance');
    }
  }

  static async getTransactions(userId: string): Promise<ITransaction[]> {
    try {
      const response = await api.get(`/transactions/${userId}`);
      const transactions: ITransaction[] = response.data;
      return transactions;
      } catch  {
      console.error('Error fetching transactions:');
      throw new Error('Error fetching transactions');
    }
  }
} 