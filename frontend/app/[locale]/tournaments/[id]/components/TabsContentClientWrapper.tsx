"use client"

import { TournamentTabsContent } from './TournamentTabsContent'
import { ITournament, IParticipant } from '@/app/types/tournament'

interface TabsContentClientWrapperProps {
  tournament: ITournament;
  participants: IParticipant[];
}

// This is a client component wrapper for TournamentTabsContent
export default function TabsContentClientWrapper({ tournament, participants }: TabsContentClientWrapperProps) {
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