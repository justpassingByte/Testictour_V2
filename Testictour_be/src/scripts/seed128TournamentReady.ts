// @ts-nocheck
/**
 * seed128TournamentReady.ts
 *
 * Seeds a 128-player tournament in PENDING state.
 * Configured with 2 phases:
 * Phase 1: Elimination (3 matches, advances Top 64).
 * Phase 2: Swiss (3 matches).
 * 
 * Running this script prepares the DB. Use the UI's "Start Tournament" 
 * to automatically group participants and trigger match logic.
 */

import { PrismaClient } from '@prisma/client';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function clearAllTournaments() {
  console.log('🧹 Clearing all old tournament data...');

  const allTournaments = await prisma.tournament.findMany({ select: { id: true } });
  const tourIds = allTournaments.map(t => t.id);

  const phases = await prisma.phase.findMany({ where: { tournamentId: { in: tourIds } }, select: { id: true } });
  const phaseIds = phases.map(p => p.id);

  const rounds = await prisma.round.findMany({ where: { phaseId: { in: phaseIds } }, select: { id: true } });
  const roundIds = rounds.map(r => r.id);

  const lobbies = await prisma.lobby.findMany({ where: { roundId: { in: roundIds } }, select: { id: true } });
  const lobbyIds = lobbies.map(l => l.id);

  const matches = await prisma.match.findMany({ where: { lobbyId: { in: lobbyIds } }, select: { id: true } });
  const matchIds = matches.map(m => m.id);

  await prisma.playerMatchSummary.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.match.deleteMany({ where: { lobbyId: { in: lobbyIds } } });
  await prisma.roundOutcome.deleteMany({ where: { roundId: { in: roundIds } } });
  await prisma.lobby.deleteMany({ where: { roundId: { in: roundIds } } });
  await prisma.round.deleteMany({ where: { phaseId: { in: phaseIds } } });
  await prisma.phase.deleteMany({ where: { tournamentId: { in: tourIds } } });
  await prisma.userTournamentSummary.deleteMany({ where: { tournamentId: { in: tourIds } } });
  await prisma.reward.deleteMany({ where: { tournamentId: { in: tourIds } } });
  await prisma.participant.deleteMany({ where: { tournamentId: { in: tourIds } } });
  await prisma.tournament.deleteMany();

  console.log(`✅ Cleared old tournaments.`);
}

async function ensure128Users() {
  // Check how many we have
  const currentCount = await prisma.user.count({
    where: { username: { startsWith: 'SimPlayer_' } }
  });

  if (currentCount >= 128) {
    console.log(`👥 We already have enough SimPlayer accounts.`);
    return await prisma.user.findMany({ where: { username: { startsWith: 'SimPlayer_' } }, take: 128 });
  }

  console.log(`👥 Creating 128 simulated users...`);
  const newUsers = [];

  // Use createMany to speed this up
  for (let i = 1; i <= 128; i++) {
    const id = uuidv4();
    newUsers.push({
      id: id,
      username: `SimPlayer_${i}_${Date.now()}`,
      email: `sim${i}_${Date.now()}@test.com`,
      password: 'hashedpassword_sim',
      riotGameName: `SimPlayer${i}`,
      riotGameTag: 'VN1',
      region: 'VN',
      puuid: `puuid_sim_${id}`
    });
  }

  await prisma.user.createMany({
    data: newUsers,
    skipDuplicates: true,
  });

  // Also need to create balance records for them so they dont crash on escrow/registration
  const createdUsers = await prisma.user.findMany({
    where: { username: { startsWith: 'SimPlayer_' } },
    take: 128
  });

  const balances = createdUsers.map(u => ({
    userId: u.id,
    amount: 1000,
    coins: 5000
  }));

  await prisma.balance.createMany({
    data: balances,
    skipDuplicates: true
  });

  return createdUsers;
}

async function main() {
  console.log('🌱 seed128TournamentReady — Creating a READY 128-player multi-phase tournament.\n');

  await clearAllTournaments();

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) { console.error('❌ No admin found'); process.exit(1); }

  const users = await ensure128Users();
  console.log(`👤 Assigned ${users.length} players to participate.`);

  const now = new Date();
  const startTime = new Date(now.getTime() + 10 * 60 * 1000); // starts in 10 mins

  const tournament = await prisma.tournament.create({
    data: {
      name: 'Grand 128-Player Dev Test',
      description: '🛠 Dev Tool auto-seeded 128-player tournament. Phase 1: 16 Lobbies -> Top 64. Phase 2: 8 Lobbies.',
      region: 'VN',
      startTime: startTime,
      endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'pending',
      organizerId: admin.id,
      prizeStructure: [{ rank: 1, percent: 50 }, { rank: 2, percent: 30 }, { rank: 3, percent: 20 }],
      expectedParticipants: 128,
      actualParticipantsCount: 128, // pre-filling
      maxPlayers: 128,
      entryFee: 0,
      registrationDeadline: startTime,
    },
  });
  console.log(`🏆 Tournament created: ${tournament.name} (${tournament.id})`);

  // Initialize Escrow
  await prisma.escrow.create({
    data: {
      tournamentId: tournament.id,
      status: 'init',
      requiredAmount: 500, // mock required escrow
      fundedAmount: 0,
    }
  });

  // Add 128 Participants
  const participantsData = users.map(u => ({
    tournamentId: tournament.id,
    userId: u.id,
    paid: true
  }));

  await prisma.participant.createMany({
    data: participantsData
  });
  console.log(`✅ 128 participants registered.`);

  // Phase 1 - Elimination (3 Matches per round)
  await prisma.phase.create({
    data: {
      tournamentId: tournament.id,
      name: 'Group Stage (Elimination)',
      phaseNumber: 1,
      type: 'elimination',
      status: 'PENDING',
      lobbySize: 8,
      matchesPerRound: 1,
      numberOfRounds: 4, // 4 Groups (Bảng A,B,C,D) -> Note: Pre-assign will create Rounds based on Phase 1 existing, or we just configure Phase and Pre-assign creates rounds.
      // preAssignGroups looks for firstPhase structure. Wait, preAssignGroups CREATES the Rounds! 
      // ACTUALLY our preAssignGroups creates Rounds inside firstPhase dynamically!
      // I'll just set numberOfRounds to null, let the system handle it. Actually the schema allows Int?, so I'll put 4.
      advancementCondition: { type: 'placement', value: 4 },
      pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
    },
  });

  // Phase 2 - Swiss Final (3 Matches per round)
  await prisma.phase.create({
    data: {
      tournamentId: tournament.id,
      name: 'Swiss Finals',
      phaseNumber: 2,
      type: 'swiss',
      status: 'PENDING',
      lobbySize: 8,
      matchesPerRound: 3,
      pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
      carryOverScores: false,
    },
  });

  console.log(`\n🎉 Success! Tournament seeded.`);
  console.log(`➡️ Go to UI, approve escrow/assert, and click "Start Tournament".`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
