"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { PlayerRoundStats, IRound, ITournament } from "@/app/types/tournament"
import { RoundHeader } from "@/app/[locale]/tournaments/[id]/components/round/RoundHeader"
import { RoundSummary } from "@/app/[locale]/tournaments/[id]/components/round/RoundSummary"
import { RoundTabs } from "@/app/[locale]/tournaments/[id]/components/round/RoundTabs"
import { RoundResultsLoading } from "@/app/[locale]/tournaments/[id]/components/round/RoundResultsLoading"
import { RoundService } from "@/app/services/RoundService"
import { useTournamentStore } from "@/app/stores/tournamentStore"

export default function RoundResultsPage({ params }: { params: { id: string; round: string } }) {
  const searchParams = useSearchParams();
  const limitMatchQuery = searchParams.get('limitMatch');
  const limitMatch = limitMatchQuery ? parseInt(limitMatchQuery, 10) : null;

  // Local state — no longer depends on the heavy tournament store for data
  const [loading, setLoading] = useState(true)
  const [scoreboardData, setScoreboardData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Write to store for RoundTabs backward compat — do NOT subscribe (avoids unnecessary re-renders)

  const fetchScoreboard = useCallback(async () => {
    try {
      const data = await RoundService.getScoreboard(params.round, limitMatch)
      setScoreboardData(data)

      // Sync matchResults to store for RoundTabs match detail view
      useTournamentStore.setState({
        matchResults: data.matchResults || {},
        currentRoundDetails: data.round,
        roundLoading: false,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load scoreboard')
    } finally {
      setLoading(false)
    }
  }, [params.round, limitMatch])

  useEffect(() => {
    fetchScoreboard()
  }, [fetchScoreboard])

  // Real-time: re-fetch scoreboard on socket events (lightweight — only this round's data)
  useEffect(() => {
    if (!params.id || !params.round) return

    const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

    let socketInstance: any = null
    let isMounted = true

    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return // component unmounted before promise resolved
      socketInstance = io(SOCKET_URL, { transports: ['websocket'] })
      socketInstance.emit('join', { tournamentId: params.id })

      const refetch = () => fetchScoreboard()
      socketInstance.on('tournament_update', refetch)
      socketInstance.on('bracket_update', refetch)
      socketInstance.on('round_started', refetch)
    })

    return () => {
      isMounted = false
      if (socketInstance) socketInstance.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.round])

  if (loading || !scoreboardData) {
    return <RoundResultsLoading />
  }

  if (error) {
    return (
      <div className="container py-8 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  const { tournament, round: roundData, phase, scoreboard, summary } = scoreboardData

  // Build lightweight tournament-like object for components that need it
  const tournamentForComponents: ITournament = {
    ...tournament,
    phases: [{
      id: phase.id,
      name: phase.name,
      type: phase.type,
      phaseNumber: phase.phaseNumber,
      matchesPerRound: phase.matchesPerRound,
      advancementCondition: phase.advancementCondition,
      status: 'in_progress',
      rounds: [roundData],
      tournamentId: tournament.id,
    }],
    participants: [], // Not needed — scoreboard is pre-computed
  } as any

  const allPlayers: PlayerRoundStats[] = scoreboard

  return (
    <div className="container py-8 space-y-6">
      <RoundHeader tournament={tournamentForComponents} round={roundData} limitMatch={limitMatch} onSync={fetchScoreboard} />
      <RoundSummary
        totalMatches={summary.totalMatches}
        pointsAwarded={summary.pointsAwarded}
        playersAdvanced={summary.playersAdvanced}
        playersEliminated={summary.playersEliminated}
      />
      <RoundTabs
        tournament={tournamentForComponents}
        round={roundData}
        allPlayers={allPlayers}
        numMatches={summary.numMatchColumns}
      />
    </div>
  )
}
