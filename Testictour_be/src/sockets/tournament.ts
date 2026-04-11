import { Server } from 'socket.io';
import LobbyStateService from '../services/LobbyStateService';
import MiniTourLobbyStateService from '../services/MiniTourLobbyStateService';
import logger from '../utils/logger';

export default function registerTournamentSocket(io: Server) {
  io.on('connection', (socket) => {
    // Join rooms by tournamentId, userId, lobbyId
    socket.on('join', ({ tournamentId, userId, lobbyId }) => {
      if (tournamentId) socket.join(`tournament:${tournamentId}`);
      if (userId) socket.join(`user:${userId}`);
      if (lobbyId) socket.join(`lobby:${lobbyId}`);
    });

    // ── Lobby State Machine Events ──────────────────────────────────

    // Player toggles their ready status
    socket.on('lobby:ready_toggle', async ({ lobbyId, userId }) => {
      try {
        const state = await LobbyStateService.toggleReady(lobbyId, userId);
        io.to(`lobby:${lobbyId}`).emit('lobby:state_update', state);
      } catch (err: any) {
        socket.emit('lobby:error', { message: err.message });
        logger.warn(`lobby:ready_toggle error (lobby=${lobbyId}, user=${userId}): ${err.message}`);
      }
    });

    // Minitour ready toggle
    socket.on('minitour:ready_toggle', async ({ lobbyId, userId }) => {
      try {
        const state = await MiniTourLobbyStateService.toggleReady(lobbyId, userId);
        // Emits 'minitour_lobby_state_update' inside toggleReady, but emit here just in case wrapper needed
        // The service already emits it to 'minitour:lobbyId'
      } catch (err: any) {
        socket.emit('minitour_lobby:error', { message: err.message });
        logger.warn(`minitour:ready_toggle error (lobby=${lobbyId}, user=${userId}): ${err.message}`);
      }
    });

    // On reconnect / page load: send current state snapshot
    socket.on('minitour:sync', async ({ lobbyId }) => {
      try {
        const state = await MiniTourLobbyStateService.getLobbyState(lobbyId);
        socket.emit('minitour_lobby_state_update', state);
      } catch (err: any) {
        socket.emit('minitour_lobby:error', { message: err.message });
      }
    });

    // Player requests a +60s delay
    socket.on('lobby:request_delay', async ({ lobbyId, userId }) => {
      try {
        const state = await LobbyStateService.requestDelay(lobbyId, userId);
        io.to(`lobby:${lobbyId}`).emit('lobby:state_update', state);
      } catch (err: any) {
        socket.emit('lobby:error', { message: err.message });
        logger.warn(`lobby:request_delay error (lobby=${lobbyId}, user=${userId}): ${err.message}`);
      }
    });

    // On reconnect / page load: send current state snapshot
    socket.on('lobby:sync', async ({ lobbyId }) => {
      try {
        const state = await LobbyStateService.getLobbyState(lobbyId);
        socket.emit('lobby:state_update', state);
      } catch (err: any) {
        socket.emit('lobby:error', { message: err.message });
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────
    // Ready state in Redis is NOT cleared on disconnect — player stays ready.
    // Redis TTL on the ready set expires when lobby transitions to FINISHED.

    // Legacy: emit match_result_update
    // io.to('lobby:123').emit('match_result_update', { ... });
    // Legacy: emit tournament_update
    // io.to('tournament:456').emit('tournament_update', { ... });
  });
}
 