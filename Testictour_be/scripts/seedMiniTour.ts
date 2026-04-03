import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MiniTour Lobby data...');

  // TODO: Replace with actual existing user emails you want to join
  const EXISTING_USER_EMAILS = [
    'ko_biết_yêu@imported.user',
    'ken@imported.user',
    '1ttđ_nvt@imported.user',
    'ng_tinh_mua_dong@imported.user',
    'navy1@imported.user',
    'my_seven_dogs@imported.user',
    'titiuoi@imported.user',
    'kaiju_no_666@imported.user',
  ];
  const EXISTING_LOBBY_ID = '67c569cd-0247-4af8-81a0-21da9b834eb9'; // TODO: Replace with an actual existing lobby ID

  const miniTourLobby = await prisma.miniTourLobby.findUnique({
    where: { id: EXISTING_LOBBY_ID },
    include: {
      participants: true,
      creator: true
    }
  });

  if (!miniTourLobby) {
    console.error(`MiniTour Lobby with ID ${EXISTING_LOBBY_ID} not found. Please create this lobby first or update the ID.`);
    process.exit(1);
    return;
  }
  console.log(`Found existing MiniTour Lobby: ${miniTourLobby.name}`);

  for (const email of EXISTING_USER_EMAILS) {
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!existingUser) {
      console.error(`User with email ${email} not found. Skipping this user.`);
      continue;
    }
    console.log(`Attempting to join user: ${existingUser.username}`);

    // Check if user is already a participant in the fetched lobby object
    const isAlreadyParticipant = miniTourLobby.participants.some(p => p.userId === existingUser.id);
    if (isAlreadyParticipant) {
      console.log(`${existingUser.username} is already a participant in ${miniTourLobby.name}. Skipping.`);
      continue;
    }

    // Ensure user has enough balance
    let userBalance = await prisma.balance.findUnique({
      where: { userId: existingUser.id },
    });

    if (!userBalance) {
      userBalance = await prisma.balance.create({
        data: { userId: existingUser.id, amount: 0 },
      });
    }

    const requiredBalance = miniTourLobby.entryFee;
    if (userBalance.amount < requiredBalance) {
      // Top up user's balance if insufficient
      await prisma.balance.update({
        where: { userId: existingUser.id },
        data: { amount: { increment: requiredBalance - userBalance.amount + 100 } }, // Add a buffer
      });
      console.log(`Topped up ${existingUser.username}'s balance to ${requiredBalance + 100} to cover entry fee.`);
    }

    // Use a transaction to ensure atomicity for balance, lobby, and participant updates
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Deduct entry fee from user's balance
        await tx.balance.update({
          where: { userId: existingUser.id },
          data: { amount: { decrement: miniTourLobby.entryFee } },
        });
        console.log(`Deducted ${miniTourLobby.entryFee} from ${existingUser.username}'s balance.`);

        // 2. Calculate fees
        const CREATOR_FEE_PERCENT = 0.10; // 10% for creator
        const PLATFORM_FEE_PERCENT = 0.10; // 10% for platform
        const creatorFee = miniTourLobby.entryFee * CREATOR_FEE_PERCENT;
        const platformFee = miniTourLobby.entryFee * PLATFORM_FEE_PERCENT;
        const distributableAmount = miniTourLobby.entryFee - creatorFee - platformFee;

        // 3. Transfer fee to lobby creator (assuming creator has a balance record)
        if (creatorFee > 0 && miniTourLobby.creatorId) {
          await tx.balance.upsert({
            where: { userId: miniTourLobby.creatorId },
            update: { amount: { increment: creatorFee } },
            create: { userId: miniTourLobby.creatorId, amount: creatorFee }, // Create if not exists
          });
          console.log(`Transferred ${creatorFee} to lobby creator ${miniTourLobby.creatorId}.`);
        }

        // 4. Transfer fee to platform (assuming system account has a balance record)
        if (platformFee > 0) {
          await tx.balance.upsert({
            where: { userId: 'SYSTEM_USER_ID' },
            update: { amount: { increment: platformFee } },
            create: { userId: 'SYSTEM_USER_ID', amount: platformFee }, // Create if not exists
          });
          console.log(`Transferred ${platformFee} to system account.`);
        }

        // 5. Record the transaction for the user
        await tx.transaction.create({
          data: {
            userId: existingUser.id,
            type: 'entry_fee',
            amount: -miniTourLobby.entryFee,
            status: 'success',
            refId: miniTourLobby.id,
          },
        });
        console.log(`Recorded entry fee transaction for ${existingUser.username}.`);

        // 6. Add the user to the participant list
        await tx.miniTourLobbyParticipant.create({
          data: {
            miniTourLobby: { connect: { id: miniTourLobby.id } },
            user: { connect: { id: existingUser.id } },
          },
        });
        console.log(`Added ${existingUser.username} to ${miniTourLobby.name}.`);

        // 7. Update lobby with player count and prize pool
        await tx.miniTourLobby.update({
          where: { id: miniTourLobby.id },
          data: {
            currentPlayers: { increment: 1 },
            prizePool: { increment: distributableAmount },
          },
        });
        console.log(`Updated lobby ${miniTourLobby.name} player count and prize pool.`);
      });
    } catch (error: any) {
      console.error(`Failed to join ${existingUser.username} to lobby: ${error.message}`);
    }
  }

  const finalMiniTourLobby = await prisma.miniTourLobby.findUnique({
    where: { id: miniTourLobby.id },
    include: { participants: true }
  });
  console.log(`Final MiniTour Lobby state: ${JSON.stringify(finalMiniTourLobby, null, 2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 