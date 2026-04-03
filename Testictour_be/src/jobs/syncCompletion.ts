import { Job } from 'bullmq';
import { prisma } from '../services/prisma';
import logger from '../utils/logger';

interface SyncCompletionJobData {
  tournamentId: string;
}

export default async function (job: Job<SyncCompletionJobData>) {
  const { tournamentId } = job.data;
  logger.info(`Processing sync-completion job for tournament ${tournamentId}`);

  try {
    let allSuccess = true;
    
    // getDependencies() returns an object with keys 'processed', 'unprocessed', 'failed'
    const childJobs = await job.getDependencies(); 

    if (childJobs.unprocessed && childJobs.unprocessed.length > 0) {
        logger.warn(`Sync completion for ${tournamentId} is running, but some child jobs were unprocessed. Marking as FAILED.`);
        allSuccess = false;
    } else if (childJobs.failed && childJobs.failed.length > 0) {
        logger.warn(`Sync completion for ${tournamentId} found ${childJobs.failed.length} failed child jobs. Marking as FAILED.`);
        allSuccess = false;
    }

    const finalStatus = allSuccess ? 'SUCCESS' : 'FAILED';

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { syncStatus: finalStatus },
    });

    logger.info(`Tournament ${tournamentId} sync status updated to ${finalStatus}`);

  } catch (error: any) {
    logger.error(`Error processing sync-completion for tournament ${tournamentId}:`, error);
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { syncStatus: 'FAILED' },
    }).catch(e => logger.error(`Failed to fallback-update tournament ${tournamentId} to FAILED`, e));
    throw error;
  }
} 