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

const router = Router();

router.use('/auth', authRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/tournament-templates', templateRoutes);
router.use('/templates', templateRoutes); // Alias for frontend compatibility
router.use('/tournaments', participantRoutes);
router.use('/phases', phaseRoutes);
router.use('/rounds', roundRoutes);
router.use('/', lobbyRoutes);
router.use('/', matchRoutes);
router.use('/matches', matchSyncRoutes); // Match sync & minitour match creation
router.use('/', balanceRoutes);
router.use('/', playerRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/notifications', adminNotificationsRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/minitour-lobbies', miniTourLobbyRoutes);
router.use('/partner', partnerRoutes);
router.use('/', lobbyStateRoutes); // Lobby state machine REST endpoints

export default router;

