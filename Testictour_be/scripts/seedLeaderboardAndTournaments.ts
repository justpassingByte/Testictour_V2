import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding leaderboard and tournament data...");

  const hashedPassword = await hash('password123', 10);

  // 1. Seed Leaderboard Players
  const players = [
    { username: 'Faker', region: 'KR', riotGameName: 'Hide on bush', riotGameTag: 'KR1' },
    { username: 'Chovy', region: 'KR', riotGameName: 'Chovy', riotGameTag: 'GEN' },
    { username: 'Bin', region: 'CN', riotGameName: 'Bin', riotGameTag: 'BLG' },
    { username: 'Knight', region: 'CN', riotGameName: 'Knight', riotGameTag: 'BLG' },
    { username: 'Caps', region: 'EU', riotGameName: 'Caps', riotGameTag: 'G2' },
    { username: 'TenZ', region: 'NA', riotGameName: 'TenZ', riotGameTag: 'SEN' },
    { username: 'Levi', region: 'VN', riotGameName: 'Levi', riotGameTag: 'GAM' },
    { username: 'SofM', region: 'VN', riotGameName: 'SofM', riotGameTag: 'VCS' },
    { username: 'Peanut', region: 'KR', riotGameName: 'Peanut', riotGameTag: 'HLE' },
    { username: 'Ruler', region: 'CN', riotGameName: 'Ruler', riotGameTag: 'JDG' },
  ];

  let adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) {
    const adminUnique = `admin_test_${Date.now()}`;
    adminUser = await prisma.user.create({
      data: {
        username: adminUnique,
        email: `${adminUnique}@test.com`,
        password: hashedPassword,
        role: 'admin',
        riotGameName: 'Admin',
        riotGameTag: 'TEST',
        region: 'VN'
      }
    });
  }

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const totalPoints = Math.floor(Math.random() * 10000) + 5000;
    const tournamentsPlayed = Math.floor(Math.random() * 20) + 10;
    const tournamentsWon = Math.floor(Math.random() * 5);
    const topFourRate = Math.floor(Math.random() * 40) + 30; // 30-70%
    const lobbiesPlayed = tournamentsPlayed * Math.floor(Math.random() * 3 + 2);
    const averagePlacement = parseFloat((Math.random() * 4 + 1).toFixed(1));

    await prisma.user.upsert({
      where: { username: p.username },
      update: {
        totalPoints,
        tournamentsPlayed,
        tournamentsWon,
        topFourRate,
        lobbiesPlayed,
        averagePlacement,
        rank: 'Challenger',
        totalMatchesPlayed: lobbiesPlayed,
      },
      create: {
        username: p.username,
        email: `${p.username.toLowerCase()}@test.com`,
        password: hashedPassword,
        riotGameName: p.riotGameName,
        riotGameTag: p.riotGameTag,
        region: p.region,
        totalPoints,
        tournamentsPlayed,
        tournamentsWon,
        topFourRate,
        lobbiesPlayed,
        averagePlacement,
        rank: 'Challenger',
        totalMatchesPlayed: lobbiesPlayed,
      }
    });
    console.log(`Upserted player ${p.username} with ${totalPoints} points.`);
  }

  // 2. Seed Tournaments
  const prizeStructure = [
    { rank: 1, percent: 50 },
    { rank: 2, percent: 30 },
    { rank: 3, percent: 20 },
  ];

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const mockTournaments = [
    {
      name: 'Spring Championship 2026',
      description: 'The biggest tournament of the spring season.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80',
      region: 'Global',
      startTime: nextWeek,
      registrationDeadline: tomorrow,
      entryFee: 100,
      maxPlayers: 128,
      status: 'upcoming',
      prizeStructure,
      expectedParticipants: 128,
    },
    {
      name: 'Weekend Cash Cup',
      description: 'Quick tournament for the weekend.',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80',
      region: 'EU',
      startTime: tomorrow,
      registrationDeadline: tomorrow,
      entryFee: 50,
      maxPlayers: 64,
      status: 'upcoming',
      prizeStructure,
      expectedParticipants: 64,
    },
    {
      name: 'VCS Summer Open',
      description: 'Open to all players in the Vietnam region.',
      image: 'https://images.unsplash.com/photo-1605806616949-0187dd1a7dd0?auto=format&fit=crop&q=80',
      region: 'VN',
      startTime: pastWeek,
      endTime: new Date(pastWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      registrationDeadline: pastWeek,
      entryFee: 0,
      maxPlayers: 256,
      status: 'completed',
      prizeStructure,
      expectedParticipants: 256,
    }
  ];

  for (const t of mockTournaments) {
    const existing = await prisma.tournament.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.tournament.create({
        data: {
          ...t,
          organizerId: adminUser.id,
        }
      });
      console.log(`Created tournament ${t.name}.`);
    } else {
      console.log(`Tournament ${t.name} already exists.`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
