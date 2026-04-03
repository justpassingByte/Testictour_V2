import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import PrizeCalculationService from '../src/services/PrizeCalculationService';

const prisma = new PrismaClient();

const TOURNAMENT_ID_ARG = process.argv[2];
const PARTICIPANT_COUNT_ARG = parseInt(process.argv[3], 10) || 128;

async function main() {
  if (!TOURNAMENT_ID_ARG) {
    console.error('Please provide a tournament ID as the first argument.');
    process.exit(1);
  }

  console.log(`Seeding ${PARTICIPANT_COUNT_ARG} participants for tournament: ${TOURNAMENT_ID_ARG}`);

  const tournament = await prisma.tournament.findUnique({ where: { id: TOURNAMENT_ID_ARG }});
  if (!tournament) {
    console.error(`Tournament with ID ${TOURNAMENT_ID_ARG} not found.`);
    process.exit(1);
  }

  const hashedPassword = await hash('password123', 10);
  const usersToCreate = [];

  for (let i = 1; i <= PARTICIPANT_COUNT_ARG; i++) {
    const uniqueId = `testuser_${Date.now()}_${i}`;
    usersToCreate.push({
      username: uniqueId,
      email: `${uniqueId}@test.com`,
      password: hashedPassword,
      riotGameName: `TestUser`,
      riotGameTag: `${1000 + i}`,
      region: 'vn',
    });
  }

  // Create users in bulk
  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });
  console.log(`${usersToCreate.length} users created or found.`);

  // Find all created users
  const createdUsers = await prisma.user.findMany({
    where: { email: { in: usersToCreate.map(u => u.email) } },
  });

  // Create balances for new users
  const balancesToCreate = createdUsers.map(user => ({
    userId: user.id,
    amount: (tournament.entryFee || 0) + 1000, // Ensure they have enough for entry fee + extra
  }));

  await prisma.balance.createMany({
    data: balancesToCreate,
    skipDuplicates: true,
  });
  console.log(`${balancesToCreate.length} balances created.`);

  // Create participants in bulk
  const participantsToCreate = createdUsers.map(user => ({
    tournamentId: TOURNAMENT_ID_ARG,
    userId: user.id,
    paid: true, // Assume payment is handled by this script
  }));
  
  await prisma.participant.createMany({
    data: participantsToCreate,
    skipDuplicates: true,
  });
  console.log(`${participantsToCreate.length} participants added to the tournament.`);
  
  // --- NEW CODE TO EXPORT USER IDs ---
  // const allUserIds = createdUsers.map(user => user.id);
  // console.log('\n--- Generated User IDs for Mock API ---');
  // console.log(JSON.stringify(allUserIds, null, 2));
  // console.log('-------------------------------------\n');
  // --- END NEW CODE ---

  // After creating participants, update tournament's actualParticipantsCount and adjustedPrizeStructure
  const updatedActualCount = await prisma.participant.count({ where: { tournamentId: TOURNAMENT_ID_ARG } });
  const hostFeePercent = (tournament.hostFeePercent || 0.1);
  const originalPrizeStructure = tournament.prizeStructure as any;

  const { adjusted } = PrizeCalculationService.autoAdjustPrizeStructure(
    originalPrizeStructure,
    updatedActualCount,
    tournament.entryFee || 0,
    hostFeePercent
  );

  await prisma.tournament.update({
    where: { id: TOURNAMENT_ID_ARG },
    data: {
      actualParticipantsCount: updatedActualCount,
      adjustedPrizeStructure: adjusted,
    },
  });
  console.log(`Tournament ${TOURNAMENT_ID_ARG} actualParticipantsCount and adjustedPrizeStructure updated.`);

  // Note: This script bypasses the TransactionService for performance.
  // It doesn't create individual 'entry_fee' transactions.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 