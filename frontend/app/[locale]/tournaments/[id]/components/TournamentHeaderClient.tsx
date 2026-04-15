"use client"

import { useCallback } from "react"
import { ITournament } from "@/app/types/tournament"
import { TournamentHeader } from "./TournamentHeader"
import { TournamentService } from "@/app/services/TournamentService"
import { useTournamentStore } from "@/app/stores/tournamentStore"

interface TournamentHeaderClientProps {
  tournament: ITournament
}

/**
 * Client wrapper that wires a real onSync callback to TournamentHeader.
 * When the user clicks the refresh button, we re-fetch the tournament detail
 * and push it into the Zustand store so all client components update immediately.
 */
export function TournamentHeaderClient({ tournament }: TournamentHeaderClientProps) {
  const handleSync = useCallback(async () => {
    const fresh = await TournamentService.detail(tournament.id)
    if (fresh) {
      useTournamentStore.setState({ currentTournament: fresh })
    }
  }, [tournament.id])

  return <TournamentHeader tournament={tournament} onSync={handleSync} />
}
