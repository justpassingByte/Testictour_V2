import { Router } from 'express';
import { ParticipantController } from '../controllers/ParticipantController';
import auth from '../middlewares/auth';

const router = Router();
router.get('/:id/history', auth(), ParticipantController.getHistory);

router.post('/:tournamentId/join', auth('user'), ParticipantController.join);
router.get('/:tournamentId/participants', ParticipantController.list);
router.get('/:tournamentId/leaderboard', ParticipantController.leaderboard);
router.get('/:tournamentId/leaderboard/paginated', ParticipantController.paginatedLeaderboard);
router.get('/:tournamentId/top-participants', ParticipantController.topParticipants);
router.put('/:tournamentId/participants/:participantId', auth('admin'), ParticipantController.update);
router.delete('/:tournamentId/participants/:participantId', auth('admin'), ParticipantController.remove);

export default router; 