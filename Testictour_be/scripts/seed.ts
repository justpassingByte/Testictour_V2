import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import PrizeCalculationService from '../src/services/PrizeCalculationService';

const prisma = new PrismaClient();

async function main() {
  console.log(`Bắt đầu quá trình seeding...`);

  // --- 1. Tạo người dùng hệ thống (SYSTEM_USER) ---
  const systemUserId = 'SYSTEM_USER_ID';
  const hashedPassword = await bcrypt.hash('a_very_secure_system_password_!@#$', 10);

  const systemUser = await prisma.user.upsert({
    where: { id: systemUserId },
    update: {},
    create: {
      id: systemUserId,
      username: 'system_admin',
      email: 'system@testic.tour',
      password: hashedPassword,
      role: 'ADMIN',
      riotGameName: 'System',
      riotGameTag: 'SYS',
      region: 'SYS',
    },
  });
  console.log(`Đã đảm bảo người dùng hệ thống tồn tại: ${systemUser.username}`);

  // --- 2. Tạo số dư cho người dùng hệ thống ---
  await prisma.balance.upsert({
      where: { userId: systemUserId },
      update: {},
      create: {
          userId: systemUserId,
          amount: 0, // Số dư ban đầu là 0
      }
  });
  console.log(`Đã đảm bảo người dùng hệ thống có bản ghi số dư.`);

  // --- Create a tournament directly ---
  const now = new Date();
  const startTime = new Date(now.getTime() + 1 * 60 * 1000); // 1 minutes from now
  const registrationDeadline = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now

  const directTournament = await prisma.tournament.create({
    data: {
      name: 'Giải Đấu Trực Tiếp',
      maxPlayers: 128,
      entryFee: 100,
      hostFeePercent: 0.1,
      expectedParticipants: 128,
      organizerId: systemUser.id,
      status: 'pending',
      startTime: startTime,
      registrationDeadline: registrationDeadline,
      prizeStructure: {
        "1": 0.5,
        "2": 0.25,
        "3": 0.15,
        "4": 0.1
      },
      phases: {
        create: [
          {
            phaseNumber: 1,
            name: "Vòng Loại (128 -> 64)",
            type: "elimination",
            status: "pending",
            numberOfRounds: 1,
            matchesPerRound: 1,
            lobbySize: 8,
            lobbyAssignment: "snake",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: false,
            tieBreakerRule: null,
            advancementCondition: {
              type: "placement",
              value: 5 
            }
          },
          {
            phaseNumber: 2,
            name: "Vòng Bảng (64 -> 32 -> 8)",
            type: "swiss",
            status: "pending",
            numberOfRounds: 2,
            matchesPerRound: 3,
            lobbySize: 8,
            lobbyAssignment: "swiss",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: true,
            tieBreakerRule: { "type": "highest_placement_in_last_game" },
            advancementCondition: {
              type: "tiered_advancement",
              details: [
                { "round": 1, "advances": 32 },
                { "round": 2, "advances": 8 }
              ]
            }
          },
          {
            phaseNumber: 3,
            name: "Vòng Chung Kết (Checkmate)",
            type: "checkmate",
            status: "pending",
            numberOfRounds: 1,
            lobbySize: 8,
            lobbyAssignment: "seeded",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: true,
            tieBreakerRule: { "type": "highest_placement_in_last_game" },
            advancementCondition: {
              type: "checkmate",
              pointsToActivate: 20,
              winCondition: "placement_1",
              maxRounds: 5
            }
          }
        ] as any
      }
    }
  });

  // --- Manually replicate the round creation logic from TournamentService ---
  // First, find the phases that were just created for this tournament
  const tournamentPhases = await prisma.phase.findMany({
    where: { tournamentId: directTournament.id },
    orderBy: { phaseNumber: 'asc' }
  });

  const firstPhase = tournamentPhases[0];
  if (firstPhase) {
    let lastRoundStartTime = new Date(directTournament.startTime.getTime() + 1 * 60 * 1000); // 1 min after tournament start
    const numberOfRounds = (firstPhase as any).numberOfRounds || 1;

    for (let i = 1; i <= numberOfRounds; i++) {
      const currentRoundStartTime = (i === 1)
        ? lastRoundStartTime
        : new Date(lastRoundStartTime.getTime() + 45 * 60 * 1000);

      await prisma.round.create({
        data: {
          phaseId: firstPhase.id,
          roundNumber: i,
          startTime: currentRoundStartTime,
          status: 'pending',
        },
      });
      lastRoundStartTime = currentRoundStartTime;
    }
    console.log(`Created ${numberOfRounds} rounds for the first phase of tournament ${directTournament.id}.`);
  }

  // --- Start: Participant Seeding Logic ---
  console.log(`\nSeeding 128 participants for tournament: ${directTournament.name}`);

  const usersToCreate = [];
  for (let i = 1; i <= 128; i++) {
    const uniqueId = `testuser_${Date.now()}_${i}`;
    // Generate random name
    const firstName = `User${i}`;
    const lastName = `Test${i}`;
    const randomGameName = `GameName${i}`;
    
    usersToCreate.push({
      username: uniqueId,
      email: `${uniqueId}@test.com`,
      password: hashedPassword,
      riotGameName: randomGameName,
      riotGameTag: `${1000 + i}`,
      region: 'vn',
    });
  }

  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });
  console.log(`${usersToCreate.length} users created or found.`);

  const createdUsers = await prisma.user.findMany({
    where: { email: { in: usersToCreate.map(u => u.email) } },
  });

  const balancesToCreate = createdUsers.map(user => ({
    userId: user.id,
    amount: (directTournament.entryFee || 0) + 1000,
  }));

  await prisma.balance.createMany({
    data: balancesToCreate,
    skipDuplicates: true,
  });
  console.log(`${balancesToCreate.length} balances created.`);

  const participantsToCreate = createdUsers.map(user => ({
    tournamentId: directTournament.id,
    userId: user.id,
    paid: true,
  }));
  
  await prisma.participant.createMany({
    data: participantsToCreate,
    skipDuplicates: true,
  });
  console.log(`${participantsToCreate.length} participants added to the tournament.`);
  
  const updatedActualCount = await prisma.participant.count({ where: { tournamentId: directTournament.id } });
  const hostFeePercent = (directTournament.hostFeePercent || 0.1);
  const originalPrizeStructure = directTournament.prizeStructure as any;

  // Calculate total distributable prize pool for the tournament
  const totalCollectedForTournament = updatedActualCount * (directTournament.entryFee || 0);
  const platformFeeForTournament = Math.floor(totalCollectedForTournament * hostFeePercent);
  const totalDistributablePrizePoolForTournament = totalCollectedForTournament - platformFeeForTournament;

  const { adjusted } = PrizeCalculationService.autoAdjustPrizeStructure(
    originalPrizeStructure,
    totalDistributablePrizePoolForTournament // Pass the calculated distributable prize pool
  );

  await prisma.tournament.update({
    where: { id: directTournament.id },
    data: {
      actualParticipantsCount: updatedActualCount,
      adjustedPrizeStructure: adjusted,
    },
  });
  console.log(`Tournament ${directTournament.id} actualParticipantsCount and adjustedPrizeStructure updated.`);
  // --- End: Participant Seeding Logic ---

  console.log('\nSeeding finished.');
  console.log(`Upserted system user: ${systemUser.email}`);
  console.log(`Created direct tournament: ${directTournament.name} with ID: ${directTournament.id}`);
}

main()
  .catch((e) => {
    console.error('Lỗi trong quá trình seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 