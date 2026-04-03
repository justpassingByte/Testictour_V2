import { Server } from 'socket.io';

export default function registerTournamentSocket(io: Server) {
  io.on('connection', (socket) => {
    // Join rooms by tournamentId, userId, lobbyId
    socket.on('join', ({ tournamentId, userId, lobbyId }) => {
      if (tournamentId) socket.join(`tournament:${tournamentId}`);
      if (userId) socket.join(`user:${userId}`);
      if (lobbyId) socket.join(`lobby:${lobbyId}`);
    });
    // Example: emit match_result_update
    // io.to('lobby:123').emit('match_result_update', { ... });
    // Example: emit tournament_update
    // io.to('tournament:456').emit('tournament_update', { ... });
  });
} 