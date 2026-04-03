export interface ITransaction {
  id: string;
  userId: string;
  type: 'entry_fee' | 'refund' | 'reward' | 'deposit';
  amount: number;
  status: string;
  refId?: string;
  createdAt: Date;
} 