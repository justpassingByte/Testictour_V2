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
      // Fetch PUUID for given Riot ID
      try {
        puuid = await GrimoireService.fetchPuuid(gameName, tagLine, region);
      } catch (e: any) {
        return res.status(400).json({ success: false, error: `Cannot find PUUID for ${gameName}#${tagLine}: ${e.message}` });
      }
    } else {
      // Fallback: use a real known PUUID so the Grimoire API doesn't fail with fake dummy PUUIDs
      // This is a known PUUID from our mocked test data
      puuid = 'DH7MwwQjP_IRTHXCK0TlDM0jADBBOa8h1Fb9KLGwlRXTfx9LttT0bHW5rGHpQwWREyX7_xVyobDPXQ';
    }

    // Go back 30 days
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

    // ────────────────────────────────────────────────────────
    // Auto-Clear and Seed real match data directly into the DB
    // ────────────────────────────────────────────────────────
    let seededLobbyIds: string[] = [];
    try {
      let tour = await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });
      let miniTourLobby = await prisma.miniTourLobby.findFirst({ orderBy: { createdAt: 'desc' }, include: { participants: { include: { user: true } } } });
      
      // If the user completely deleted everything, run the seeders first!
      if (!tour || !miniTourLobby) {
        console.log('[Dev Endpoint] Database is empty! Running setup scripts automatically...');
        const { execSync } = require('child_process');
        try {
          execSync('npx ts-node scripts/seedUsers.ts', { stdio: 'inherit' });
          execSync('npx ts-node scripts/seedGrimoireTournament.ts', { stdio: 'inherit' });
          execSync('npx ts-node scripts/testMiniTourLobby.ts', { stdio: 'inherit' });
        } catch(seedingErr) {
          console.error('Initial seeding scripts failed:', seedingErr);
          // Continue execution, it might have partially succeeded
        }
        
        tour = await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });
        miniTourLobby = await prisma.miniTourLobby.findFirst({ orderBy: { createdAt: 'desc' }, include: { participants: { include: { user: true } } } });
      }

      // CLEAR all old extra test MiniTour Lobbies so the UI stays clean with only exactly 1
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

      // CLEAR old MatchResults and Matches so we don't conflict with previously seeded data
      // This satisfies the requirement to "clear and re-seed" in one click!
      await prisma.playerMatchSummary.deleteMany({});
      await prisma.roundOutcome.deleteMany({});
      await prisma.matchResult.deleteMany({});
      await prisma.match.deleteMany({});
      await prisma.miniTourMatchResult.deleteMany({});
      await prisma.miniTourMatch.deleteMany({});

      // 1. RE-SEED INTO TOURNAMENT
      if (tour) {
        const phase = await prisma.phase.findFirst({ where: { tournamentId: tour.id } });
        const round = phase ? await prisma.round.findFirst({ where: { phaseId: phase.id } }) : null;
        let lobby = round ? await prisma.lobby.findFirst({ where: { roundId: round.id } }) : null;
        
        if (lobby) {
          // Clone the match data strictly for Tournament 
          const tourMatchData = JSON.parse(JSON.stringify(result.match));
          // Fetch original lobby participants from JSON
          const lobbyParticipants = lobby.participants as { userId: string; [key: string]: any }[];
          const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];
          
          // Phase 1: Mutate PUUIDs in the JSON
          const userMappingArr = [];
          for (let i = 0; i < lobbyParticipants.length && i < tourMatchData.participants.length; i++) {
            const pDb = lobbyParticipants[i];
            const realP = tourMatchData.participants[i];
            const uniquePuuid = `${realP.puuid}_tour_${Date.now()}_${i}`;
            realP.puuid = uniquePuuid; // update cloned data
            userMappingArr.push({ pDb, realP, uniquePuuid, index: i });
          }

          // Phase 2: Create Match with the now-mutated data
          const newMatch = await prisma.match.create({
            data: {
              lobbyId: lobby.id,
              matchIdRiotApi: result.match.matchId,
              matchData: tourMatchData as any
            }
          });

          // Phase 3: Update users, create match results, and seed entry_fee transactions
          const entryFee = (tour as any).entryFee || 0;
          for (const m of userMappingArr) {
            await prisma.user.update({
              where: { id: m.pDb.userId },
              data: { puuid: m.uniquePuuid, riotGameName: m.realP.gameName || 'Player' }
            });

            await prisma.matchResult.create({
              data: {
                matchId: newMatch.id,
                userId: m.pDb.userId,
                placement: m.realP.placement,
                points: ptsFormat[m.index] || 0
              }
            });
          }

          // Seed entry_fee transaction for consistent history
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

      // 2. RE-SEED INTO MINITOUR
      if (miniTourLobby && miniTourLobby.participants.length > 0) {
        const mtMatchData = JSON.parse(JSON.stringify(result.match));
        const ptsFormat = [8, 7, 6, 5, 4, 3, 2, 1];
        
        let pool = miniTourLobby.prizePool || 0;
        if (pool === 0) pool = 100000; // Fallback so we still see prizes if pool is 0
        
        // Dynamically distribute 50% / 30% / 20%
        const prizeFormat = [
          Math.floor(pool * 0.5),
          Math.floor(pool * 0.3),
          Math.floor(pool * 0.2),
          0, 0, 0, 0, 0
        ];
        
        const mtUserMappingArr = [];
        for (let i = 0; i < miniTourLobby.participants.length && i < mtMatchData.participants.length; i++) {
          const mtP = miniTourLobby.participants[i];
          const realP = mtMatchData.participants[i];
          const uniquePuuid = `${realP.puuid}_mt_${Date.now()}_${i}`;
          realP.puuid = uniquePuuid; // update cloned data
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
      console.error('[Dev Endpoint] Failed to auto-seed map DB:', e);
      return res.status(500).json({ success: false, error: 'DB Seeding Error: ' + e.message });
    }

    return res.json({ success: true, seeded: seededLobbyIds, match: result.match });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
