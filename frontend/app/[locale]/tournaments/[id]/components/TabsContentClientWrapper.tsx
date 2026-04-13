"use client"

import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { TournamentTabsContent } from './TournamentTabsContent'
import { ITournament, IParticipant } from '@/app/types/tournament'
import { useTournamentStore } from '@/app/stores/tournamentStore'

interface TabsContentClientWrapperProps {
  tournament: ITournament;
  participants: IParticipant[];
}

// This is a client component wrapper for TournamentTabsContent
export default function TabsContentClientWrapper({ tournament: initialTournament, participants }: TabsContentClientWrapperProps) {
  const fetchTournamentDetail = useTournamentStore(state => state.fetchTournamentDetail);
  const currentTournament = useTournamentStore(state => state.currentTournament);
  
  // Use the store's current tournament if it was updated, otherwise fallback to the initial SSR data
  const tournament = currentTournament?.id === initialTournament.id ? currentTournament : initialTournament;

  useEffect(() => {
    // Primary: WebSocket for instant real-time updates
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    
    socket.on('connect', () => {
      console.log('[Socket] Connected, joining tournament:', initialTournament.id);
      socket.emit('join', { tournamentId: initialTournament.id });
    });

    socket.on('connect_error', (err: any) => {
      console.error('[Socket] Connection error:', err.message);
    });
    
    socket.on('tournament_update', (data: any) => {
      console.log('[Socket] Received tournament_update:', data);
      fetchTournamentDetail(initialTournament.id);
      window.dispatchEvent(new CustomEvent('bracket_update'));
    });

    socket.on('tournaments_refresh', () => {
      fetchTournamentDetail(initialTournament.id);
      window.dispatchEvent(new CustomEvent('bracket_update'));
    });

    socket.on('bracket_update', () => {
      window.dispatchEvent(new CustomEvent('bracket_update'));
    });

    // Fallback: lightweight 30s poll in case socket events are missed
    // Only polls when the tab is visible and the tournament is active
    const activeStatuses = ['UPCOMING', 'pending', 'in_progress', 'REGISTRATION'];
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && activeStatuses.includes(initialTournament.status)) {
        fetchTournamentDetail(initialTournament.id);
      }
    }, 30_000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [fetchTournamentDetail, initialTournament.id, initialTournament.status]);

  // Mock function for fetchMoreParticipants since we're already loading all participants server-side
  const fetchMoreParticipants = async () => {
    console.log('Client-side fetch more participants called, but not implemented')
    return Promise.resolve()
  }

  return (
    <TournamentTabsContent 
      tournament={tournament} 
      participants={participants} 
      fetchMoreParticipants={fetchMoreParticipants} 
      loading={false} 
    />
  )
}