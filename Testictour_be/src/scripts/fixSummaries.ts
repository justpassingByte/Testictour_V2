/**
 * Script để sửa chữa và tạo lại các summaries cho các tournament đã hoàn thành
 * Chạy với lệnh: ts-node fixSummaries.ts [tournamentId]
 * Nếu không cung cấp tournamentId, script sẽ kiểm tra và sửa tất cả tournament đã hoàn thành
 */

import { prisma } from '../services/prisma';
import SummaryManagerService from '../services/SummaryManagerService';
import logger from '../utils/logger';

// Khởi tạo SummaryManagerService
SummaryManagerService.initWorkers();

async function fixSummariesForTournament(tournamentId: string) {
  try {
    logger.info(`Fixing summaries for tournament ${tournamentId}`);
    
    // Kiểm tra xem tournament có tồn tại không
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            participants: true
          }
        }
      }
    });
    
    if (!tournament) {
      logger.error(`Tournament ${tournamentId} not found`);
      return;
    }
    
    // Kiểm tra xem đã có summaries chưa
    const existingSummaries = await prisma.userTournamentSummary.findMany({
      where: { tournamentId }
    });
    
    logger.info(`Found ${existingSummaries.length} existing summaries for tournament ${tournamentId} with ${tournament._count.participants} participants`);
    
    if (existingSummaries.length > 0) {
      // Xóa các summaries hiện có
      logger.warn(`Deleting ${existingSummaries.length} existing summaries for tournament ${tournamentId}`);
      await prisma.userTournamentSummary.deleteMany({
        where: { tournamentId }
      });
    }
    
    // Xử lý trực tiếp tất cả summaries
    await SummaryManagerService.processCompletedTournamentDirectly(tournamentId);
    
    // Kiểm tra kết quả
    const newSummaries = await prisma.userTournamentSummary.findMany({
      where: { tournamentId }
    });
    
    logger.info(`Fixed summaries for tournament ${tournamentId}. Now has ${newSummaries.length} summaries.`);
    
    return {
      tournamentId,
      name: tournament.name,
      participants: tournament._count.participants,
      oldSummaries: existingSummaries.length,
      newSummaries: newSummaries.length
    };
  } catch (error) {
    logger.error(`Error fixing summaries for tournament ${tournamentId}: ${error}`);
    return {
      tournamentId,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function fixAllCompletedTournaments() {
  try {
    // Tìm tất cả các tournament đã hoàn thành
    const completedTournaments = await prisma.tournament.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' } // Using createdAt instead of updatedAt
    });
    
    logger.info(`Found ${completedTournaments.length} completed tournaments to check`);
    
    const results = [];
    
    // Xử lý từng tournament
    for (const tournament of completedTournaments) {
      const result = await fixSummariesForTournament(tournament.id);
      results.push(result);
      
      // Đợi 1 giây giữa các tournament để tránh quá tải hệ thống
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // In kết quả tổng hợp
    logger.info('--- Summary Repair Results ---');
    results.forEach(result => {
      if (result) {
        if ('error' in result) {
          logger.error(`- Tournament ${result.tournamentId}: ERROR - ${result.error}`);
        } else {
          logger.info(`- Tournament ${result.tournamentId} (${result.name}): ${result.oldSummaries} → ${result.newSummaries} summaries (${result.participants} participants)`);
        }
      }
    });
    
    return results;
  } catch (error) {
    logger.error(`Error processing tournaments: ${error}`);
  } finally {
    // Đảm bảo kết thúc tiến trình sau 10 giây
    setTimeout(() => process.exit(0), 10000);
  }
}

// Xử lý tham số dòng lệnh
const tournamentId = process.argv[2];

// Run the function based on params
if (tournamentId) {
  logger.info(`Starting fix for specific tournament: ${tournamentId}`);
  fixSummariesForTournament(tournamentId)
    .then(() => {
      logger.info('Fix completed');
      setTimeout(() => process.exit(0), 5000);
    })
    .catch(error => {
      logger.error(`Error: ${error}`);
      process.exit(1);
    });
} else {
  logger.info('Starting fix for all completed tournaments');
  fixAllCompletedTournaments()
    .then(() => {
      logger.info('All tournaments processed');
    })
    .catch(error => {
      logger.error(`Error: ${error}`);
      process.exit(1);
    });
} 