'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ILobbyStateSnapshot } from '@/app/types/tournament';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface UseLobbySocketOptions {
  lobbyId: string;
  userId?: string;
  tournamentId?: string;
  initialState?: ILobbyStateSnapshot | null;
  /** Called when a tournament_update socket event fires */
  onTournamentUpdate?: (data: any) => void;
  /** Called when lobby:state_update fires (after setState, for side effects like data refetch) */
  onLobbyDataRefresh?: () => void;
}

interface UseLobbySocketReturn {
  state: ILobbyStateSnapshot | null;
  isConnected: boolean;
  error: string | null;
  toggleReady: () => void;
  requestDelay: () => void;
  isReadyToggling: boolean;
}

export function useLobbySocket({
  lobbyId,
  userId,
  tournamentId,
  initialState = null,
  onTournamentUpdate,
  onLobbyDataRefresh,
}: UseLobbySocketOptions): UseLobbySocketReturn {
  const [state, setState] = useState<ILobbyStateSnapshot | null>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReadyToggling, setIsReadyToggling] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  // Use refs for callbacks to avoid socket teardown when callbacks change
  const onTournamentUpdateRef = useRef(onTournamentUpdate);
  const onLobbyDataRefreshRef = useRef(onLobbyDataRefresh);
  useEffect(() => { onTournamentUpdateRef.current = onTournamentUpdate; }, [onTournamentUpdate]);
  useEffect(() => { onLobbyDataRefreshRef.current = onLobbyDataRefresh; }, [onLobbyDataRefresh]);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);

      // Join rooms
      socket.emit('join', { tournamentId, userId, lobbyId });

      // Sync current state on (re)connect
      socket.emit('lobby:sync', { lobbyId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
    });

    // Real-time state updates from server
    socket.on('lobby:state_update', (snapshot: ILobbyStateSnapshot) => {
      setState(snapshot);
      setIsReadyToggling(false);
      // Notify consumer to refetch lobby REST data if needed
      onLobbyDataRefreshRef.current?.();
    });

    socket.on('lobby:error', ({ message }: { message: string }) => {
      setError(message);
      setIsReadyToggling(false);
    });

    socket.on('lobby:remade', () => {
      // Re-sync after remake
      socket.emit('lobby:sync', { lobbyId });
    });

    // Forward tournament-level events to consumer via callback ref (stable, no socket teardown)
    socket.on('tournament_update', (data: any) => {
      onTournamentUpdateRef.current?.(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [lobbyId, userId, tournamentId]);

  const toggleReady = useCallback(() => {
    if (!socketRef.current || !userId) return;
    setIsReadyToggling(true);
    setError(null);
    socketRef.current.emit('lobby:ready_toggle', { lobbyId, userId });
  }, [lobbyId, userId]);

  const requestDelay = useCallback(() => {
    if (!socketRef.current || !userId) return;
    setError(null);
    socketRef.current.emit('lobby:request_delay', { lobbyId, userId });
  }, [lobbyId, userId]);

  return { state, isConnected, error, toggleReady, requestDelay, isReadyToggling };
}
