// @ts-nocheck
/**
 * seedGrimoireTournament.ts
 *
 * Seeds a COMPLETED tournament with full Grimoire-format matchData
 * (GrimoireMatchData shape: matchId, gameCreation, gameDuration, gameVersion,
 *  queueId, tftSetNumber, participants[{puuid, placement, level, goldLeft,
 *  lastRound, timeEliminated, playersEliminated, totalDamage, gameName, tagLine,
 *  traits, units, augments}])
 *
 * Run: npx ts-node --project tsconfig.json scripts/seedGrimoireTournament.ts
 */

import { PrismaClient } from '@prisma/client';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ── Points mapping ──────────────────────────────────────────────────────────
const PTS = [8, 7, 6, 5, 4, 3, 2, 1];
function pts(placement: number) { return PTS[placement - 1] ?? 0; }

// ── 8 diverse TFT comps (Grimoire unit/trait format) ───────────────────────
const COMPS = [
  {
    name: 'Heartsteel Carry',
    traits: [
      { name: 'TFT10_Heartsteel', displayName: 'Heartsteel', numUnits: 6, style: 3, tierCurrent: 3, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_Guardian', displayName: 'Guardian', numUnits: 2, style: 1, tierCurrent: 1, tierTotal: 2, iconUrl: '' },
      { name: 'TFT10_Sentinel', displayName: 'Sentinel', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Sett', name: 'Sett', tier: 2, rarity: 0, cost: 4, iconUrl: '',
        items: [{ id: 'TFT_Item_Bloodthirster', name: 'Bloodthirster', iconUrl: '' }, { id: 'TFT_Item_TitanicHydra', name: 'Titanic Hydra', iconUrl: '' }, { id: 'TFT_Item_HandOfJustice', name: 'Hand of Justice', iconUrl: '' }] },
      { characterId: 'TFT10_KSante', name: "K'Sante", tier: 2, rarity: 0, cost: 2, iconUrl: '',
        items: [{ id: 'TFT_Item_Bramblewest', name: 'Bramblewest Vest', iconUrl: '' }] },
      { characterId: 'TFT10_Thresh', name: 'Thresh', tier: 2, rarity: 0, cost: 3, iconUrl: '', items: [] },
      { characterId: 'TFT10_Lucian', name: 'Lucian', tier: 1, rarity: 0, cost: 3, iconUrl: '', items: [] },
      { characterId: 'TFT10_Sona', name: 'Sona', tier: 1, rarity: 0, cost: 1, iconUrl: '', items: [] },
    ],
    augments: [{ id: 'TFT10_Augment_Harmonic', name: 'Harmonic Accord', iconUrl: '' }],
  },
  {
    name: 'Pentakill',
    traits: [
      { name: 'TFT10_Pentakill', displayName: 'Pentakill', numUnits: 6, style: 4, tierCurrent: 3, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_Mosher', displayName: 'Mosher', numUnits: 3, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Karthus', name: 'Karthus', tier: 2, rarity: 0, cost: 5, iconUrl: '',
        items: [{ id: "TFT_Item_RabadonsDeathcap", name: "Rabadon's Deathcap", iconUrl: '' }, { id: 'TFT_Item_JeweledGauntlet', name: 'Jeweled Gauntlet', iconUrl: '' }, { id: 'TFT_Item_GiantSlayer', name: 'Giant Slayer', iconUrl: '' }] },
      { characterId: 'TFT10_Viego', name: 'Viego', tier: 2, rarity: 0, cost: 4, iconUrl: '',
        items: [{ id: 'TFT_Item_InfinityEdge', name: 'Infinity Edge', iconUrl: '' }] },
      { characterId: 'TFT10_Mordekaiser', name: 'Mordekaiser', tier: 2, rarity: 0, cost: 4, iconUrl: '', items: [] },
      { characterId: 'TFT10_Yorick', name: 'Yorick', tier: 1, rarity: 0, cost: 4, iconUrl: '', items: [] },
    ],
    augments: [
      { id: 'TFT10_Augment_Pentakill', name: 'Pentakill Crest', iconUrl: '' },
      { id: 'TFT10_Augment_Golem', name: 'Golem Tier Augment', iconUrl: '' },
    ],
  },
  {
    name: 'Emo + SpellWeaver',
    traits: [
      { name: 'TFT10_Emo', displayName: 'Emo', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_SpellWeaver', displayName: 'Spellweaver', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Vex', name: 'Vex', tier: 3, rarity: 0, cost: 4, iconUrl: '',
        items: [{ id: 'TFT_Item_JeweledGauntlet', name: 'Jeweled Gauntlet', iconUrl: '' }, { id: 'TFT_Item_ArchangelsStaff', name: "Archangel's Staff", iconUrl: '' }] },
      { characterId: 'TFT10_Lux', name: 'Lux', tier: 2, rarity: 0, cost: 3, iconUrl: '', items: [] },
      { characterId: 'TFT10_Annie', name: 'Annie', tier: 1, rarity: 0, cost: 2, iconUrl: '', items: [] },
    ],
    augments: [{ id: 'TFT10_Augment_Dazzle', name: 'Dazzle', iconUrl: '' }],
  },
  {
    name: 'K/DA Hyperpop',
    traits: [
      { name: 'TFT10_KDA', displayName: 'K/DA', numUnits: 6, style: 3, tierCurrent: 3, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_Hyperpop', displayName: 'Hyperpop', numUnits: 2, style: 1, tierCurrent: 1, tierTotal: 2, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Seraphine', name: 'Seraphine', tier: 2, rarity: 0, cost: 5, iconUrl: '',
        items: [{ id: 'TFT_Item_Morellonomicon', name: 'Morellonomicon', iconUrl: '' }, { id: 'TFT_Item_BlueBuff', name: 'Blue Buff', iconUrl: '' }] },
      { characterId: 'TFT10_Ahri', name: 'Ahri', tier: 2, rarity: 0, cost: 4, iconUrl: '',
        items: [{ id: 'TFT_Item_NashorsTooth', name: "Nashor's Tooth", iconUrl: '' }] },
      { characterId: 'TFT10_Evelynn', name: 'Evelynn', tier: 2, rarity: 0, cost: 3, iconUrl: '', items: [] },
      { characterId: 'TFT10_Akali', name: 'Akali', tier: 1, rarity: 0, cost: 3, iconUrl: '', items: [] },
    ],
    augments: [{ id: 'TFT10_Augment_KDA', name: 'K/DA Crest', iconUrl: '' }],
  },
  {
    name: 'True Damage',
    traits: [
      { name: 'TFT10_TrueDamage', displayName: 'True Damage', numUnits: 5, style: 3, tierCurrent: 3, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_Crowd_Diver', displayName: 'Crowd Diver', numUnits: 2, style: 1, tierCurrent: 1, tierTotal: 2, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Akali_TrueDamage', name: 'Akali TrueDmg', tier: 2, rarity: 0, cost: 4, iconUrl: '',
        items: [{ id: 'TFT_Item_KrakensSlayer', name: "Kraken Slayer", iconUrl: '' }, { id: 'TFT_Item_LastWhisper', name: 'Last Whisper', iconUrl: '' }] },
      { characterId: 'TFT10_Yasuo', name: 'Yasuo', tier: 2, rarity: 0, cost: 5, iconUrl: '', items: [] },
      { characterId: 'TFT10_Ekko', name: 'Ekko', tier: 1, rarity: 0, cost: 3, iconUrl: '', items: [] },
    ],
    augments: [{ id: 'TFT10_Augment_TrueDamage', name: 'True Damage Crest', iconUrl: '' }],
  },
  {
    name: '8-Bit Executioner',
    traits: [
      { name: 'TFT10_8Bit', displayName: '8-Bit', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_Executioner', displayName: 'Executioner', numUnits: 2, style: 1, tierCurrent: 1, tierTotal: 3, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Caitlyn', name: 'Caitlyn', tier: 2, rarity: 0, cost: 5, iconUrl: '',
        items: [{ id: 'TFT_Item_GuinsoosRageblade', name: "Guinsoo's Rageblade", iconUrl: '' }, { id: 'TFT_Item_RunaansHurricane', name: "Runaan's Hurricane", iconUrl: '' }] },
      { characterId: 'TFT10_Corki', name: 'Corki', tier: 2, rarity: 0, cost: 2, iconUrl: '', items: [] },
      { characterId: 'TFT10_MissFortune', name: 'Miss Fortune', tier: 2, rarity: 0, cost: 4, iconUrl: '', items: [] },
    ],
    augments: [{ id: 'TFT10_Augment_8Bit', name: '8-Bit Heart', iconUrl: '' }],
  },
  {
    name: 'Jazz Bruiser',
    traits: [
      { name: 'TFT10_Jazz', displayName: 'Jazz', numUnits: 3, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
      { name: 'TFT10_Bruiser', displayName: 'Bruiser', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 4, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Twisted_Fate', name: 'Twisted Fate', tier: 2, rarity: 0, cost: 4, iconUrl: '',
        items: [{ id: 'TFT_Item_Zephyr', name: 'Zephyr', iconUrl: '' }] },
      { characterId: 'TFT10_Gragas', name: 'Gragas', tier: 2, rarity: 0, cost: 3, iconUrl: '',
        items: [{ id: 'TFT_Item_SunfireBoard', name: 'Sunfire Board', iconUrl: '' }] },
      { characterId: 'TFT10_Vi', name: 'Vi', tier: 1, rarity: 0, cost: 2, iconUrl: '', items: [] },
    ],
    augments: [
      { id: 'TFT10_Augment_Jazz', name: 'Jazz Crest', iconUrl: '' },
      { id: 'TFT10_Augment_Pumping_Up', name: 'Pumping Up II', iconUrl: '' },
    ],
  },
  {
    name: 'Disco Tank',
    traits: [
      { name: 'TFT10_Disco', displayName: 'Disco', numUnits: 4, style: 3, tierCurrent: 3, tierTotal: 4, iconUrl: '' },
      { name: 'TFT10_Guardian', displayName: 'Guardian', numUnits: 4, style: 2, tierCurrent: 2, tierTotal: 3, iconUrl: '' },
    ],
    units: [
      { characterId: 'TFT10_Blitzcrank', name: 'Blitzcrank', tier: 2, rarity: 0, cost: 3, iconUrl: '',
        items: [{ id: 'TFT_Item_AegisOfTheLegion', name: 'Aegis of the Legion', iconUrl: '' }, { id: 'TFT_Item_DragonClaw', name: 'Dragon Claw', iconUrl: '' }] },
      { characterId: 'TFT10_Taric', name: 'Taric', tier: 2, rarity: 0, cost: 4, iconUrl: '', items: [] },
      { characterId: 'TFT10_Nami', name: 'Nami', tier: 1, rarity: 0, cost: 2, iconUrl: '', items: [] },
    ],
    augments: [{ id: 'TFT10_Augment_Disco', name: 'Disco Crest', iconUrl: '' }],
  },
];

// ── Build a full GrimoireMatchParticipant ───────────────────────────────────
function mockParticipant(opts: {
  puuid: string;
  gameName: string;
  tagLine: string;
  placement: number;
  compIndex: number;
}) {
  const comp = COMPS[opts.compIndex % COMPS.length];
  return {
    puuid: opts.puuid,
    placement: opts.placement,
    level: 7 + Math.floor(Math.random() * 3),           // 7–9
    goldLeft: Math.floor(Math.random() * 30),
    lastRound: 26 + Math.floor(Math.random() * 14),     // 26–39
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

// ── Build a full GrimoireMatchData object ───────────────────────────────────
function buildGrimoireMatch(
  riotMatchId: string,
  lobbyParticipants: any[],        // {userId, user: {puuid, riotGameName, riotGameTag}}
  placements: number[],
  hoursAgoMs: number
) {
  const gameCreation = Date.now() - hoursAgoMs;
  const gameDuration = 1800 + Math.floor(Math.random() * 400);
  const gameVersion  = '14.8.518.2278';

  return {
    matchId: riotMatchId,
    gameCreation,
    gameDuration,
    gameVersion,
    queueId: 1090,
    tftSetNumber: 10,
    participants: lobbyParticipants.map((p, j) =>
      mockParticipant({
        puuid:     p.user.puuid || p.userId,
        gameName:  p.user.riotGameName || p.user.username,
        tagLine:   p.user.riotGameTag  || 'VN1',
        placement: placements[j],
        compIndex: j,
      })
    ),
  };
}

// ── Shuffled placements [1..n] ──────────────────────────────────────────────
function shuffledPlacements(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i + 1);
  return arr.sort(() => Math.random() - 0.5);
}

// ── Clear all old tournament data (keeps users, balances, MiniTour) ─────────
async function clearAllTournaments() {
  console.log('🧹  Clearing all old tournament data...');

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

  // Delete in dependency order
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

  console.log(`✅  Cleared ${tourIds.length} tournament(s) and all related data.\n`);
}

// ── Main seed ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  seedGrimoireTournament — Grimoire-format completed tournament\n');

  // ── Clear old tours first ───────────────────────────────────────────────
  await clearAllTournaments();

  // ── Find admin ─────────────────────────────────────────────────────────
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) { console.error('❌  No admin found'); process.exit(1); }

  // ── Grab 16 users ──────────────────────────────────────────────────────
  const users = await prisma.user.findMany({ take: 16, orderBy: { createdAt: 'asc' } });
  if (users.length < 8) {
    console.error('❌  Need at least 8 users. Run seedUsers.ts first.'); process.exit(1);
  }
  const allUsers = users.slice(0, 16);
  console.log(`👥  Using ${allUsers.length} players.`);

  // ── Create tournament ───────────────────────────────────────────────────
  const TOUR_NAME = 'VCS Grimoire Championship — S1';
  const now     = new Date();
  const sevenDA = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fiveDA  = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const tournament = await prisma.tournament.create({
    data: {
      name:                   TOUR_NAME,
      description:            '🏆 Completed VCS Championship. Full Grimoire-enriched match data with icons, traits, units & augments.',
      image:                  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80',
      region:                 'VN',
      startTime:              sevenDA,
      endTime:                fiveDA,
      registrationDeadline:   sevenDA,
      entryFee:               50,
      maxPlayers:             16,
      status:                 'completed',
      organizerId:            admin.id,
      prizeStructure:         [{ rank: 1, percent: 50 }, { rank: 2, percent: 30 }, { rank: 3, percent: 20 }],
      expectedParticipants:   16,
      actualParticipantsCount: allUsers.length,
      hostFeePercent:         0.1,
    },
  });
  console.log(`🏆  Tournament: ${tournament.name} (${tournament.id})`);

  // ── Create participants ─────────────────────────────────────────────────
  for (const u of allUsers) {
    await prisma.participant.create({ data: { userId: u.id, tournamentId: tournament.id, paid: true } });
  }
  const participants = await prisma.participant.findMany({
    where: { tournamentId: tournament.id },
    include: { user: true },
    orderBy: { joinedAt: 'asc' },
  });
  console.log(`👤  ${participants.length} participants enrolled.\n`);

  // ── Helper: seed one completed round ────────────────────────────────────
  async function seedRound(
    phaseId:      string,
    roundNumber:  number,
    groups:       typeof participants[][],
    hoursAgo:     number
  ) {
    const round = await prisma.round.create({
      data: {
        phaseId,
        roundNumber,
        status:    'COMPLETED',
        startTime: new Date(now.getTime() - hoursAgo * 3_600_000),
        endTime:   new Date(now.getTime() - (hoursAgo - 1) * 3_600_000),
      },
    });

    for (const [li, group] of groups.entries()) {
      const placements = shuffledPlacements(group.length);
      const riotId     = `VN_GC_R${roundNumber}_L${li + 1}_${uuidv4()}`;
      const grimoireData = buildGrimoireMatch(riotId, group, placements, hoursAgo * 3_600_000);

      const lobby = await prisma.lobby.create({
        data: {
          roundId:              round.id,
          name:                 `Lobby ${li + 1}`,
          participants:         group.map(p => ({ participantId: p.id, userId: p.userId, username: p.user.username })),
          completedMatchesCount: 1,
          fetchedResult:        true,
          state:                'FINISHED',
          phaseStartedAt:       round.startTime,
        },
      });

      const match = await prisma.match.create({
        data: {
          lobbyId:        lobby.id,
          matchIdRiotApi: riotId,
          matchData:      grimoireData,   // ← stored as GrimoireMatchData directly
          fetchedAt:      new Date(),
        },
      });

      for (let j = 0; j < group.length; j++) {
        const p         = group[j];
        const placement = placements[j];
        const points    = pts(placement);

        await prisma.matchResult.create({ data: { matchId: match.id, userId: p.userId, placement, points } });
        await prisma.participant.update({ where: { id: p.id }, data: { scoreTotal: { increment: points } } });
        await prisma.userTournamentSummary.upsert({
          where:  { userId_tournamentId: { userId: p.userId, tournamentId: tournament.id } },
          update: { points: { increment: points }, placement },
          create: { userId: p.userId, tournamentId: tournament.id, joinedAt: new Date(), points, placement },
        });
        await prisma.playerMatchSummary.upsert({
          where:  { userId_matchId: { userId: p.userId, matchId: match.id } },
          update: { placement, points, playedAt: round.startTime },
          create: { userId: p.userId, matchId: match.id, tournamentId: tournament.id, tournamentName: tournament.name, roundNumber, placement, points, playedAt: round.startTime },
        });
        await prisma.roundOutcome.create({ data: { participantId: p.id, roundId: round.id, status: 'advanced', scoreInRound: points } });
      }

      console.log(`  ✅  Round ${roundNumber} | Lobby ${li + 1} seeded (riotId: ${riotId.slice(-12)})`);
    }
    return round;
  }

  // ── PHASE 1 — Group Stage (3 rounds, 2 lobbies of 8) ────────────────────
  const phase1 = await prisma.phase.create({
    data: {
      tournamentId:   tournament.id,
      name:           'Group Stage',
      phaseNumber:    1,
      type:           'swiss',
      status:         'COMPLETED',
      lobbySize:      8,
      matchesPerRound: 1,
      numberOfRounds: 3,
      pointsMapping:  [8, 7, 6, 5, 4, 3, 2, 1],
    },
  });
  console.log('\n📋  Phase 1: Group Stage');

  // Round 1 — random split
  const r1g1 = participants.slice(0, 8);
  const r1g2 = participants.slice(8, 16);
  await seedRound(phase1.id, 1, [r1g1, r1g2], 36);

  // Round 2 — re-rank, top-8 vs bottom-8
  const updR2 = await prisma.participant.findMany({
    where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { scoreTotal: 'desc' },
  });
  await seedRound(phase1.id, 2, [updR2.slice(0, 8), updR2.slice(8, 16)], 33);

  // Round 3
  const updR3 = await prisma.participant.findMany({
    where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { scoreTotal: 'desc' },
  });
  await seedRound(phase1.id, 3, [updR3.slice(0, 8), updR3.slice(8, 16)], 30);

  // ── PHASE 2 — Finals (1 round, 1 lobby top-8) ───────────────────────────
  const phase2 = await prisma.phase.create({
    data: {
      tournamentId:   tournament.id,
      name:           'Grand Finals',
      phaseNumber:    2,
      type:           'elimination',
      status:         'COMPLETED',
      lobbySize:      8,
      matchesPerRound: 1,
      numberOfRounds: 1,
      pointsMapping:  [8, 7, 6, 5, 4, 3, 2, 1],
    },
  });
  console.log('\n🏅  Phase 2: Grand Finals');

  const finalists = await prisma.participant.findMany({
    where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { scoreTotal: 'desc' }, take: 8,
  });
  await seedRound(phase2.id, 1, [finalists], 27);

  // ── Final leaderboard ────────────────────────────────────────────────────
  const final = await prisma.participant.findMany({
    where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { scoreTotal: 'desc' },
  });

  console.log('\n🎉  Done! Final standings:');
  final.forEach((p, i) =>
    console.log(`  ${i + 1}. ${p.user.riotGameName}#${p.user.riotGameTag} — ${p.scoreTotal} pts`)
  );
  console.log(`\n  🔗 View: /tournaments/${tournament.id}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
