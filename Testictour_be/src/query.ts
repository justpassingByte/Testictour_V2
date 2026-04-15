import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestTours = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { 
      phases: {
        include: {
          rounds: {
            include: { lobbies: true }
          }
        }
      }
    }
  });

  const t = latestTours[0];
  for (const phase of t.phases) {
    for (const round of phase.rounds) {
      if (round.roundNumber === 2) {
        for (const lobby of round.lobbies) {
          const participants = lobby.participants as any[];
          console.log(`Lobby: ${lobby.id} | Name: ${lobby.name} | First Player: ${participants && participants.length > 0 ? participants[0] : 'None'}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
