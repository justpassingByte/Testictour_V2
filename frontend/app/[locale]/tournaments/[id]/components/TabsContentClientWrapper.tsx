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
    // Instead of heavy 10-second polling, use WebSockets to listen for state changes.
    // This saves massive server load while keeping UI perfectly synchronized.
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    
    socket.on('connect', () => {
      // Join the tournament room to receive tailored updates
      socket.emit('join', { tournamentId: initialTournament.id });
    });
    
    socket.on('tournament_update', () => {
      // Fetch heavyweight tournament details
      fetchTournamentDetail(initialTournament.id);
      // Also notify bracket tab to fetch lobby changes since tournament_update often comes from lobby finishes
      window.dispatchEvent(new CustomEvent('bracket_update'));
    });

    socket.on('tournaments_refresh', () => {
      fetchTournamentDetail(initialTournament.id);
      window.dispatchEvent(new CustomEvent('bracket_update'));
    });

    // Listen for explicit bracket_update to notify the TournamentBracketTab to re-fetch
    socket.on('bracket_update', () => {
      // Dispatch custom window event so TournamentBracketTab can re-fetch bracket data
      window.dispatchEvent(new CustomEvent('bracket_update'));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchTournamentDetail, initialTournament.id]);

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