import { Router } from 'express';
import { ParticipantController } from '../controllers/ParticipantController';
import auth from '../middlewares/auth';

const router = Router();
router.get('/:id/history', auth(), ParticipantController.getHistory);

router.post('/:tournamentId/join', auth('user', 'partner', 'admin'), ParticipantController.join);
router.post('/:tournamentId/guest-join', ParticipantController.guestJoin);
router.post('/:tournamentId/assign-player', auth('admin'), ParticipantController.adminAssign);
router.get('/:tournamentId/participants', ParticipantController.list);
router.get('/:tournamentId/leaderboard', ParticipantController.leaderboard);
router.get('/:tournamentId/leaderboard/paginated', ParticipantController.paginatedLeaderboard);
router.get('/:tournamentId/top-participants', ParticipantController.topParticipants);
router.get('/:tournamentId/reserves', auth('admin', 'partner'), ParticipantController.listReserves);
router.put('/:tournamentId/participants/:participantId', auth('admin', 'partner'), ParticipantController.update);
router.post('/:tournamentId/participants/:participantId/check-in', auth('user', 'partner', 'admin'), ParticipantController.checkIn);
router.delete('/:tournamentId/participants/:participantId', auth('admin'), ParticipantController.remove);
router.get('/:tournamentId/payment-status', auth('user'), ParticipantController.paymentStatus);

export default router; 
