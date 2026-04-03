import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding empty tournament data...');

  // Create admin user if it doesn't exist
  const hashedPassword = await hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      riotGameName: 'Admin',
      riotGameTag: 'TEST',
      region: 'vn',
    },
  });

  // --- Create an empty tournament ---
  const now = new Date();
  const startTime = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
  const registrationDeadline = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day from now

  const emptyTournament = await prisma.tournament.create({
    data: {
      name: 'Giải Đấu Tổng Hợp Mùa Hè 2025',
      maxPlayers: 64,
      entryFee: 150,
      hostFeePercent: 0.1,
      expectedParticipants: 64,
      organizerId: admin.id,
      status: 'pending',
      startTime: startTime,
      registrationDeadline: registrationDeadline,
      prizeStructure: {
        "1": 0.4,
        "2": 0.25,
        "3": 0.15,
        "4": 0.1,
        "5-8": 0.025
      },
      phases: {
        create: [
          {
            phaseNumber: 1,
            name: "Vòng Loại (64 -> 32)",
            type: "elimination",
            status: "pending",
            numberOfRounds: 1,
            matchesPerRound: 1,
            lobbySize: 8,
            lobbyAssignment: "snake",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: false,
            tieBreakerRule: { "type": "highest_placement_in_last_game" },
            advancementCondition: {
              type: "placement",
              value: 4 
            }
          },
          {
            phaseNumber: 2,
            name: "Vòng Tứ Kết (32 -> 16)",
            type: "swiss",
            status: "pending",
            numberOfRounds: 1,
            matchesPerRound: 2,
            lobbySize: 8,
            lobbyAssignment: "swiss",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: true,
            tieBreakerRule: { "type": "sum_of_placements" },
            advancementDetails: [
              { "round": 1, "advances": 16 }
            ]
          },
          {
            phaseNumber: 3,
            name: "Vòng Bán Kết (16 -> 8)",
            type: "elimination",
            status: "pending",
            numberOfRounds: 1,
            matchesPerRound: 1,
            lobbySize: 8,
            lobbyAssignment: "seeded",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: true,
            tieBreakerRule: { "type": "highest_placement_in_last_game" },
            advancementCondition: {
              type: "placement",
              value: 4
            }
          },
          {
            phaseNumber: 4,
            name: "Vòng Chung Kết",
            type: "checkmate",
            status: "pending",
            numberOfRounds: 1,
            lobbySize: 8,
            lobbyAssignment: "seeded",
            pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1],
            carryOverScores: true,
            tieBreakerRule: { "type": "highest_placement_in_last_game" },
            advancementCondition: {
              pointsToActivate: 25,
              winCondition: "placement_1"
            }
          }
        ] as any
      }
    }
  });

  // --- Create rounds for each phase ---
  const tournamentPhases = await prisma.phase.findMany({
    where: { tournamentId: emptyTournament.id },
    orderBy: { phaseNumber: 'asc' }
  });

  let cumulativeTimeOffset = 0;
  
  for (const phase of tournamentPhases) {
    const numberOfRounds = (phase as any).numberOfRounds || 1;
    
    for (let i = 1; i <= numberOfRounds; i++) {
      // Calculate start time: tournament start time + cumulative time offset
      // Each round is 45 minutes apart within phases, and phases are 2 hours apart
      const phaseOffset = (phase.phaseNumber - 1) * 120; // 2 hours between phases
      const roundOffset = (i - 1) * 45; // 45 minutes between rounds in the same phase
      cumulativeTimeOffset = phaseOffset + roundOffset;
      
      const roundStartTime = new Date(emptyTournament.startTime.getTime() + cumulativeTimeOffset * 60 * 1000);

      await prisma.round.create({
        data: {
          phaseId: phase.id,
          roundNumber: i,
          startTime: roundStartTime,
          status: 'pending',
        },
      });
    }
    console.log(`Created ${numberOfRounds} rounds for phase ${phase.phaseNumber} of tournament ${emptyTournament.id}.`);
  }

  console.log('\nSeeding finished.');
  console.log(`Upserted admin user: ${admin.email}`);
  console.log(`Created empty tournament: ${emptyTournament.name} with ID: ${emptyTournament.id}`);
  console.log('No participants were added to this tournament. Registration is open!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 