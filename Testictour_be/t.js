const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const rounds = await prisma.round.findMany({
    select: {
      id: true,
      status: true,
      roundNumber: true,
      phase: {
        select: {
          tournamentId: true,
          phaseNumber: true
        }
      },
      lobbies: { select: { id: true } }
    }
  });
  console.log(JSON.stringify(rounds, null, 2));

  const tour = await prisma.tournament.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, name: true }
  });
  console.log('Latest tour:', tour);

}
main().finally(() => prisma.$disconnect());
