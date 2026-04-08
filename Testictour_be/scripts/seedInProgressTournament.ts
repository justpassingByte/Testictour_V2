// @ts-nocheck
import { PrismaClient } from '@prisma/client';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

function pts(placement: number) {
  return [8, 7, 6, 5, 4, 3, 2, 1][placement - 1] || 0;
}

// Enriched match participant mock — mimics Grimoire output
function mockParticipant(opts: {
  puuid: string; gameName: string; tagLine: string; placement: number;
  compIndex?: number;
}) {
  const COMPS = [
    {
      traits: [
        { name: 'TFT10_Heartsteel', displayName: 'Heartsteel', numUnits: 6, style: 3, tierCurrent: 3, tierTotal: 3, iconUrl: '' },
        { name: 'TFT10_Sentinel', displayName: 'Sentinel', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
      ],
      units: [
        { characterId: 'TFT10_Sett', name: 'Sett', tier: 2, rarity: 0, cost: 4, iconUrl: '', items: [{ id: 'TFT_Item_Bloodthirster', name: 'Bloodthirster', iconUrl: '' }, { id: 'TFT_Item_TitanicHydra', name: 'Titanic Hydra', iconUrl: '' }] },
        { characterId: 'TFT10_KSante', name: "K'Sante", tier: 2, rarity: 0, cost: 2, iconUrl: '', items: [{ id: 'TFT_Item_Bramblewest', name: 'Bramblewest', iconUrl: '' }] },
        { characterId: 'TFT10_Lucian', name: 'Lucian', tier: 1, rarity: 0, cost: 3, iconUrl: '', items: [] },
      ],
      augments: [{ id: 'TFT10_Augment_Harmonic', name: 'Harmonic Accord', iconUrl: '' }],
    },
    {
      traits: [
        { name: 'TFT10_Pentakill', displayName: 'Pentakill', numUnits: 6, style: 4, tierCurrent: 3, tierTotal: 3, iconUrl: '' },
        { name: 'TFT10_Mosher', displayName: 'Mosher', numUnits: 3, style: 1, tierCurrent: 1, tierTotal: 2, iconUrl: '' },
      ],
      units: [
        { characterId: 'TFT10_Karthus', name: 'Karthus', tier: 2, rarity: 0, cost: 5, iconUrl: '', items: [{ id: "TFT_Item_RabadonsDeathcap", name: "Rabadon's Deathcap", iconUrl: '' }, { id: 'TFT_Item_JeweledGauntlet', name: 'Jeweled Gauntlet', iconUrl: '' }] },
        { characterId: 'TFT10_Viego', name: 'Viego', tier: 2, rarity: 0, cost: 4, iconUrl: '', items: [{ id: 'TFT_Item_InfinityEdge', name: 'Infinity Edge', iconUrl: '' }] },
        { characterId: 'TFT10_Mordekaiser', name: 'Mordekaiser', tier: 1, rarity: 0, cost: 4, iconUrl: '', items: [] },
      ],
      augments: [{ id: 'TFT10_Augment_Pentakill', name: 'Pentakill Crest', iconUrl: '' }],
    },
    {
      traits: [
        { name: 'TFT10_Emo', displayName: 'Emo', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
        { name: 'TFT10_SpellWeaver', displayName: 'Spellweaver', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
      ],
      units: [
        { characterId: 'TFT10_Vex', name: 'Vex', tier: 3, rarity: 0, cost: 4, iconUrl: '', items: [{ id: 'TFT_Item_JeweledGauntlet', name: 'Jeweled Gauntlet', iconUrl: '' }, { id: 'TFT_Item_ArchangelsStaff', name: "Archangel's Staff", iconUrl: '' }] },
        { characterId: 'TFT10_Lux', name: 'Lux', tier: 2, rarity: 0, cost: 3, iconUrl: '', items: [] },
      ],
      augments: [{ id: 'TFT10_Augment_Dazzle', name: 'Dazzle', iconUrl: '' }],
    },
  ];
  const comp = COMPS[(opts.compIndex ?? 0) % COMPS.length];
  return {
    puuid: opts.puuid,
    placement: opts.placement,
    level: 7 + Math.floor(Math.random() * 3),
    goldLeft: Math.floor(Math.random() * 30),
    lastRound: 26 + Math.floor(Math.random() * 14),
    timeEliminated: 1400 + Math.floor(Math.random() * 800),
    playersEliminated: Math.floor(Math.random() * 5),
    totalDamage: 15 + Math.floor(Math.random() * 80),
    gameName: opts.gameName,
    tagLine: opts.tagLine,
    traits: comp.traits,
    units: comp.units,
    augments: comp.augments,
  };
}

async function main() {
  console.log('🎮 Seeding IN_PROGRESS tournament for Peanut (with mock results)...');

  // ── Find Peanut ─────────────────────────────────────────────────
  let YOU = await prisma.user.findFirst({
    where: { username: { contains: 'Peanut', mode: 'insensitive' } },
  });
  if (!YOU) {
    YOU = await prisma.user.findFirst({
      where: { riotGameName: { contains: 'Peanut', mode: 'insensitive' } },
    });
  }
  if (!YOU) {
    console.error('❌ User "Peanut" not found. Available:');
    const u = await prisma.user.findMany({ take: 10, select: { username: true, riotGameName: true } });
    console.table(u);
    process.exit(1);
  }
  console.log(`👤 Peanut: ${YOU.username} (${YOU.id})`);

  // ── Admin ────────────────────────────────────────────────────────
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) { console.error('No admin found'); process.exit(1); }

  // ── Other players ────────────────────────────────────────────────
  const others = await prisma.user.findMany({ where: { id: { not: YOU.id } }, take: 15 });
  if (others.length < 15) { console.error('Need 16 users total'); process.exit(1); }
  const allUsers = [YOU, ...others];

  // ── Clean & rebuild tournament ───────────────────────────────────
  const tournamentName = 'TFT Challenger Series — Season 2';
  let tournament = await prisma.tournament.findFirst({ where: { name: tournamentName } });
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  if (tournament) {
    console.log('🧹 Cleaning...');
    const phases = await prisma.phase.findMany({ where: { tournamentId: tournament.id } });
    for (const phase of phases) {
      const rounds = await prisma.round.findMany({ where: { phaseId: phase.id } });
      for (const round of rounds) {
        const lobbies = await prisma.lobby.findMany({ where: { roundId: round.id } });
        const lids = lobbies.map(l => l.id);
        const matches = await prisma.match.findMany({ where: { lobbyId: { in: lids } } });
        const mids = matches.map(m => m.id);
        await prisma.playerMatchSummary.deleteMany({ where: { matchId: { in: mids } } });
        await prisma.matchResult.deleteMany({ where: { matchId: { in: mids } } });
        await prisma.match.deleteMany({ where: { lobbyId: { in: lids } } });
        await prisma.lobby.deleteMany({ where: { roundId: round.id } });
        await prisma.roundOutcome.deleteMany({ where: { roundId: round.id } });
      }
      await prisma.round.deleteMany({ where: { phaseId: phase.id } });
    }
    await prisma.phase.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.userTournamentSummary.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.participant.deleteMany({ where: { tournamentId: tournament.id } });
    tournament = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: 'in_progress', startTime: twoDaysAgo, endTime: tomorrow, registrationDeadline: twoDaysAgo, maxPlayers: 16, entryFee: 50, expectedParticipants: 16, actualParticipantsCount: 16, description: '🏆 Live! Round 3 is NOW active — ready check in progress!', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80', region: 'VN' }
    });
  } else {
    tournament = await prisma.tournament.create({
      data: { name: tournamentName, description: '🏆 Live! Round 3 is NOW active — ready check in progress!', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80', region: 'VN', startTime: twoDaysAgo, endTime: tomorrow, registrationDeadline: twoDaysAgo, entryFee: 50, maxPlayers: 16, status: 'in_progress', organizerId: admin.id, prizeStructure: [{ rank: 1, percent: 50 }, { rank: 2, percent: 30 }, { rank: 3, percent: 20 }], expectedParticipants: 16, actualParticipantsCount: 16, hostFeePercent: 0.1 }
    });
  }
  console.log(`✅ Tournament: ${tournament.name} (${tournament.id})`);

  // ── Participants ─────────────────────────────────────────────────
  for (const u of allUsers) {
    await prisma.participant.create({ data: { userId: u.id, tournamentId: tournament.id, paid: true } });
  }
  const participants = await prisma.participant.findMany({
    where: { tournamentId: tournament.id },
    include: { user: true },
  });

  // Helper: ensure Peanut is in the first group
  function ensurePeanutFirst(group: typeof participants, otherGroup: typeof participants) {
    if (!group.some(p => p.userId === YOU!.id)) {
      const pi = otherGroup.findIndex(p => p.userId === YOU!.id);
      const swap = group[group.length - 1];
      group[group.length - 1] = otherGroup[pi];
      otherGroup[pi] = swap;
    }
  }

  // ════════════════════════════════════════════════════════════
  //  PHASE 1 — Group Stage  (COMPLETED)
  // ════════════════════════════════════════════════════════════
  const phase1 = await prisma.phase.create({
    data: { tournamentId: tournament.id, name: 'Group Stage', phaseNumber: 1, type: 'swiss', status: 'COMPLETED', lobbySize: 8, matchesPerRound: 1, numberOfRounds: 3, pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1] }
  });

  async function seedCompletedRound(roundNumber: number, phaseId: string, lobbyGroups: typeof participants[][], hoursAgo: number, peanutPlacement: number) {
    const round = await prisma.round.create({
      data: { phaseId, roundNumber, status: 'COMPLETED', startTime: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000), endTime: new Date(now.getTime() - (hoursAgo - 1) * 60 * 60 * 1000) }
    });

    for (const [lobbyIndex, lobbyParticipants] of lobbyGroups.entries()) {
      const lobby = await prisma.lobby.create({
        data: {
          roundId: round.id, name: `Round ${roundNumber} — Lobby ${lobbyIndex + 1}`,
          participants: lobbyParticipants.map(p => ({ participantId: p.id, userId: p.userId, username: p.user.username })),
          completedMatchesCount: 1, fetchedResult: true,
          state: 'FINISHED', phaseStartedAt: new Date(now.getTime() - (hoursAgo - 1) * 60 * 60 * 1000),
        }
      });

      // Build placements
      const ps = Array.from({ length: lobbyParticipants.length }, (_, i) => i + 1);
      ps.sort(() => Math.random() - 0.5);
      const pIdx = lobbyParticipants.findIndex(p => p.userId === YOU!.id);
      if (pIdx !== -1) {
        const targetIdx = ps.indexOf(peanutPlacement);
        [ps[pIdx], ps[targetIdx]] = [peanutPlacement, ps[pIdx]];
      }

      const matchId = `VN_R${roundNumber}_${uuidv4()}`;
      const enrichedMatch = {
        matchId, gameCreation: now.getTime() - hoursAgo * 60 * 60 * 1000,
        gameDuration: 1800 + Math.floor(Math.random() * 400), gameVersion: '14.1.500.8888',
        queueId: 1090, tftSetNumber: 10,
        participants: lobbyParticipants.map((p, j) => mockParticipant({
          puuid: p.user.puuid || p.userId,
          gameName: p.user.riotGameName || p.user.username,
          tagLine: p.user.riotGameTag || 'VN1',
          placement: ps[j],
          compIndex: j,
        })),
      };

      const match = await prisma.match.create({
        data: { lobbyId: lobby.id, matchIdRiotApi: matchId, matchData: enrichedMatch, fetchedAt: new Date() }
      });

      for (let j = 0; j < lobbyParticipants.length; j++) {
        const p = lobbyParticipants[j]; const placement = ps[j]; const points = pts(placement);
        await prisma.matchResult.create({ data: { matchId: match.id, userId: p.userId, placement, points } });
        await prisma.participant.update({ where: { id: p.id }, data: { scoreTotal: { increment: points } } });
        await prisma.userTournamentSummary.upsert({
          where: { userId_tournamentId: { userId: p.userId, tournamentId: tournament!.id } },
          update: { points: { increment: points }, placement },
          create: { userId: p.userId, tournamentId: tournament!.id, joinedAt: new Date(), points, placement }
        });
        await prisma.playerMatchSummary.create({
          data: { userId: p.userId, matchId: match.id, tournamentId: tournament!.id, tournamentName: tournament!.name, roundNumber, placement, points, playedAt: new Date() }
        });
        await prisma.roundOutcome.create({ data: { participantId: p.id, roundId: round.id, status: 'advanced', scoreInRound: points } });
      }
      const isYou = lobbyParticipants.some(p => p.userId === YOU!.id);
      console.log(`  ✅ Round ${roundNumber} — Lobby ${lobbyIndex + 1} COMPLETED${isYou ? ` (Peanut: ${peanutPlacement}th)` : ''}`);
    }
    return round;
  }

  // Round 1
  const r1g1 = participants.slice(0, 8), r1g2 = participants.slice(8, 16);
  ensurePeanutFirst(r1g1, r1g2);
  await seedCompletedRound(1, phase1.id, [r1g1, r1g2], 6, 2);

  // Updated scores for Round 2 seeding
  const updR2 = await prisma.participant.findMany({ where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { scoreTotal: 'desc' } });
  const r2g1 = updR2.slice(0, 8), r2g2 = updR2.slice(8, 16);
  ensurePeanutFirst(r2g1, r2g2);
  await seedCompletedRound(2, phase1.id, [r2g1, r2g2], 3, 1); // Peanut wins Round 2!

  // ── Round 3 (ACTIVE — READY_CHECK) ───────────────────────────────
  const round3 = await prisma.round.create({
    data: { phaseId: phase1.id, roundNumber: 3, status: 'in_progress', startTime: new Date(now.getTime() - 10 * 60 * 1000), endTime: null }
  });

  const updR3 = await prisma.participant.findMany({ where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { scoreTotal: 'desc' } });
  const r3g1 = updR3.slice(0, 8), r3g2 = updR3.slice(8, 16);
  ensurePeanutFirst(r3g1, r3g2);

  let peanutLobbyId = '';
  for (const [i, grp] of [r3g1, r3g2].entries()) {
    const name = i === 0 ? 'Lobby A — Top Seeds' : 'Lobby B — Lower Seeds';
    const lobby = await prisma.lobby.create({
      data: {
        roundId: round3.id, name,
        participants: grp.map(p => ({ participantId: p.id, userId: p.userId, username: p.user.username })),
        completedMatchesCount: 0, fetchedResult: false,
        state: 'READY_CHECK',
        phaseStartedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago
        totalDelaysUsed: 0, delayRequests: [],
      }
    });
    const isYou = grp.some(p => p.userId === YOU!.id);
    if (isYou) {
      peanutLobbyId = lobby.id;
      console.log(`  🎯 Round 3 — Peanut in "${name}" (READY_CHECK)`);
      console.log(`     👉 /tournaments/${tournament.id}/lobbies/${lobby.id}`);
    } else {
      console.log(`  📌 Round 3 — ${name} waiting for ready-check`);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  PHASE 2 — Finals (PENDING)
  // ════════════════════════════════════════════════════════════
  await prisma.phase.create({
    data: { tournamentId: tournament.id, name: 'Finals', phaseNumber: 2, type: 'elimination', status: 'PENDING', lobbySize: 8, matchesPerRound: 1, numberOfRounds: 1, pointsMapping: [8, 7, 6, 5, 4, 3, 2, 1] }
  });

  console.log('\n🎉 Done!');
  console.log(`\n📋 Summary:`);
  console.log(`   Peanut: ${YOU.username} (${YOU.id})`);
  console.log(`   Round 1: ✅ COMPLETED — 2nd place`);
  console.log(`   Round 2: ✅ COMPLETED — 1st place 🏆`);
  console.log(`   Round 3: 🔴 READY_CHECK — lobby id: ${peanutLobbyId}`);
  console.log(`\n   Tournament: /tournaments/${tournament.id}`);
  console.log(`   Active Lobby: /tournaments/${tournament.id}/lobbies/${peanutLobbyId}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
