"use client"

import { use, useEffect, useMemo } from "react"
import { useTournamentStore } from "@/app/stores/tournamentStore"
import { IMatchResult, PlayerRoundStats } from "@/app/types/tournament"
import { RoundHeader } from "@/app/[locale]/tournaments/[id]/components/round/RoundHeader"
import { RoundSummary } from "@/app/[locale]/tournaments/[id]/components/round/RoundSummary"
import { RoundTabs } from "@/app/[locale]/tournaments/[id]/components/round/RoundTabs"
import { RoundResultsLoading } from "@/app/[locale]/tournaments/[id]/components/round/RoundResultsLoading"

export default function RoundResultsPage({ params }: { params: { id: string; round: string } }) {
  const {
    currentTournament,
    fetchRoundDetails,
    roundLoading,
    currentRoundDetails: roundData,
    matchResults,
  } = useTournamentStore()

  useEffect(() => {
    if (params.id && params.round) {
      fetchRoundDetails(params.id, params.round)
    }
  }, [params.id, params.round, fetchRoundDetails])

  // Real-time: re-fetch round data on any relevant socket event
  useEffect(() => {
    if (!params.id || !params.round) return

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL
      || (process.env.NEXT_PUBLIC_API_URL?.replace('/api', ''))
      || 'http://localhost:4000'

    let socketInstance: any = null

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(SOCKET_URL, { transports: ['websocket'] })
      socketInstance.emit('join_tournament', params.id)

      const refetch = () => fetchRoundDetails(params.id, params.round)
      socketInstance.on('tournament_update', refetch)
      socketInstance.on('bracket_update', refetch)
      socketInstance.on('round_started', refetch)
    })

    return () => {
      if (socketInstance) socketInstance.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.round])

  const allPlayers: PlayerRoundStats[] = useMemo(() => {
    if (!roundData || !currentTournament?.participants) {
      return []
    }

    const participantIdsInRound = new Set(
        roundData.lobbies?.flatMap(lobby => {
          return (lobby.participants || []).map((p: any) => p?.userId || p)
        })
    );

    // Build per-lobby player stats first so we can rank within each lobby for auto-elimination
    const currentPhase = currentTournament.phases.find(p => p.id === roundData.phaseId);
    const advancementN = (currentPhase?.advancementCondition as any)?.value ?? null; // e.g. top 4 advance

    const rawPlayers = currentTournament.participants
      .filter(participant => participant.userId && participantIdsInRound.has(participant.userId))
      .map((participant) => {
        if (!participant || !participant.user) return null;

        const participantLobby = roundData.lobbies?.find(lobby =>
            (lobby.participants || []).some((p: any) => (p?.userId || p) === participant.userId)
        );

        // Sort matches by gameCreation — handles both Grimoire (root-level) and legacy (info.gameCreation)
        const sortedMatches = (participantLobby?.matches || []).slice().sort((a, b) => {
          const timeA = (a.matchData as any)?.gameCreation ?? (a.matchData as any)?.info?.gameCreation ?? 0;
          const timeB = (b.matchData as any)?.gameCreation ?? (b.matchData as any)?.info?.gameCreation ?? 0;
          return timeA - timeB;
        });

        const playerMatchResults = sortedMatches
            .map(match => matchResults[match.id]?.find(r => r.participantId === participant.userId))
            .filter((result): result is IMatchResult => result !== undefined);

        const calculatedRoundScore = playerMatchResults.reduce((sum, result) => sum + result.points, 0);
        const placements = playerMatchResults.map(r => r.placement);
        const lastPlacement = placements.length > 0 ? placements[placements.length - 1] : Infinity;

        const roundOutcome = participant.roundOutcomes?.find(
            (outcome) => outcome.roundId === roundData.id
        );

        const totalScoreToShow = roundOutcome?.scoreInRound ?? calculatedRoundScore;

        return {
            id: participant.id,
            userId: participant.userId,
            lobbyId: participantLobby?.id,
            lobbyName: participantLobby?.name || "N/A",
            name: participant.user?.riotGameName || participant.user?.username || "N/A",
            region: participant.user?.region || "N/A",
            placements: placements,
            lastPlacement: lastPlacement,
            points: playerMatchResults.map((r) => r.points),
            total: totalScoreToShow,
            roundOutcomeStatus: roundOutcome?.status ?? null,
            eliminatedGlobal: participant.eliminated ?? false,
        };
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    // Derive status per lobby: if roundOutcomes not present, rank players within each lobby
    // and eliminate bottom (lobbySize - advancementN) players.
    const lobbyGroups = new Map<string, typeof rawPlayers>();
    for (const p of rawPlayers) {
      const key = p.lobbyId ?? 'unknown';
      if (!lobbyGroups.has(key)) lobbyGroups.set(key, []);
      lobbyGroups.get(key)!.push(p);
    }

    return rawPlayers.map((player) => {
      let status: "advanced" | "eliminated" | "pending";

      if (player.roundOutcomeStatus) {
        // Server-authoritative: use roundOutcome from DB
        status = player.roundOutcomeStatus as "advanced" | "eliminated";
      } else if (player.placements.length > 0 && advancementN !== null) {
        // Derive from score rank within this lobby (only when we have actual match data)
        const lobbyPlayers = lobbyGroups.get(player.lobbyId ?? 'unknown') ?? [];
        const sorted = [...lobbyPlayers].sort((a, b) => {
          const scoreDiff = b.total - a.total;
          if (scoreDiff !== 0) return scoreDiff;
          return a.lastPlacement - b.lastPlacement; // tiebreaker: better last placement
        });
        const rank = sorted.findIndex(p => p.id === player.id) + 1;
        status = rank <= advancementN ? "advanced" : "eliminated";
      } else if (player.placements.length > 0) {
        // Has placements but no advancementN configured — use global eliminated flag
        status = player.eliminatedGlobal ? "eliminated" : "advanced";
      } else {
        // No match results yet — don't guess
        status = "pending";
      }

      return {
        id: player.id,
        name: player.name,
        region: player.region,
        lobbyName: player.lobbyName,
        placements: player.placements,
        lastPlacement: player.lastPlacement,
        points: player.points,
        total: player.total,
        status,
      } as PlayerRoundStats;
    });
  }, [currentTournament, roundData, matchResults])

  if (roundLoading || !roundData || !currentTournament) {
    return <RoundResultsLoading />
  }

  const playersAdvanced = allPlayers.filter((p) => p.status === "advanced").length
  const playersEliminated = allPlayers.filter((p) => p.status === "eliminated").length
  const totalPointsAwarded = allPlayers.reduce((sum, p) => sum + p.total, 0)
  
  const currentPhase = currentTournament?.phases.find((p) => p.id === roundData.phaseId)
  const configuredMatchesPerRound = currentPhase?.matchesPerRound ?? 1
  
  // Correctly calculate the total number of matches in the entire round
  const numLobbies = roundData.lobbies?.length ?? 0
  
  // Calculate actual matches by counting them in the data instead of using configuration
  const actualMatchesCount = roundData.lobbies?.reduce((total, lobby) => {
    return total + (lobby.matches?.length || 0)
  }, 0) || 0
  
  // Use actual match count for checkmate phases, otherwise use configured value
  const isCheckmate = currentPhase?.type === 'checkmate'
  const totalMatchesForRound = isCheckmate 
    ? actualMatchesCount 
    : numLobbies * configuredMatchesPerRound

  // Calculate the maximum number of matches per lobby for display purposes
  const maxMatchesPerLobby= roundData.lobbies?.reduce((max, lobby) => {
    return Math.max(max, lobby.matches?.length || 0)
  }, 0) || configuredMatchesPerRound

  return (
    <div className="container py-8 space-y-6">
      <RoundHeader tournament={currentTournament} round={roundData}  />
      <RoundSummary
        totalMatches={totalMatchesForRound}
        pointsAwarded={totalPointsAwarded}
        playersAdvanced={playersAdvanced}
        playersEliminated={playersEliminated}
      />
      <RoundTabs tournament={currentTournament} round={roundData} allPlayers={allPlayers} numMatches={maxMatchesPerLobby} />
    </div>
  )
}
