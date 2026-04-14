"use client"

import { use, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useTournamentStore } from "@/app/stores/tournamentStore"
import { IMatchResult, PlayerRoundStats } from "@/app/types/tournament"
import { RoundHeader } from "@/app/[locale]/tournaments/[id]/components/round/RoundHeader"
import { RoundSummary } from "@/app/[locale]/tournaments/[id]/components/round/RoundSummary"
import { RoundTabs } from "@/app/[locale]/tournaments/[id]/components/round/RoundTabs"
import { RoundResultsLoading } from "@/app/[locale]/tournaments/[id]/components/round/RoundResultsLoading"

export default function RoundResultsPage({ params }: { params: { id: string; round: string } }) {
  const searchParams = useSearchParams();
  const limitMatchQuery = searchParams.get('limitMatch');
  const limitMatch = limitMatchQuery ? parseInt(limitMatchQuery, 10) : null;

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
    // For elimination: ranking is per-match placement only, NOT cumulative score
    const isElimination = currentPhase?.type === 'elimination';

    const rawPlayers = currentTournament.participants
      .filter(participant => participant.userId && participantIdsInRound.has(participant.userId))
      .map((participant) => {
        if (!participant || !participant.user) return null;

        const participantLobby = roundData.lobbies?.find(lobby =>
            (lobby.participants || []).some((p: any) => (p?.userId || p) === participant.userId)
        );

        // To properly capture multi-match history where lobbies are reshuffled,
        // we must check ALL matches across ALL lobbies in this round, because
        // their old matches might belong to a different lobby!
        const allRoundMatches = roundData.lobbies?.flatMap(l => l.matches || []) || [];

        // Sort matches by gameCreation — handles both Grimoire (root-level) and legacy (info.gameCreation)
        const sortedMatches = allRoundMatches.sort((a, b) => {
          const timeA = (a.matchData as any)?.gameCreation ?? (a.matchData as any)?.info?.gameCreation ?? a.createdAt ?? 0;
          const timeB = (b.matchData as any)?.gameCreation ?? (b.matchData as any)?.info?.gameCreation ?? b.createdAt ?? 0;
          const timeAMs = timeA instanceof Date ? timeA.getTime() : new Date(timeA).getTime();
          const timeBMs = timeB instanceof Date ? timeB.getTime() : new Date(timeB).getTime();
          return timeAMs - timeBMs;
        });

        // 1. Get ALL match results in chronological order for this player
        const allPlayerMatchResultsWithLobby = sortedMatches
            .map(match => {
                const result = matchResults[match.id]?.find(r => r.participantId === participant.userId);
                return result ? { result, lobbyId: match.lobbyId } : null;
            })
            .filter((item): item is { result: IMatchResult, lobbyId: string } => item !== null);

        // 2. If viewing a specific Match Tab (limitMatch is set), crop the history so future matches don't leak into the view
        const displayMatchResults = (limitMatch && limitMatch > 0)
            ? allPlayerMatchResultsWithLobby.slice(0, limitMatch)
            : allPlayerMatchResultsWithLobby;

        // 3. Determine the displaying Lobby. If we are viewing history, use the Lobby they were in at that specific match.
        // Otherwise use their current DB lobby assignment.
        let finalLobbyId = participantLobby?.id;
        let finalLobbyName = participantLobby?.name || "N/A";
        
        if (limitMatch && limitMatch > 0) {
            const historicalLobbyId = displayMatchResults.length > 0
                ? displayMatchResults[displayMatchResults.length - 1].lobbyId
                : null;
            if (historicalLobbyId) {
                const hLobby = roundData.lobbies?.find(l => l.id === historicalLobbyId);
                if (hLobby) {
                    finalLobbyId = hLobby.id;
                    finalLobbyName = hLobby.name;
                }
            }
        }

        // 3a. For elimination: use placement of the specific match being viewed (not cumulative)
        //     limitMatch=1 → match 0 result only; no limitMatch → last match result
        let effectiveMatchIndex: number | null = null;
        if (isElimination) {
          effectiveMatchIndex = limitMatch && limitMatch > 0 ? limitMatch - 1 : displayMatchResults.length - 1;
        }

        // Score to display:
        // - elimination: placement-based (not cumulative); use points of the specific match only
        // - other: cumulative round score
        const specificMatchResult = (isElimination && effectiveMatchIndex !== null)
          ? displayMatchResults[effectiveMatchIndex] ?? null
          : null;

        const calculatedRoundScore = specificMatchResult
          ? (specificMatchResult.result.points || 0)                               // elimination: single match score
          : displayMatchResults.reduce((sum, item) => sum + (item.result.points || 0), 0); // others: cumulative
        const placements = displayMatchResults.map(item => item.result.placement);
        const points = displayMatchResults.map(item => item.result.points || 0);
        const lastPlacement = placements.length > 0 ? placements[placements.length - 1] : Infinity;

        const roundOutcome = participant.roundOutcomes?.find(
            (outcome) => outcome.roundId === roundData.id
        );

        // Only override with DB roundOutcome score if we are NOT looking at a limited historical view
        const isHistoricalView = limitMatch && limitMatch > 0 && limitMatch < (currentPhase?.matchesPerRound || 1);
        const totalScoreToShow = (!isHistoricalView && roundOutcome?.scoreInRound != null) 
            ? roundOutcome.scoreInRound 
            : calculatedRoundScore;

        // For elimination, expose the single-match placement directly for easier sorting/status derivation
        const effectivePlacement = specificMatchResult?.result.placement ?? lastPlacement;

        return {
            id: participant.id,
            userId: participant.userId,
            lobbyId: finalLobbyId,
            lobbyName: finalLobbyName,
            name: participant.user?.riotGameName || participant.user?.username || "N/A",
            region: participant.user?.region || "N/A",
            placements: placements,
            points: points,
            lastPlacement: effectivePlacement,  // for elimination: placement of the viewed match
            total: isHistoricalView ? calculatedRoundScore : ((!isElimination && roundOutcome?.scoreInRound != null) ? roundOutcome.scoreInRound : calculatedRoundScore),
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

  // Calculate the maximum number of matches completed across all lobbies
  const maxCompletedLobbyMatches = roundData.lobbies?.reduce((max, lobby) => {
    return Math.max(max, lobby.completedMatchesCount || 0)
  }, 0) || 0;

  // The number of columns to show: if limitMatch is requested (virtual tabs), exactly limitMatch
  // Otherwise, show up to current playing match (completed + 1), but don't exceed configured
  let maxMatchesPerLobby = 1;
  
  if (limitMatch && limitMatch > 0 && limitMatch <= configuredMatchesPerRound) {
    maxMatchesPerLobby = limitMatch;
  } else {
    maxMatchesPerLobby = Math.min(configuredMatchesPerRound, maxCompletedLobbyMatches + 1);
  }

  return (
    <div className="container py-8 space-y-6">
      <RoundHeader tournament={currentTournament} round={roundData} limitMatch={limitMatch} />
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
