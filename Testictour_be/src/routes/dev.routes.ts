import { Router, Request, Response } from 'express';
import GrimoireService from '../services/GrimoireService';
import { prisma } from '../services/prisma';

const router = Router();

/**
 * POST /dev/test-riot-match
 * Fetches the latest real TFT match from Grimoire for a given riotId or uses a
 * known user from the DB as fallback. Returns GrimoireMatchData ready for MatchCompPanel.
 *
 * Body: { gameName?: string, tagLine?: string, region?: string }
 */
router.post('/test-riot-match', async (req: Request, res: Response) => {
  try {
    const { gameName, tagLine, region = 'sea' } = req.body;

    let puuid: string | null = null;

    if (gameName && tagLine) {
      try {
        puuid = await GrimoireService.fetchPuuid(gameName, tagLine, region);
      } catch (e: any) {
        return res.status(400).json({ success: false, error: `Cannot find PUUID for ${gameName}#${tagLine}: ${e.message}` });
      }
    } else {
      puuid = 'DH7MwwQjP_IRTHXCK0TlDM0jADBBOa8h1Fb9KLGwlRXTfx9LttT0bHW5rGHpQwWREyX7_xVyobDPXQ';
    }

    const startTime = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    const result = await GrimoireService.fetchLatestMatch(
      [puuid],
      region,
      startTime,
      undefined,
      undefined,
    );

    if (!result.match) {
      return res.status(404).json({
        success: false,
        error: 'No recent match found for this player.',
        matchIds: result.matchIds,
        message: result.message,
      });
    }

    let seededLobbyIds: string[] = [];
    try {
      let tour = await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });
      let miniTourLobby = await prisma.miniTourLobby.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { participants: { include: { user: true } } }
      });

      if (!tour || !miniTourLobby) {
        const { execSync } = require('child_process');
        try {
          execSync('npx ts-node scripts/seedUsers.ts', { stdio: 'inherit' });
          execSync('npx ts-node scripts/seedGrimoireTournament.ts', { stdio: 'inherit' });
          execSync('npx ts-node scripts/testMiniTourLobby.ts', { stdio: 'inherit' });
        } catch (seedingErr) {
          console.error('Initial seeding scripts failed:', seedingErr);
        }
        tour = await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });
        miniTourLobby = await prisma.miniTourLobby.findFirst({
          orderBy: { createdAt: 'desc' },
          include: { participants: { include: { user: true } } }
        });
      }

      const allMiniTours = await prisma.miniTourLobby.findMany({ orderBy: { createdAt: 'desc' } });
      if (allMiniTours.length > 1) {
        for (let i = 1; i < allMiniTours.length; i++) {
          const oldLobbyId = allMiniTours[i].id;
          await prisma.miniTourMatchResult.deleteMany({ where: { miniTourMatch: { miniTourLobbyId: oldLobbyId } } });
          await prisma.miniTourMatch.deleteMany({ where: { miniTourLobbyId: oldLobbyId } });
          await prisma.miniTourLobbyParticipant.deleteMany({ where: { miniTourLobbyId: oldLobbyId } });
          await prisma.miniTourLobby.deleteMany({ where: { id: oldLobbyId } });
        }
      }

      await prisma.playerMatchSummary.deleteMany({});
      await prisma.roundOutcome.deleteMany({});
      await prisma.matchResult.deleteMany({});
      await prisma.match.deleteMany({});
      await prisma.miniTourMatchResult.deleteMany({});
      await prisma.miniTourMatch.deleteMany({});

      if (tour) {
        const phase = await prisma.phase.findFirst({ where: { tournamentId: tour.id } });
        const round = phase ? await prisma.round.findFirst({ where: { phaseId: phase.id } }) : null;
        const lobby = round ? await prisma.lobby.findFirst({ where: { roundId: round.id } }) : null;

        if (lobby) {
          const tourMatchData = JSON.parse(JSON.stringify(result.match));
          const lobbyParticipants = lobby.participants as { userId: string;[key: string]: any }[];
          const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];
          const userMappingArr = [];

          for (let i = 0; i < lobbyParticipants.length && i < tourMatchData.participants.length; i++) {
            const pDb = lobbyParticipants[i];
            const realP = tourMatchData.participants[i];
            const uniquePuuid = `${realP.puuid}_tour_${Date.now()}_${i}`;
            realP.puuid = uniquePuuid;
            userMappingArr.push({ pDb, realP, uniquePuuid, index: i });
          }

          const newMatch = await prisma.match.create({
            data: { lobbyId: lobby.id, matchIdRiotApi: result.match.matchId, matchData: tourMatchData as any }
          });

          const entryFee = (tour as any).entryFee || 0;
          for (const m of userMappingArr) {
            await prisma.user.update({
              where: { id: m.pDb.userId },
              data: { puuid: m.uniquePuuid, riotGameName: m.realP.gameName || 'Player' }
            });
            await prisma.matchResult.create({
              data: { matchId: newMatch.id, userId: m.pDb.userId, placement: m.realP.placement, points: ptsFormat[m.index] || 0 }
            });
          }

          if (entryFee > 0) {
            for (const m2 of userMappingArr) {
              const hasFee = await prisma.transaction.findFirst({
                where: { userId: m2.pDb.userId, type: 'entry_fee', refId: tour.id }
              });
              if (!hasFee) {
                await prisma.transaction.create({
                  data: { userId: m2.pDb.userId, type: 'entry_fee', amount: entryFee, status: 'success', refId: tour.id }
                });
              }
            }
          }

          seededLobbyIds.push(`TournamentMatch:${newMatch.id}`);
        }
      }

      if (miniTourLobby && miniTourLobby.participants.length > 0) {
        const mtMatchData = JSON.parse(JSON.stringify(result.match));
        const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];
        let pool = miniTourLobby.prizePool || 100000;
        const prizeFormat = [Math.floor(pool * 0.5), Math.floor(pool * 0.3), Math.floor(pool * 0.2), 0, 0, 0, 0, 0];
        const mtUserMappingArr = [];

        for (let i = 0; i < miniTourLobby.participants.length && i < mtMatchData.participants.length; i++) {
          const mtP = miniTourLobby.participants[i];
          const realP = mtMatchData.participants[i];
          const uniquePuuid = `${realP.puuid}_mt_${Date.now()}_${i}`;
          realP.puuid = uniquePuuid;
          mtUserMappingArr.push({ mtP, realP, uniquePuuid, index: i });
        }

        const mtMatch = await prisma.miniTourMatch.create({
          data: {
            miniTourLobbyId: miniTourLobby.id,
            matchIdRiotApi: result.match.matchId,
            matchData: { info: mtMatchData, metadata: (result.match as any).metadata } as any,
            status: 'IN_PROGRESS',
            fetchedAt: new Date(),
            startTime: new Date(mtMatchData.gameStartTimestamp ? mtMatchData.gameStartTimestamp * 1000 : Date.now())
          }
        });

        for (const m of mtUserMappingArr) {
          await prisma.user.update({
            where: { id: m.mtP.userId },
            data: { puuid: m.uniquePuuid, riotGameName: m.realP.gameName || m.mtP.user?.username || 'Player' }
          });
        }

        const MiniTourMatchResultService = require('../services/MiniTourMatchResultService').default;
        await MiniTourMatchResultService.processMiniTourMatchResults(mtMatch.id, { info: mtMatchData, metadata: (result.match as any).metadata }, req.app.get('io'));

        seededLobbyIds.push(`MiniTourMatch:${mtMatch.id}`);
      }
    } catch (e: any) {
      console.error('[Dev Endpoint] Failed to auto-seed DB:', e);
      return res.status(500).json({ success: false, error: 'DB Seeding Error: ' + e.message });
    }

    return res.json({ success: true, seeded: seededLobbyIds, match: result.match });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/seed-full-tournament
 * Fetches up to 4 real TFT matches from Grimoire and seeds a complete
 * multi-phase tournament structure for testing statistics.
 *
 * Body: { gameName?: string, tagLine?: string, region?: string, matchCount?: number }
 */
