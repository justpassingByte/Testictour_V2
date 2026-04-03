import { Job } from 'bullmq';
import RoundService from '../services/RoundService';

export default async function autoAdvanceRound(job: Job) {
  const { roundId } = job.data;
  try {
    await RoundService.autoAdvance(roundId);
    return { message: 'Round auto-advanced successfully', roundId };
  } catch (err: any) {
    console.error('autoAdvanceRound job failed:', err);
    throw err;
  }
} 