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
}: UseLobbySocketOptions): UseLobbySocketReturn {
  const [state, setState] = useState<ILobbyStateSnapshot | null>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReadyToggling, setIsReadyToggling] = useState(false);

  const socketRef = useRef<Socket | null>(null);

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
    });

    socket.on('lobby:error', ({ message }: { message: string }) => {
      setError(message);
      setIsReadyToggling(false);
    });

    socket.on('lobby:remade', () => {
      // Re-sync after remake
      socket.emit('lobby:sync', { lobbyId });
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
