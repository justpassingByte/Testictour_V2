"use client"

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTournamentSocket } from '@/app/hooks/useTournamentSocket'
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
  const queryClient = useQueryClient();
  
  // Use the store's current tournament if it was updated, otherwise fallback to the initial SSR data
  const tournament = currentTournament?.id === initialTournament.id ? currentTournament : initialTournament;

  // ── Single socket connection via centralized hook ──
  // Replaces inline io() + window.dispatchEvent pattern
  // Socket events → queryClient.invalidateQueries → React Query refetches tab data
  useTournamentSocket(initialTournament.id);

  // Also refresh the Zustand store when React Query cache gets invalidated
  // (for components still using the store — gradual migration)
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event?.query?.queryKey?.[0] === 'tournament-bracket') {
        fetchTournamentDetail(initialTournament.id);
      }
    });
    return () => unsubscribe();
  }, [queryClient, fetchTournamentDetail, initialTournament.id]);

  // Fallback: lightweight 30s poll in case socket events are missed.
  // Only polls when the tab is visible and the tournament is active.
  useEffect(() => {
    const activeStatuses = ['UPCOMING', 'pending', 'in_progress', 'REGISTRATION'];
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && activeStatuses.includes(initialTournament.status)) {
        fetchTournamentDetail(initialTournament.id);
        queryClient.invalidateQueries({ queryKey: ['tournament', initialTournament.id] });
      }
    }, 30_000);

    return () => clearInterval(pollInterval);
  }, [fetchTournamentDetail, initialTournament.id, initialTournament.status, queryClient]);

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