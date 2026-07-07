"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTournamentSocket } from "@/app/hooks/useTournamentSocket"
import { ITournament, IPhase } from "@/app/types/tournament"
import { PhaseHeader } from "./PhaseHeader"
import { PhaseNav } from "./PhaseNav"

interface PhasePageShellProps {
  tournament: ITournament
  phase: IPhase
  children: React.ReactNode
}

export function PhasePageShell({ tournament, phase, children }: PhasePageShellProps) {
  const queryClient = useQueryClient()
  useTournamentSocket(tournament.id)

  const handleSync = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tournament-bracket", tournament.id] })
    await queryClient.invalidateQueries({ queryKey: ["phase-standings", tournament.id, phase.id] })
  }

  return (
    <div className="container py-8 space-y-6">
      <PhaseHeader tournament={tournament} phase={phase} onSync={handleSync} />
      <PhaseNav
        tournamentId={tournament.id}
        phases={tournament.phases || []}
        currentPhaseNumber={phase.phaseNumber}
      />
      {children}
    </div>
  )
}
