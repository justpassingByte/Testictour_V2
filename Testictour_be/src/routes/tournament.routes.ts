import { Router, Request, Response, NextFunction } from 'express';
import TournamentController from '../controllers/TournamentController';
import auth from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import { prisma } from '../services/prisma';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/tournaments'); 
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

// Image Upload Endpoint (new)
router.post('/:id/image', auth('admin', 'partner'), upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const imageUrl = `/uploads/tournaments/${req.file.filename}`;
    const updated = await prisma.tournament.update({
      where: { id },
      data: { image: imageUrl }
    });
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

export default router;