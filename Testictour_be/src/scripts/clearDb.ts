import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database clearing process...');

  // The order of deletion is important to avoid foreign key constraint violations.
  // We delete from models that have dependencies on others first.
  await prisma.$transaction([
    prisma.playerMatchSummary.deleteMany(),
    prisma.userTournamentSummary.deleteMany(),
    prisma.roundOutcome.deleteMany(),
    prisma.matchResult.deleteMany(),
    prisma.reward.deleteMany(),
    prisma.match.deleteMany(),
    prisma.lobby.deleteMany(),
    prisma.miniTourLobbyParticipant.deleteMany(),
    prisma.miniTourMatchResult.deleteMany(),
    prisma.miniTourMatch.deleteMany(),
    prisma.miniTourLobby.deleteMany(),
    prisma.round.deleteMany(),
    prisma.phase.deleteMany(),
    prisma.participant.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.balance.deleteMany(),
    prisma.tournament.deleteMany(),
    prisma.tournamentTemplate.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('Database has been cleared successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 