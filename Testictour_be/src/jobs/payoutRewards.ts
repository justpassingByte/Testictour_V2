import { Job } from 'bullmq';

export default async function payoutRewards(job: Job) {
  const { tournamentId } = job.data;
  // TODO: calculate rewards, call TransactionService.payout for each winner
  return { message: 'payoutRewards not implemented', tournamentId };
} 