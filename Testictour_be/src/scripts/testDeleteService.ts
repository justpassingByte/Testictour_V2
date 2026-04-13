import { PrismaClient } from '@prisma/client';
import TournamentService from '../services/TournamentService';

const prisma = new PrismaClient();

async function run() {
  const t = await prisma.tournament.findFirst({
    where: {
      status: 'pending'
    },
    include: { phases: true }
  });
  if (!t) return console.log('no tournament');
  console.log('Trying to delete tournament', t.id, 'via TournamentService');
  try {
    await TournamentService.remove(t.id);
    console.log('Deleted successfully via TournamentService');
  } catch (e: any) {
    console.error('Delete error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
