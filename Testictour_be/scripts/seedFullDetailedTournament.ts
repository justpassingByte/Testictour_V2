import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

function getPointsForPlacement(placement: number) {
  const points = [8, 7, 6, 5, 4, 3, 2, 1];
  return points[placement - 1] || 0;
}

async function main() {
  console.log('Seeding fully detailed tournament...');

  // 1. Get or Create a Completed Tournament
  let tournament = await prisma.tournament.findFirst({
    where: { name: 'VCS Summer Open' }
  });

  if (!tournament) {
    console.error('VCS Summer Open tournament not found! Please run seedLeaderboardAndTournaments.ts first.');
    process.exit(1);
  }

  // Ensure it's completed
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'COMPLETED' }
  });

  // 2. Fetch Users to participate (e.g. 16 players)
  const users = await prisma.user.findMany({
    take: 16
  });

  if (users.length < 8) {
    console.log('Not enough users found to seed a lobby. Need at least 8.');
    process.exit(1);
  }

  console.log(`Found ${users.length} users. Registering them as participants...`);

  // 3. Create Participants
  for (const user of users) {
    await prisma.participant.upsert({
      where: {
        userId_tournamentId: {
          userId: user.id,
          tournamentId: tournament.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        tournamentId: tournament.id,
        paid: true,
      }
    });
  }

  const participants = await prisma.participant.findMany({
    where: { tournamentId: tournament.id },
    include: { user: true }
  });

  // 4. Create a Phase
  const phase = await prisma.phase.upsert({
    where: {
      tournamentId_phaseNumber: {
        tournamentId: tournament.id,
        phaseNumber: 1
      }
    },
    update: {},
    create: {
      tournamentId: tournament.id,
      name: 'Group Stage',
      phaseNumber: 1,
      type: 'swiss', // or elimination
      status: 'COMPLETED',
      lobbySize: 8,
      matchesPerRound: 1,
      numberOfRounds: 1,
    }
  });

  // 5. Create a Round
  const round = await prisma.round.upsert({
    where: {
      phaseId_roundNumber: {
        phaseId: phase.id,
        roundNumber: 1
      }
    },
    update: {},
    create: {
      phaseId: phase.id,
      roundNumber: 1,
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(),
    }
  });

  console.log('Cleaning up old lobbies and matches for this round...');
  const existingLobbies = await prisma.lobby.findMany({ where: { roundId: round.id } });
  const lobbyIds = existingLobbies.map(l => l.id);
  const existingMatches = await prisma.match.findMany({ where: { lobbyId: { in: lobbyIds } } });
  const matchIds = existingMatches.map(m => m.id);

  await prisma.playerMatchSummary.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.match.deleteMany({ where: { lobbyId: { in: lobbyIds } } });
  await prisma.lobby.deleteMany({ where: { roundId: round.id } });

  // 6. Split Participants into Lobbies of 8
  const lobbyCount = Math.ceil(participants.length / 8);
  for (let i = 0; i < lobbyCount; i++) {
    const lobbyParticipants = participants.slice(i * 8, (i + 1) * 8);
    const participantJson = lobbyParticipants.map(p => ({
      participantId: p.id,
      userId: p.userId,
      username: p.user.username
    }));

    // Create Lobby
    const lobby = await prisma.lobby.create({
      data: {
        roundId: round.id,
        name: `Lobby ${i + 1}`,
        participants: participantJson,
        completedMatchesCount: 1,
        fetchedResult: true,
      }
    });

    const matchIdRiotApi = `VN_${uuidv4()}`;

    // Generate random placements
    const placements = Array.from({ length: lobbyParticipants.length }, (_, i) => i + 1);
    placements.sort(() => Math.random() - 0.5);

    // Build MatchData
    const matchDataParticipants = lobbyParticipants.map((p, j) => {
       const placement = placements[j];
       const points = getPointsForPlacement(placement);
       return {
         puuid: p.userId, // Maps to participantId in the frontend store
         placement,
         points, // Injects tournament points into match data
         level: 8,
         gold_left: Math.floor(Math.random() * 50),
         last_round: 30 + Math.floor(Math.random() * 10),
         augments: ["TFT9_Augment_ArmorClad", "TFT9_Augment_Dedication", "TFT9_Augment_Medkit"],
         traits: [
           { name: "Set9_Demacia", tier_current: 2, tier_total: 3, style: 2, num_units: 5 },
           { name: "Set9_Noxus", tier_current: 1, tier_total: 3, style: 1, num_units: 3 }
         ],
         units: [
           { character_id: "TFT9_Garen", tier: 2, itemNames: ["TFT_Item_Bloodthirster", "TFT_Item_MadredsBloodrazor"] },
           { character_id: "TFT9_Lux", tier: 2, itemNames: ["TFT_Item_JeweledGauntlet", "TFT_Item_ArchangelsStaff"] },
           { character_id: "TFT9_Darius", tier: 2, itemNames: ["TFT_Item_InfinityEdge"] }
         ]
       };
    });

    const matchData = {
      metadata: { match_id: matchIdRiotApi },
      info: {
         gameCreation: Date.now() - 30 * 60 * 1000,
         gameDuration: 1800 + Math.floor(Math.random() * 400), // Random duration around 30-36 minutes
         participants: matchDataParticipants
      }
    };

    // Create Match
    const match = await prisma.match.create({
      data: {
        lobbyId: lobby.id,
        matchIdRiotApi,
        matchData: matchData,
        fetchedAt: new Date(),
      }
    });

    // Record Match Results
    for (let j = 0; j < lobbyParticipants.length; j++) {
      const p = lobbyParticipants[j];
      const placement = placements[j];
      const points = getPointsForPlacement(placement);

      await prisma.matchResult.create({
        data: {
          matchId: match.id,
          userId: p.userId,
          placement,
          points,
        }
      });

      // Update participant score
      await prisma.participant.update({
        where: { id: p.id },
        data: { scoreTotal: { increment: points } }
      });
      
      // Update UserTournamentSummary
      await prisma.userTournamentSummary.upsert({
        where: {
          userId_tournamentId: {
            userId: p.userId,
            tournamentId: tournament.id
          }
        },
        update: {
          points: { increment: points },
          placement: placement, // Simplification
        },
        create: {
          userId: p.userId,
          tournamentId: tournament.id,
          joinedAt: new Date(),
          points: points,
          placement: placement,
        }
      });
      
      // Update PlayerMatchSummary
      await prisma.playerMatchSummary.create({
        data: {
          userId: p.userId,
          matchId: match.id,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          roundNumber: 1,
          placement: placement,
          points: points,
          playedAt: new Date()
        }
      })
    }

    console.log(`Lobby ${i + 1} and Match seeded.`);
  }

  // Update actual tournament participants
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { actualParticipantsCount: participants.length }
  });

  console.log(`Detailed data successfully seeded for tournament ${tournament.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
