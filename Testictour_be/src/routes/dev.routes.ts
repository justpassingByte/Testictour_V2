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
        } catch(seedingErr) {
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
          await prisma.miniTourMatchResult.deleteMany({ where: { miniTourMatch: { miniTourLobbyId: oldLobbyId } }});
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
          const lobbyParticipants = lobby.participants as { userId: string; [key: string]: any }[];
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
            matchData: mtMatchData as any,
            status: 'COMPLETED',
            fetchedAt: new Date()
          }
        });

        for (const m of mtUserMappingArr) {
          await prisma.user.update({
            where: { id: m.mtP.userId },
            data: { puuid: m.uniquePuuid, riotGameName: m.realP.gameName || m.mtP.user?.username || 'Player' }
          });
          await prisma.miniTourMatchResult.create({
            data: {
              miniTourMatchId: mtMatch.id,
              userId: m.mtP.userId,
              placement: m.realP.placement,
              points: ptsFormat[m.index] || 0,
              prize: prizeFormat[m.index] || 0
            }
          });
        }

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

export default router;
