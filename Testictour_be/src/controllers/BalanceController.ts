import { Request, Response, NextFunction } from 'express';
import BalanceService from '../services/BalanceService';

export default {
  async deposit(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount } = req.body;
      const result = await BalanceService.deposit((req as any).user.id, amount);
      res.json({ result });
    } catch (err) {
      next(err);
    }
  },
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const balance = await BalanceService.getBalance((req as any).user.id);
      res.json({ balance });
    } catch (err) {
      next(err);
    }
  },
  async getBalanceByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const balance = await BalanceService.getBalance(req.params.userId);
      res.json({ balance });
    } catch (err) {
      next(err);
    }
  },
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const transactions = await BalanceService.getTransactions((req as any).user.id);
      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  },
  async getTransactionsByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const transactions = await BalanceService.getTransactions(req.params.userId);
      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  }
};