router.post('/seed-full-tournament', async (req: Request, res: Response) => {
  try {
    const { gameName, tagLine, region = 'sea', matchCount = 4 } = req.body;
    const count = Math.min(Math.max(1, parseInt(String(matchCount)) || 4), 4);

    let puuid: string;
    if (gameName && tagLine) {
      try {
        puuid = await GrimoireService.fetchPuuid(gameName, tagLine, region);
      } catch (e: any) {
        return res.status(400).json({ success: false, error: `Cannot find PUUID for ${gameName}#${tagLine}: ${e.message}` });
      }
    } else {
      puuid = 'DH7MwwQjP_IRTHXCK0TlDM0jADBBOa8h1Fb9KLGwlRXTfx9LttT0bHW5rGHpQwWREyX7_xVyobDPXQ';
    }

    const startTime = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);
    const { matchIds = [], message } = await GrimoireService.fetchLatestMatch([puuid], region, startTime, undefined, undefined);

    if (!matchIds.length) {
      return res.status(404).json({ success: false, error: 'No recent matches found.', message });
    }

    // Fetch each match individually
    const idsToFetch = matchIds.slice(0, count);
    const fetchedMatches: any[] = [];

    for (const matchId of idsToFetch) {
      try {
        const matchData = await GrimoireService.fetchMatchById(matchId, region);
        if (matchData) fetchedMatches.push(matchData);
      } catch (err) {
        console.warn(`[seed-full-tournament] failed to fetch match ${matchId}:`, err);
      }
    }

    if (!fetchedMatches.length) {
      return res.status(404).json({ success: false, error: 'Could not fetch any match data.' });
    }

    // Get tournament from DB
    const tour = await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!tour) {
      return res.status(400).json({ success: false, error: 'No tournament in DB. Run seedGrimoireTournament first.' });
    }

    // Clear old match data
    await prisma.playerMatchSummary.deleteMany({});
    await prisma.roundOutcome.deleteMany({});
    await prisma.matchResult.deleteMany({});
    await prisma.match.deleteMany({});

    // Get all phases/rounds/lobbies in order
    const phases = await prisma.phase.findMany({
      where: { tournamentId: tour.id },
      include: { rounds: { orderBy: { roundNumber: 'asc' }, include: { lobbies: true } } },
      orderBy: { phaseNumber: 'asc' }
    });

    const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];
    const seededMatches: string[] = [];
    let matchIndex = 0;

    for (const phase of phases) {
      for (const round of phase.rounds) {
        for (const lobby of round.lobbies) {
          if (matchIndex >= fetchedMatches.length) break;
          const rawMatch = fetchedMatches[matchIndex++];
          const matchData = JSON.parse(JSON.stringify(rawMatch));

          const lobbyParticipants = (lobby.participants as { userId: string }[]) || [];
          const userMappingArr: { userId: string; placement: number; points: number }[] = [];

          for (let i = 0; i < lobbyParticipants.length && i < matchData.participants.length; i++) {
            const { userId } = lobbyParticipants[i];
            const realP = matchData.participants[i];
            const uniquePuuid = `${realP.puuid}_ft_${Date.now()}_${i}`;
            realP.puuid = uniquePuuid;
            await prisma.user.update({ where: { id: userId }, data: { puuid: uniquePuuid, riotGameName: realP.gameName || 'Player' } });
            userMappingArr.push({ userId, placement: realP.placement, points: ptsFormat[i] || 0 });
          }

          const newMatch = await prisma.match.create({
            data: { lobbyId: lobby.id, matchIdRiotApi: rawMatch.matchId, matchData: matchData as any }
          });

          for (const m of userMappingArr) {
            await prisma.matchResult.create({ data: { matchId: newMatch.id, userId: m.userId, placement: m.placement, points: m.points } });
            await prisma.participant.updateMany({
              where: { userId: m.userId, tournamentId: tour.id },
              data: { scoreTotal: { increment: m.points } }
            });
          }

          seededMatches.push(`Match:${newMatch.id}`);
        }
        if (matchIndex >= fetchedMatches.length) break;
      }
    }

    return res.json({
      success: true,
      tournamentId: tour.id,
      matchesFetched: fetchedMatches.length,
      matchesSeeded: seededMatches.length,
      seeded: seededMatches,
    });
  } catch (err: any) {
    console.error('[seed-full-tournament]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /dev/tournament-statistics/:id
 * Returns real unit/trait statistics computed from actual match data.
 * Used by Admin Tournament → Statistics tab.
 */
router.get('/tournament-statistics/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const matches = await prisma.match.findMany({
      where: { lobby: { round: { phase: { tournamentId: id } } } },
      include: { matchResults: { include: { user: true } } }
    });

    if (!matches.length) {
      return res.json({ success: true, stats: null, matchCount: 0 });
    }

    const unitMap = new Map<string, { count: number; wins: number }>();
    const traitMap = new Map<string, { name: string; level: string; count: number }>();
    let totalDuration = 0;
    let durationCount = 0;

    for (const match of matches) {
      const data = match.matchData as any;
      if (!data?.participants) continue;

      if (data.gameDuration) { totalDuration += data.gameDuration; durationCount++; }

      for (const p of data.participants) {
        const isWin = p.placement === 1;

        if (p.units?.length) {
          for (const unit of p.units) {
            const name = unit.character_id || unit.name;
            if (!name) continue;
            const cur = unitMap.get(name) || { count: 0, wins: 0 };
            unitMap.set(name, { count: cur.count + 1, wins: cur.wins + (isWin ? 1 : 0) });
          }
        }

        if (p.traits?.length) {
          for (const trait of p.traits) {
            if (!trait.name || !trait.num_units) continue;
            const key = `${trait.name}_${trait.num_units}`;
            const cur = traitMap.get(key) || { name: trait.name, level: String(trait.num_units), count: 0 };
            traitMap.set(key, { ...cur, count: cur.count + 1 });
          }
        }
      }
    }

    const topUnits = [...unitMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, { count, wins }]) => ({
        name: name.replace('TFT14_', '').replace('TFT13_', '').replace(/_/g, ' '),
        count,
        winrate: count > 0 ? Math.round((wins / count) * 100) : 0,
      }));

    const topTraits = [...traitMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const avgDuration = durationCount > 0
      ? `${Math.floor(totalDuration / durationCount / 60)}:${String(Math.round((totalDuration / durationCount) % 60)).padStart(2, '0')}`
      : null;

    return res.json({ success: true, matchCount: matches.length, stats: { topUnits, topTraits, avgDuration } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

import LobbyStateService from '../services/LobbyStateService';
import MatchService from '../services/MatchService';
import LobbyService from '../services/LobbyService';
import RoundService from '../services/RoundService';

/**
 * POST /dev/automation/seed-env
 */
router.post('/automation/seed-env', async (req: Request, res: Response) => {
  try {
    const { gameName, tagLine, region = 'sea', type = 'minitour' } = req.body;

    // If no specific Riot ID given, use the old generic seed scripts
    if (!gameName || !tagLine) {
      const { execSync } = require('child_process');
      execSync('npx ts-node scripts/seedUsers.ts', { stdio: 'inherit' });
      execSync('npx ts-node scripts/seedGrimoireTournament.ts', { stdio: 'inherit' });
      execSync('npx ts-node scripts/testMiniTourLobby.ts', { stdio: 'inherit' });
      return res.json({ success: true, message: "Generic environment seeded successfully" });
    }

    const { prisma } = require('../services/prisma');
    const GrimoireSvc = require('../services/GrimoireService').default;

    const { gameName2, tagLine2, gameName3, tagLine3, gameName4, tagLine4 } = req.body;
    const riotPlayers = [
      { gameName, tagLine },
      { gameName: gameName2, tagLine: tagLine2 },
      { gameName: gameName3, tagLine: tagLine3 },
      { gameName: gameName4, tagLine: tagLine4 },
    ].filter(p => p.gameName && p.tagLine);

    const startTime = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    let allRealParticipants: any[] = [];
    let allMatchIds: string[] = [];
    let fetchedAny = false;

    for (const p of riotPlayers) {
      try {
        const puuid = await GrimoireSvc.fetchPuuid(p.gameName, p.tagLine, region);
        const result = await GrimoireSvc.fetchLatestMatch([puuid], region, startTime, undefined, undefined);
        if (result.match) {
          fetchedAny = true;
          if (result.match.participants) allRealParticipants = allRealParticipants.concat(result.match.participants);
          const mIds = result.matchIds || [];
          if (!mIds.includes(result.match.matchId)) mIds.unshift(result.match.matchId);
          allMatchIds = allMatchIds.concat(mIds.filter((id: string) => id !== result.match.matchId));
        }
      } catch (err) {
        console.warn(`Failed to fetch for ${p.gameName}#${p.tagLine}:`, err);
      }
    }

    if (!fetchedAny) {
      throw new Error(`No recent match found for any provided Riot IDs. Cannot seed realistic environment.`);
    }

    const numPlayers = req.body.numPlayers || (type === 'minitour' ? 8 : 16);
    let uniqueParticipants = Array.from(new Map(allRealParticipants.map(item => [item.puuid, item])).values());
    allMatchIds = Array.from(new Set(allMatchIds)); // Unique queue of older matches
    let matchIdx = 0;

    // Pluck older matches only if we still lack participants
    while (uniqueParticipants.length < numPlayers && matchIdx < allMatchIds.length) {
      try {
        const m = await GrimoireSvc.fetchMatchById(allMatchIds[matchIdx], region);
        if (m && m.participants) {
          allRealParticipants = allRealParticipants.concat(m.participants);
          uniqueParticipants = Array.from(new Map(allRealParticipants.map(item => [item.puuid, item])).values());
        }
      } catch (err) {
        console.warn(`Failed older match fetch ${allMatchIds[matchIdx]}:`, err);
      }
      matchIdx++;
    }

    // Filter down to the exactly requested numPlayers limit
    uniqueParticipants = uniqueParticipants.slice(0, numPlayers);

    // Upsert the users from those match histories
    const dbUsers = [];
    for (let i = 0; i < uniqueParticipants.length; i++) {
      const p = uniqueParticipants[i];
      const u = await prisma.user.upsert({
        where: { puuid: p.puuid },
        update: { riotGameName: p.gameName || `Player${i}`, riotGameTag: p.tagLine || 'VN1' },
        create: {
          username: (p.gameName || `TestUser${i}`) + `_${i}_${Date.now().toString(36)}`,
          email: `${p.puuid.slice(0, 10)}@test.com`,
          puuid: p.puuid,
          riotGameName: p.gameName || `Player${i}`,
          riotGameTag: p.tagLine || 'VN1',
          password: 'dummy_dev_password',
          region: region,
        }
      });
      dbUsers.push(u);
    }

    if (type === 'minitour') {
      const lobby = await prisma.miniTourLobby.create({
        data: {
          name: `Realistic MiniTour - ${gameName}`,
          status: 'WAITING',
          entryFee: 0,
          prizePool: 1000,
          creatorId: dbUsers[0].id,
          currentPlayers: dbUsers.length,
          maxPlayers: 8,
          gameMode: 'Standard',
          skillLevel: 'Any',
          theme: 'Default',
          entryType: 'free',
          prizeDistribution: { "1": 500, "2": 300, "3": 200 }
        }
      });
      for (const u of dbUsers) {
        await prisma.miniTourLobbyParticipant.create({
          data: { miniTourLobbyId: lobby.id, userId: u.id }
        });
      }
      try {
        const io = (global as any).__io || (global as any).io;
        if (io) io.emit('tournaments_refresh');
      } catch (_) { }
      return res.json({ success: true, message: `Realistic MiniTour seeded with history from ${gameName}`, lobbyId: lobby.id });
    } else {
      // Tournament mode realistic seed
      const numPlayers = req.body.numPlayers || 8;
      const numberOfGroups = req.body.numberOfGroups || Math.ceil(numPlayers / 32);

      const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
      const tour = await prisma.tournament.create({
        data: {
          name: `Realistic Tournament - ${gameName} - ${numPlayers}P`,
          description: 'Live test tournament seeded from history.',
          image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80',
          region, startTime: new Date(Date.now() + 6 * 60 * 1000), // starts in 6 minutes to allow pre-assign
          entryFee: 100, maxPlayers: numPlayers, status: 'UPCOMING',
          organizerId: admin?.id || dbUsers[0]?.id,
          expectedParticipants: numPlayers, actualParticipantsCount: numPlayers,
          registrationDeadline: new Date(Date.now() + 5 * 60 * 1000),
          prizeStructure: [50, 30, 20, 0, 0, 0, 0, 0]
        }
      });

      // Seed requested number of players (use real dbUsers first, pad with dummy users)
      const allUsers = [];
      for (let i = 0; i < numPlayers; i++) {
        if (i < dbUsers.length) {
          allUsers.push(dbUsers[i]);
          await prisma.participant.create({ data: { userId: dbUsers[i].id, tournamentId: tour.id, paid: true } });
        } else {
          // create dummy user
          const dummyId = `dummy_${Date.now()}_${i}`;
          const dummyPuuiid = `puuid_${Date.now()}_${i}`;
          const dummy = await prisma.user.create({
            data: {
              username: `Dummy_${Date.now().toString(36)}_${i}`,
              email: `${dummyPuuiid}@test.com`,
              puuid: dummyPuuiid,
              riotGameName: `DummyPlayer_${i}`,
              riotGameTag: 'TEST',
              password: 'dummy_dev_password',
              region: region,
            }
          });
          allUsers.push(dummy);
          await prisma.participant.create({ data: { userId: dummy.id, tournamentId: tour.id, paid: true } });
        }
      }
      const participants = await prisma.participant.findMany({ where: { tournamentId: tour.id }, include: { user: true } });

      const phase1 = await prisma.phase.create({
        data: {
          tournamentId: tour.id,
          name: 'Group Stage',
          phaseNumber: 1,
          type: 'elimination',
          status: 'WAITING',
          lobbySize: 8,
          matchesPerRound: 1,
          numberOfRounds: numberOfGroups,
          advancementCondition: { type: 'placement', value: 4 }
        }
      });

      const firstRound = await prisma.round.create({
        data: { phaseId: phase1.id, roundNumber: 1, status: 'pending', startTime: new Date(Date.now() + 6 * 60 * 1000) }
      });

      // Automatically seed a Phase 2 (Checkmate Finals)
      const phase2 = await prisma.phase.create({
        data: {
          tournamentId: tour.id,
          name: 'Finals (Checkmate)',
          phaseNumber: 2,
          type: 'checkmate',
          status: 'pending',
          lobbySize: 8,
          matchesPerRound: 1,
          numberOfRounds: 1, // Will spawn infinitely until Checkmate is reached
          advancementCondition: 'checkmate',
          pointsMapping: { "1": 8, "2": 7, "3": 6, "4": 5, "5": 4, "6": 3, "7": 2, "8": 1 }
        }
      });
      // automatically create rounds for the groups
      for (let g = 2; g <= numberOfGroups; g++) {
        await prisma.round.create({
          data: { phaseId: phase1.id, roundNumber: g, status: 'pending', startTime: new Date(Date.now() + 6 * 60 * 1000) }
        });
      }

      try {
        const io = (global as any).__io || (global as any).io;
        if (io) io.emit('tournaments_refresh');
      } catch (_) { }

      return res.json({
        success: true,
        message: `Realistic Tournament seeded. Ready to Start.`,
        tournamentId: tour.id,
        roundId: firstRound.id,
        registeredCount: participants.length
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/clear-env
 */
router.post('/automation/clear-env', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    await prisma.playerMatchSummary.deleteMany({});
    await prisma.userTournamentSummary.deleteMany({});
    await prisma.roundOutcome.deleteMany({});
    await prisma.matchResult.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.miniTourMatchResult.deleteMany({});
    await prisma.miniTourMatch.deleteMany({});
    await prisma.miniTourLobbyParticipant.deleteMany({});
    await prisma.miniTourLobby.deleteMany({});
    await prisma.lobby.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.phase.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.tournament.deleteMany({});
    return res.json({ success: true, message: "All Tournaments and MiniTours cleared" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/ready-toggle
 */
router.post('/automation/ready-toggle', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    const { lobbyId, userId } = req.body;
    const LobbyStateService = require('../services/LobbyStateService').default;

    if (lobbyId && userId) {
      const state = await LobbyStateService.toggleReady(lobbyId, userId);
      return res.json({ success: true, state });
    }

    // Toggle ALL waiting lobbies
    const waitingLobbies = await prisma.lobby.findMany({
      where: { state: 'WAITING' },
    });

    if (waitingLobbies.length > 0) {
      for (const lobby of waitingLobbies) {
        // Force start the lobby using actual service so it's fully synchronized via Redis and BullMQ
        await LobbyStateService.forceStart(lobby.id);
      }
      return res.json({ success: true, message: `Forced Ready / Started ${waitingLobbies.length} WAITING lobbies.`, count: waitingLobbies.length });
    }

    return res.json({ success: true, message: "No WAITING lobby found to ready" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/auto-start
 */
router.post('/automation/auto-start', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    const { type = 'minitour' } = req.body;
    let targetLobbyId = req.body.lobbyId;

    if (!targetLobbyId && type === 'minitour') {
      const minitour = await prisma.miniTourLobby.findFirst({ where: { status: 'WAITING' }, orderBy: { createdAt: 'desc' } });
      if (minitour) targetLobbyId = minitour.id;
    } else if (!targetLobbyId) {
      const lobby = await prisma.lobby.findFirst({ where: { state: 'WAITING' } });
      if (lobby) targetLobbyId = lobby.id;
    }

    if (!targetLobbyId) throw new Error("No waiting lobby found.");

    if (type === 'minitour') {
      const updated = await prisma.miniTourLobby.update({
        where: { id: targetLobbyId },
        data: { status: 'IN_PROGRESS' },
      });
      const existing = await prisma.miniTourMatch.findFirst({ where: { miniTourLobbyId: targetLobbyId } });
      if (!existing) {
        await prisma.miniTourMatch.create({ data: { miniTourLobbyId: targetLobbyId, status: 'PENDING' } });
      }

      try {
        const io = (global as any).__io || (global as any).io;
        if (io) {
          io.to(`minitour:${targetLobbyId}`).emit('minitour_lobby_update', {
            miniTourLobbyId: updated.id,
            status: updated.status,
          });
          io.emit('tournaments_refresh');
        }
      } catch (_) { }

      return res.json({ success: true, lobby: updated });
    } else {
      // Find all waiting or starting lobbies
      const targetLobbies = await prisma.lobby.findMany({
        where: { state: { in: ['WAITING', 'STARTING', 'READY_CHECK', 'GRACE_PERIOD'] } },
        include: { round: { include: { phase: { include: { tournament: true } } } } }
      });

      if (targetLobbies.length === 0) {
        return res.json({ success: false, error: 'No WAITING or active lobbies found to start' });
      }

      const tournamentIds = new Set<string>();

      for (const lobby of targetLobbies) {
        await prisma.lobby.update({
          where: { id: lobby.id },
          data: { state: 'PLAYING' }
        });

        await prisma.round.update({
          where: { id: lobby.roundId },
          data: { status: 'in_progress' }
        });
        await prisma.phase.update({
          where: { id: lobby.round.phaseId },
          data: { status: 'in_progress' }
        });
        await prisma.tournament.update({
          where: { id: lobby.round.phase.tournamentId },
          data: { status: 'in_progress' }
        });
        tournamentIds.add(lobby.round.phase.tournamentId);

        try {
          const LobbyStateService = require('../services/LobbyStateService').default;
          await LobbyStateService.transitionPhase(lobby.id, lobby.state, 'PLAYING');

          const io = (global as any).__io || (global as any).io;
          if (io) {
            io.to(`lobby:${lobby.id}`).emit('lobby:state_update', await LobbyStateService.getLobbyState(lobby.id).catch(() => null));
          }
        } catch (_) { }
      }

      try {
        const io = (global as any).__io || (global as any).io;
        if (io) {
          for (const tId of tournamentIds) {
            io.to(`tournament:${tId}`).emit('tournament_update');
          }
          io.emit('tournaments_refresh');
        }
      } catch (_) { }

      return res.json({
        success: true,
        message: `Successfully started ${targetLobbies.length} lobbies`
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/simulate-match
 * Body: { type?, gameName?, tagLine?, region?, lobbyId? }
 * 
 * Fetches a REAL Riot match using the provided Riot ID (gameName#tagLine).
 * If no Riot ID provided, tries to find a user with a valid PUUID in the DB.
 */
router.post('/automation/simulate-match', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    const { type = 'minitour', gameName, tagLine, region = 'sea' } = req.body;
    const GrimoireSvc = require('../services/GrimoireService').default;

    // ── Resolve PUUID ──────────────────────────────────────────────────────────
    let puuid: string;

    if (gameName && tagLine) {
      // Caller provided a Riot ID → fetch real PUUID
      try {
        puuid = await GrimoireSvc.fetchPuuid(gameName, tagLine, region);
      } catch (e: any) {
        return res.status(400).json({ success: false, error: `Cannot find PUUID for ${gameName}#${tagLine}: ${e.message}` });
      }
    } else {
      // Fallback: find a user in DB whose PUUID looks valid (not a dev-mutated one)
      const userWithPuuid = await prisma.user.findFirst({
        where: {
          puuid: { not: '' },
          AND: [
            { puuid: { not: { contains: '_mt_' } } },
            { puuid: { not: { contains: '_ft_' } } },
            { puuid: { not: { contains: '_tour_' } } },
          ],
          riotGameName: { not: '' },
        },
        select: { puuid: true, riotGameName: true, riotGameTag: true },
      });

      if (!userWithPuuid?.puuid) {
        return res.status(400).json({
          success: false,
          error: 'No valid Riot ID provided and no users with valid PUUIDs found in DB. Please provide gameName and tagLine.',
        });
      }
      puuid = userWithPuuid.puuid;
    }

    const startTime = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const result = await GrimoireSvc.fetchLatestMatch([puuid], region, startTime, undefined, undefined);

    if (!result.match) {
      return res.status(404).json({
        success: false,
        error: `No recent Riot match found for ${gameName ? `${gameName}#${tagLine}` : `PUUID ${puuid.substring(0, 12)}...`}. Make sure they played a TFT match in the last 30 days.`,
        matchIds: result.matchIds,
      });
    }

    if (type === 'minitour') {
      const lobby = await prisma.miniTourLobby.findFirst({
        where: { status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' },
        include: { participants: true, matches: { where: { status: 'PENDING' } } }
      });
      if (!lobby) throw new Error("No IN_PROGRESS MiniTour lobby found");

      const matchDb = lobby.matches[0];
      if (!matchDb) throw new Error("No pending match in MiniTour to override");

      const rawMatch = JSON.parse(JSON.stringify(result.match));
      const pool = lobby.prizePool || 100000;
      const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];
      const prizeFormat = [Math.floor(pool * 0.5), Math.floor(pool * 0.3), Math.floor(pool * 0.2), 0, 0, 0, 0, 0];

      // Delete existing placeholder results before inserting real ones
      await prisma.miniTourMatchResult.deleteMany({
        where: { miniTourMatchId: matchDb.id },
      });

      await prisma.miniTourMatch.update({
        where: { id: matchDb.id },
        data: { matchIdRiotApi: result.match.matchId + '_sim_' + Date.now(), matchData: rawMatch as any, status: 'COMPLETED', fetchedAt: new Date() }
      });

      // Map users properly by PUUID so real Riot history works without overwriting overrides
      const lobbyParticipantsWithUsers = await prisma.miniTourLobbyParticipant.findMany({
        where: { miniTourLobbyId: lobby.id },
        include: { user: true }
      });

      for (let i = 0; i < lobbyParticipantsWithUsers.length; i++) {
        const p = lobbyParticipantsWithUsers[i];
        const realP = rawMatch.participants.find((rp: any) => rp.puuid === p.user.puuid) || rawMatch.participants[i];

        await prisma.miniTourMatchResult.create({
          data: {
            miniTourMatchId: matchDb.id,
            userId: p.userId,
            placement: realP?.placement || i + 1,
            points: ptsFormat[realP?.placement ? realP.placement - 1 : i] || 0,
            prize: prizeFormat[realP?.placement ? realP.placement - 1 : i] || 0
          }
        });
      }
      const completedCount = await prisma.miniTourMatch.count({ where: { miniTourLobbyId: lobby.id, status: 'COMPLETED' } });
      const isInfinite = lobby.totalMatches === -1 || lobby.totalMatches === 0;
      const nextStatus = isInfinite ? 'WAITING' : (completedCount >= lobby.totalMatches ? 'COMPLETED' : 'WAITING');

      const updatedMiniTourLobby = await prisma.miniTourLobby.update({
        where: { id: lobby.id },
        data: { status: nextStatus },
        include: { matches: { include: { miniTourMatchResults: true } }, participants: { include: { user: true } } }
      });

      // UPDATE PLAYER PROFILE STATS DIRECTLY FOR DEV TOOLS
      try {
        const SummaryManagerService = require('../services/SummaryManagerService').default;
        for (const p of lobbyParticipantsWithUsers) {
          await SummaryManagerService.updateMiniTourParticipantSummary(lobby.id, p.userId);
        }
      } catch (err) {
        console.error("Failed to update minitour summary in dev route:", err);
      }

      try {
        const io = (global as any).__io || (global as any).io;
        if (io) {
          io.to(`minitour:${lobby.id}`).emit('minitour_lobby_update', {
            miniTourLobbyId: updatedMiniTourLobby.id,
            status: updatedMiniTourLobby.status,
            matches: updatedMiniTourLobby.matches,
            participants: updatedMiniTourLobby.participants,
            name: updatedMiniTourLobby.name,
          });
          // Notify player profile pages of affected users
          for (const p of lobbyParticipantsWithUsers) {
            io.emit('player_profile_update', { userId: p.userId });
          }
        }
      } catch (_) { }

      return res.json({ success: true, message: "Simulated Riot Match for MiniTour Lobby", lobbyId: lobby.id });
    } else {
      const lobbies = await prisma.lobby.findMany({
        where: { state: 'PLAYING' },
        include: { round: { include: { phase: true } } }
      });
      if (lobbies.length === 0) throw new Error("No PLAYING Tournament lobbies found");

      // Pre-fetch a pool of match results — one distinct fetch per lobby so results differ
      // We try to find a participant in each lobby who has a real PUUID and fetch their latest match.
      const lobbyMatchResults: Map<string, any> = new Map();
      for (const lobby of lobbies) {
        const lobbyUserIds = lobby.participants as string[];
        // Find a real PUUID from a participant in this specific lobby
        const lobbyUser = await prisma.user.findFirst({
          where: {
            id: { in: lobbyUserIds },
            puuid: { not: '' },
            AND: [
              { puuid: { not: { contains: 'puuid_' } } },
              { puuid: { not: { contains: '_mt_' } } },
            ],
          },
          select: { puuid: true },
        });
        if (lobbyUser?.puuid) {
          try {
            const lobbyResult = await GrimoireSvc.fetchLatestMatch([lobbyUser.puuid], region, startTime, undefined, undefined);
            if (lobbyResult.match) {
              lobbyMatchResults.set(lobby.id, lobbyResult.match);
              continue;
            }
          } catch (_) {}
        }
        // Fallback: use the original fetched match (already fetched above)
        lobbyMatchResults.set(lobby.id, result.match);
      }

      for (const lobby of lobbies) {
        // Delete any existing simulated matches to prevent spawning duplicates when clicking multiple times
        const existingMatches = await prisma.match.findMany({ where: { lobbyId: lobby.id } });
        for (const m of existingMatches) {
          await prisma.matchResult.deleteMany({ where: { matchId: m.id } });
          await prisma.match.delete({ where: { id: m.id } });
        }

        // Use lobby-specific match data to ensure different lobbies get different results
        const lobbyMatchData = lobbyMatchResults.get(lobby.id) || result.match;
        const rawMatch = JSON.parse(JSON.stringify(lobbyMatchData));
        const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];

        const newMatch = await prisma.match.create({
          data: { lobbyId: lobby.id, matchIdRiotApi: result.match.matchId + '_sim_' + Date.now(), matchData: rawMatch as any, fetchedAt: new Date() }
        });

        const participantsWithUsers = await prisma.participant.findMany({
          where: {
            userId: { in: lobby.participants as string[] },
            tournamentId: lobby.round.phase.tournamentId
          },
          include: { user: true }
        });

        for (let i = 0; i < participantsWithUsers.length; i++) {
          const p = participantsWithUsers[i];
          const realP = rawMatch.participants.find((rp: any) => rp.puuid === p.user.puuid) || rawMatch.participants[i];

          const pointsToAssign = ptsFormat[realP?.placement ? realP.placement - 1 : i] || 0;
          await prisma.matchResult.create({
            data: {
              matchId: newMatch.id,
              userId: p.userId,
              placement: realP?.placement || i + 1,
              points: pointsToAssign
            }
          });

          await prisma.participant.update({
            where: { id: p.id },
            data: { scoreTotal: { increment: pointsToAssign } }
          });
        }

        await prisma.lobby.update({
          where: { id: lobby.id },
          data: { completedMatchesCount: { increment: 1 }, fetchedResult: true }
        });

        // UPDATE PLAYER PROFILE STATS DIRECTLY FOR DEV TOOLS
        try {
          const SummaryManagerService = require('../services/SummaryManagerService').default;
          const resultsForSummary = participantsWithUsers.map((p: any, i: number) => {
            const realP = rawMatch.participants.find((rp: any) => rp.puuid === p.user.puuid) || rawMatch.participants[i];
            return {
              userId: p.userId,
              placement: realP?.placement || i + 1,
              points: ptsFormat[realP?.placement ? realP.placement - 1 : i] || 0
            };
          });
          await SummaryManagerService.createMatchSummaries(newMatch.id, resultsForSummary);
        } catch (err) {
          console.error("Failed to update tournament summary in dev route:", err);
        }

        // Use unified state transition so Redis is synced and Socket.IO emits
        const LobbyStateService = require('../services/LobbyStateService').default;
        await LobbyStateService.transitionPhase(lobby.id, 'PLAYING', 'FINISHED');

        try {
          const io = (global as any).__io || (global as any).io;
          if (io) {
            const snapshot = await LobbyStateService.getLobbyState(lobby.id).catch(() => null);
            if (snapshot) io.to(`lobby:${lobby.id}`).emit('lobby:state_update', snapshot);

            // Explicitly emit tournament_update so UI refetches immediately regardless of state changes
            // This is crucial because if lobby is already FINISHED, transitionPhase skips emitting
            io.to(`tournament:${lobby.round.phase.tournamentId}`).emit('tournament_update');
            // Notify player profile pages of affected users
            for (const p of participantsWithUsers) {
              io.emit('player_profile_update', { userId: p.userId });
            }
          }
        } catch (_) { }
      } // End of lobbies loop

      try {
        const { checkAndAdvanceRound } = require('../jobs/roundCompletionWorker');
        const uniqueRoundIds = Array.from(new Set(lobbies.map((l: any) => l.roundId)));
        
        for (const rId of uniqueRoundIds) {
          // Delay briefly to allow transactions and events to settle
          setTimeout(() => {
            checkAndAdvanceRound(rId).catch((err: any) => console.error("Simulated match round advance error:", err));
          }, 500);
        }
      } catch (err) {
        console.error("Failed to trigger checkAndAdvanceRound:", err);
      }

      try {
        const io = (global as any).__io || (global as any).io;
        if (io && lobbies.length > 0) io.to(`tournament:${lobbies[0].round.phase.tournamentId}`).emit('tournament_update');
      } catch (_) { }

      return res.json({
        success: true,
        message: `Simulated Riot Match for ${lobbies.length} Lobbies`,
        tournamentId: lobbies[0]?.round?.phase?.tournamentId,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/assign-lobby
 */
router.post('/automation/assign-lobby', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    let targetRoundId = req.body.roundId;
    let targetRound: any = null;

    if (!targetRoundId) {
      targetRound = await prisma.round.findFirst({
        where: { lobbies: { none: {} } },
        orderBy: { roundNumber: 'asc' }
      });
      if (targetRound) targetRoundId = targetRound.id;
    } else {
      targetRound = await prisma.round.findUnique({ where: { id: targetRoundId } });
    }

    if (!targetRound) throw new Error("No valid Round found to assign lobbies");

    await RoundService.autoAdvance(targetRound.id);
    return res.json({ success: true, message: "Lobbies assigned / round advanced for " + targetRound.roundNumber, roundId: targetRound.id });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/pre-assign-groups
 * Pre-assigns participants into groups (rounds) and lobbies for the given tournament.
 */
router.post('/automation/pre-assign-groups', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    let tournamentId = req.body.tournamentId;

    if (!tournamentId) {
      const tour = await prisma.tournament.findFirst({
        where: { status: { in: ['pending', 'UPCOMING', 'REGISTRATION'] } },
        orderBy: { createdAt: 'desc' }
      });
      if (tour) tournamentId = tour.id;
    }

    if (!tournamentId) throw new Error("No valid tournament found to pre-assign groups.");

    const result = await RoundService.preAssignGroups(tournamentId);

    try {
      const io = (global as any).__io || (global as any).io;
      if (io) {
        io.to(`tournament:${tournamentId}`).emit('tournament_update');
        io.to(`tournament:${tournamentId}`).emit('bracket_update', { tournamentId });
      }
    } catch (_) { }

    return res.json({ success: true, ...result, tournamentId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /dev/automation/advance-round
 */
router.post('/automation/advance-round', async (req: Request, res: Response) => {
  try {
    const { prisma } = require('../services/prisma');
    let targetRoundId = req.body.roundId;
    let targetRound: any = null;

    if (!targetRoundId) {
      targetRound = await prisma.round.findFirst({
        where: { lobbies: { some: { state: 'FINISHED' } } },
        orderBy: { roundNumber: 'desc' },
        include: { phase: true }
      });
      if (targetRound) targetRoundId = targetRound.id;
    } else {
      targetRound = await prisma.round.findUnique({ where: { id: targetRoundId }, include: { phase: true } });
    }

    if (!targetRound) throw new Error("No valid Round found to advance");
    await RoundService.autoAdvance(targetRound.id);
    return res.json({ success: true, message: "Auto advance triggered for round " + targetRound.roundNumber });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
