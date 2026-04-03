import express from 'express';
import PlayerController from '../controllers/PlayerController';

const router = express.Router();

// Public leaderboard (no auth required) - must be before :id routes
router.get('/players/leaderboard', PlayerController.getLeaderboard);

// Get player details
router.get('/players/:id', PlayerController.getPlayerById);

// Get player history (includes tournament participation details)
router.get('/players/:id/history', PlayerController.getPlayerHistory);

// Get player stats
router.get('/players/:id/stats', PlayerController.getPlayerStats);

// Update player rank (supports both user ID and participant ID)
router.put('/players/:id/rank', PlayerController.updatePlayerRank);

// Get player match history with pagination (optimized using PlayerMatchSummary)
router.get('/players/:id/matches', PlayerController.getPlayerMatchSummaries);

// Get player tournament history with pagination (optimized using UserTournamentSummary)
router.get('/players/:id/tournaments', PlayerController.getPlayerTournamentSummaries);

export default router; 