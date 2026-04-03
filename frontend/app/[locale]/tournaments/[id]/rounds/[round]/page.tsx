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

  const allPlayers: PlayerRoundStats[] = useMemo(() => {
    if (!roundData || !currentTournament?.participants || Object.keys(matchResults).length === 0) {
      return []
    }

    const participantIdsInRound = new Set(
        roundData.lobbies?.flatMap(lobby => lobby.participants as string[] || [])
    );

    return currentTournament.participants
      .filter(participant => participant.userId && participantIdsInRound.has(participant.userId))
      .map((participant) => {
        if (!participant || !participant.user) return null;

        const participantLobby = roundData.lobbies?.find(lobby => 
            (lobby.participants as string[] || []).includes(participant.userId!)
        );

        // Ensure matches are sorted by creation time for correct column display
        const sortedMatches = (participantLobby?.matches || []).slice().sort((a, b) => {
          const timeA = a.matchData?.info?.gameCreation ?? 0;
          const timeB = b.matchData?.info?.gameCreation ?? 0;
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

        const status: "advanced" | "eliminated" = roundOutcome
            ? roundOutcome.status as "advanced" | "eliminated"
            : participant.eliminated ? "eliminated" : "advanced";

        const totalScoreToShow = roundOutcome?.scoreInRound ?? calculatedRoundScore; 

        return {
            id: participant.id,
            name: participant.user?.riotGameName || "N/A",
            region: participant.user?.region || "N/A",
            lobbyName: participantLobby?.name || "N/A",
            placements: placements,
            lastPlacement: lastPlacement,
            points: playerMatchResults.map((r) => r.points),
            total: totalScoreToShow,
            status: status,
        };
    }).filter((p): p is PlayerRoundStats => p !== null);
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
