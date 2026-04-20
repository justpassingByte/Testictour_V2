import { Router } from 'express';

import authRoutes from './auth.routes';
import tournamentRoutes from './tournament.routes';
import templateRoutes from './template.routes';
import participantRoutes from './participant.routes';
import roundRoutes from './round.routes';
import lobbyRoutes from './lobby.routes';
import matchRoutes from './match.routes';
import matchSyncRoutes from './match.route';
import balanceRoutes from './balance.routes';
import phaseRoutes from './phase.routes';
import playerRoutes from './playerRoutes';
import adminRoutes from './admin.routes';
import adminNotificationsRoutes from './adminNotifications.routes';
import adminSettingsRoutes from './adminSettings.routes';
import miniTourLobbyRoutes from './miniTourLobby.route';
import partnerRoutes from './partner.routes';
import lobbyStateRoutes from './lobbyState.routes';
import devRoutes from './dev.routes';
import escrowRoutes from './escrow.routes';
import adminEscrowRoutes from './adminEscrow.routes';
import { getPublicPlans } from '../controllers/adminSettings.controller';
import partnerRewardRoutes from './partnerReward.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/tournament-templates', templateRoutes);
router.use('/templates', templateRoutes); // Alias for frontend compatibility
router.use('/tournaments', participantRoutes);
router.use('/tournaments', escrowRoutes);  // Escrow routes scoped to /tournaments/:id
router.use('/phases', phaseRoutes);
router.use('/rounds', roundRoutes);
router.use('/', lobbyRoutes);
router.use('/', matchRoutes);
router.use('/matches', matchSyncRoutes); // Match sync & minitour match creation
router.use('/', balanceRoutes);
router.use('/', playerRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', adminEscrowRoutes);  // Admin escrow operational endpoints
router.use('/admin/notifications', adminNotificationsRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/minitour-lobbies', miniTourLobbyRoutes);
router.use('/partner', partnerRoutes);
router.use('/partner/rewards', partnerRewardRoutes);
router.use('/', lobbyStateRoutes); // Lobby state machine REST endpoints
import sepayRoutes from './sepay.routes';
import walletRoutes from './wallet.routes';

router.use('/webhooks/sepay', sepayRoutes);
router.use('/partner/wallet', walletRoutes);
router.use('/dev', devRoutes);   // Dev/test utilities

// Public endpoints (no auth)
router.get('/public/plans', getPublicPlans);

import { getPublicPartnerRewards } from '../controllers/partnerReward.controller';
import SepayPgController from '../controllers/SepayPgController';

router.get('/public/partner-rewards/:partnerId', getPublicPartnerRewards);
router.get('/payments/sepay-pg/:transactionId', SepayPgController.renderCheckout);
router.post('/payments/sepay-pg/ipn/:transactionId', SepayPgController.handleIpn);
router.post('/payments/confirm-pending/:tournamentId', SepayPgController.confirmPendingPayment);

export default router;
