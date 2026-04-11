import { useEffect, useState, useCallback } from 'react';
import { useMiniTourLobbyStore } from '@/app/stores/miniTourLobbyStore';

export function useMiniTourSocket(lobbyId: string, userId?: string) {
  const { updateFromRealtimeSnapshot, toggleReady: storeToggleReady } = useMiniTourLobbyStore();
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReadyToggling, setIsReadyToggling] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    if (!lobbyId) return;

    let isSubscribed = true;
    const { io } = require('socket.io-client');
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      if (!isSubscribed) return;
      setIsConnected(true);
      setSocketError(null);
      // Let the general connection know we are a user joining the socket
      newSocket.emit('join', { userId, lobbyId });
      // Ask for current Minitour specific state
      newSocket.emit('minitour:sync', { lobbyId });
    });

    newSocket.on('disconnect', () => {
      if (!isSubscribed) return;
      setIsConnected(false);
    });

    newSocket.on('minitour_lobby_state_update', (snapshot: any) => {
      if (!isSubscribed) return;
      setIsReadyToggling(false);
      updateFromRealtimeSnapshot(snapshot);
    });

    newSocket.on('minitour_lobby:error', (err: any) => {
      if (!isSubscribed) return;
      setIsReadyToggling(false);
      setSocketError(err.message || 'Lỗi kết nối sảnh');
      setTimeout(() => setSocketError(null), 5000);
    });
    
    // Fallback if backend uses the 'lobby:error' namespace
    newSocket.on('lobby:error', (err: any) => {
      if (!isSubscribed) return;
      setIsReadyToggling(false);
      setSocketError(err.message || 'Lỗi máy chủ');
      setTimeout(() => setSocketError(null), 5000);
    });

    setSocket(newSocket);

    return () => {
      isSubscribed = false;
      newSocket.disconnect();
    };
  }, [lobbyId, userId, updateFromRealtimeSnapshot]);

  const toggleReady = useCallback(() => {
    if (!socket || !userId) return;
    setIsReadyToggling(true);
    storeToggleReady(socket, lobbyId, userId);
  }, [socket, userId, lobbyId, storeToggleReady]);

  return { isConnected, socketError, toggleReady, isReadyToggling };
}
