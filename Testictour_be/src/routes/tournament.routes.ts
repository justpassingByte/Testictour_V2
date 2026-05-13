import { Router, Request, Response, NextFunction } from 'express';
import TournamentController from '../controllers/TournamentController';
import auth from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../services/prisma';

const UPLOAD_DIR = path.join('public', 'uploads', 'tournaments');
// Ensure upload directory exists at startup
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

// Public
router.get('/', TournamentController.list);
router.get('/my', auth('admin', 'partner'), TournamentController.myTournaments);
router.get('/:id', TournamentController.detail);

// Create — admin or paid partner
router.post('/', auth('admin', 'partner'), TournamentController.create);
router.post('/auto', auth('admin'), TournamentController.createAutoTournament);

// Update/Delete — admin always, partner only for own tournaments
router.put('/:id', auth('admin', 'partner'), TournamentController.update);
router.delete('/:id', auth('admin', 'partner'), TournamentController.remove);

// Image Upload Endpoint. OPTIONS preflight is handled by the global CORS middleware in app.ts.
router.post('/:id/image', auth('admin', 'partner'), upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      console.error(`[ImageUpload] No file received for tournament ${id}. Content-Type: ${req.headers['content-type']}`);
      return res.status(400).json({ success: false, message: 'No image uploaded. Make sure the request is multipart/form-data.' });
    }
    const imageUrl = `/uploads/tournaments/${req.file.filename}`;
    const updated = await prisma.tournament.update({
      where: { id },
      data: { image: imageUrl }
    });
    console.log(`[ImageUpload] Tournament ${id} image updated → ${imageUrl}`);
    res.json({ success: true, image: imageUrl, tournament: updated });
  } catch (error) {
    next(error);
  }
});

// Sync
router.post('/:id/sync', auth('admin', 'partner'), TournamentController.syncMatches);

// Recent Results (Public)
router.get('/:id/recent-results', TournamentController.recentResults);

// Live Summary (Public) — lightweight endpoint for Live page header/summary cards.
// Returns only basic tournament info + lobby states. NO matches, NO matchResults, NO participants.
// ~10ms vs ~500ms+ for the full detail endpoint.
router.get('/:id/live-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, description: true, status: true,
        startTime: true, endTime: true, image: true, region: true,
        maxPlayers: true, entryFee: true, hostFeePercent: true,
        escrow: { select: { fundedAmount: true } },
        isCommunityMode: true, prizeStructure: true,
        lastSyncTime: true, syncStatus: true, discordUrl: true,
        organizer: { select: { id: true, username: true } },
        _count: { select: { participants: { where: { isReserve: false } } } },
        phases: {
          orderBy: { phaseNumber: 'asc' },
          select: {
            id: true, name: true, type: true, phaseNumber: true,
            status: true, matchesPerRound: true,
            rounds: {
              orderBy: { roundNumber: 'asc' },
              select: {
                id: true, roundNumber: true, status: true,
                lobbies: {
                  select: {
                    id: true, name: true, state: true,
                    completedMatchesCount: true, phaseStartedAt: true,
                  }
                }
              }
            }
          }
        }
      }
    }) as any;

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Flatten to compute live stats server-side
    const allLobbies = tournament.phases.flatMap((p: any) => p.rounds.flatMap((r: any) => r.lobbies));
    const playingCount = allLobbies.filter((l: any) => l.state === 'PLAYING').length;

    res.json({
      success: true,
      tournament: {
        ...tournament,
        registered: tournament._count.participants,
        budget: Math.max(
          tournament.escrow?.fundedAmount || 0,
          (tournament._count.participants || 0) * (tournament.entryFee || 0) * (1 - (tournament.hostFeePercent || 0.1))
        ),
        _count: undefined,
        escrow: undefined,
      },
      liveStats: {
        totalLobbies: allLobbies.length,
        playingLobbies: playingCount,
        finishedLobbies: allLobbies.filter((l: any) => l.state === 'FINISHED').length,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Bracket (Public) — get group bracket for tournament
router.get('/:id/bracket', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const RoundService = require('../services/RoundService').default;
    const bracket = await RoundService.getBracket(req.params.id);
    res.json({ success: true, ...bracket });
  } catch (error) {
    next(error);
  }
});

// Pre-assign groups (Admin) — assign participants to groups/lobbies before tournament starts
router.post('/:id/pre-assign', auth('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const RoundService = require('../services/RoundService').default;
    const result = await RoundService.preAssignGroups(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// ── Scoreboard Export (Public) ────────────────────────────────────────────
// Returns full structured scoreboard data: each phase → group/lobby → match → placement + points
// Used for exporting scoreboard CSV with complete per-match data
router.get('/:id/scoreboard-export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = require('../services/prisma');

    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
              include: {
                lobbies: {
                  include: {
                    matches: {
                      include: {
                        matchResults: {
                          include: {
                            user: {
                              select: { id: true, username: true, riotGameName: true, riotGameTag: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Helper to get group letter from roundNumber
    const groupNameFromNumber = (num: number) => String.fromCharCode(64 + num);

    // Build structured response
    const phases = tournament.phases.map((phase: any) => {
      const groups = phase.rounds.map((round: any) => {
        const groupLetter = groupNameFromNumber(round.roundNumber);
        const lobbies = round.lobbies.map((lobby: any) => {
          const matches = lobby.matches.map((match: any, matchIdx: number) => {
            const results = match.matchResults.map((r: any) => ({
              userId: r.userId,
              username: r.user?.username || 'Unknown',
              riotGameName: r.user?.riotGameName || '',
              riotGameTag: r.user?.riotGameTag || '',
              placement: r.placement,
              points: r.points,
            }));
            // Sort by placement for cleaner output
            results.sort((a: any, b: any) => a.placement - b.placement);
            return {
              matchNumber: matchIdx + 1,
              matchIdRiotApi: match.matchIdRiotApi,
              fetchedAt: match.fetchedAt,
              results,
              totalPoints: results.reduce((sum: number, r: any) => sum + r.points, 0),
            };
          });

          return {
            lobbyId: lobby.id,
            lobbyName: lobby.name,
            state: lobby.state,
            completedMatchesCount: lobby.completedMatchesCount,
            matches,
          };
        });

        return {
          groupLetter,
          roundId: round.id,
          roundNumber: round.roundNumber,
          status: round.status,
          lobbies,
        };
      });

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        phaseNumber: phase.phaseNumber,
        type: phase.type,
        status: phase.status,
        groups,
      };
    });

    res.json({
      success: true,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      phases,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
