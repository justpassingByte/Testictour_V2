'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface UseTournamentSocketOptions {
  /**
   * Optional callback invoked on any socket event (tournament_update, bracket_update,
   * leaderboard_update). Used by dashboard pages that still rely on manual state
   * management (useState + refresh()) instead of React Query.
   *
   * Debounced at 300ms to coalesce burst events.
   */
  onUpdate?: () => void;
}

/**
 * useTournamentSocket — single socket hook for tournament live pages.
 *
 * Pattern: socket event → queryClient.invalidateQueries → React Query refetches.
 * This replaces the old pattern of socket → setState / window.dispatchEvent.
 *
 * Benefits:
 * - React Query deduplicates burst invalidations (staleTime guard)
 * - Automatic retry / error handling
 * - Components subscribed via useQuery auto-update without prop drilling
 * - Dashboard pages can pass { onUpdate: refresh } to piggyback on the same connection
 */
export function useTournamentSocket(tournamentId: string, options?: UseTournamentSocketOptions) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  // Ref pattern: keeps callback fresh without causing socket teardown on re-renders
  const onUpdateRef = useRef(options?.onUpdate);
  useEffect(() => { onUpdateRef.current = options?.onUpdate; }, [options?.onUpdate]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    // Debounced onUpdate — coalesces burst events (e.g. 5 bracket_update in 200ms → 1 refresh)
    const fireOnUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { onUpdateRef.current?.(); }, 300);
    };

    socket.on('connect', () => {
      socket.emit('join', { tournamentId });
    });

    // On reconnect, invalidate everything to recover from stale state
    socket.on('reconnect', () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      fireOnUpdate();
    });

    socket.on('tournament_update', () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-summary', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-bracket', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-statistics', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard', tournamentId] });
      fireOnUpdate();
    });

    socket.on('bracket_update', () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-bracket', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-summary', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-statistics', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard', tournamentId] });
      fireOnUpdate();
    });

    socket.on('leaderboard_update', () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard', tournamentId] });
      fireOnUpdate();
    });

    socket.on('tournaments_refresh', () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      fireOnUpdate();
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tournamentId, queryClient]);

  return socketRef;
}
