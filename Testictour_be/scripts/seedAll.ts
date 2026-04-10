import { execSync } from 'child_process';
import { prisma } from '../src/services/prisma';

async function seedAll() {
  console.log('--- Starting Complete Database Seed ---');

  try {
    // 1. Clear db first (optional but recommended when seeding everything)
    console.log('Clearing old data...');
    await prisma.playerMatchSummary.deleteMany({});
    await prisma.roundOutcome.deleteMany({});
    await prisma.matchResult.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.miniTourMatchResult.deleteMany({});
    await prisma.miniTourMatch.deleteMany({});
    await prisma.miniTourLobbyParticipant.deleteMany({});
    await prisma.miniTourLobby.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.lobby.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.phase.deleteMany({});
    await prisma.tournament.deleteMany({});
    
    // We don't delete users entirely, just clear the test ones if we wanted to
    // But since seedUsers handles upserts, let's just let it run.
    console.log('Running Seed Scripts...');

    // 2. Run core seeders in order
    console.log('➡️ Seeding Users...');
    execSync('npx ts-node scripts/seedUsers.ts', { stdio: 'inherit' });

    console.log('\n➡️ Seeding Main Tournament (Grimoire Format)...');
    execSync('npx ts-node scripts/seedGrimoireTournament.ts', { stdio: 'inherit' });

    console.log('\n➡️ Seeding MiniTour Lobby...');
    execSync('npx ts-node scripts/testMiniTourLobby.ts', { stdio: 'inherit' });

    console.log('\n✅ All primary mock data successfully seeded!');
    console.log('NOTE: To get real match data, please use the Dev Tools page in the Admin Dashboard to fetch real matches from the Riot API.');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedAll();
