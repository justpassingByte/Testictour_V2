/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, Loader2, Zap, StopCircle, Trophy } from "lucide-react"
import { MiniTourLobby, MiniTourMatch, MiniTourLobbyParticipant } from "@/app/stores/miniTourLobbyStore"
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

import { MatchCompPanel } from "@/components/match/MatchCompPanel";
import { GrimoireMatchData } from "@/app/types/riot";

// ── Match Result Table ────────────────────────────────────────────────────────

const getPlacementBg = (placement: number) => {
  if (placement === 1) return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
  if (placement === 2) return "bg-gray-400/10 text-gray-400 border border-gray-400/20";
  if (placement === 3) return "bg-amber-700/10 text-amber-700 border border-amber-700/20";
  if (placement <= 4) return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  return "bg-zinc-800/40 text-zinc-400";
};
function MatchResultTable({ match, participants }: { match: MiniTourMatch; participants: MiniTourLobbyParticipant[] }) {
  const sortedResults = [...match.miniTourMatchResults].sort((a, b) => a.placement - b.placement);
  const matchParticipants = (match.matchData?.participants as any[]) || [];
  const hasEnrichedData = matchParticipants.length > 0 && matchParticipants[0]?.units?.[0]?.iconUrl;

  if (hasEnrichedData) {
    // Generate resultMap mapping PUUIDs to their MiniTour placements and prizes
    const resultMap = Object.fromEntries(
      matchParticipants.map(participant => {
        const lobbyParticipant = participants.find(p => p.user.puuid === participant.puuid);
        if (!lobbyParticipant) return [participant.puuid, null];
        
        const result = sortedResults.find(r => r.userId === lobbyParticipant.userId);
        if (!result) return [participant.puuid, null];

        // Ensure we explicitly display MiniTour prizes as points in the UI (MatchCompPanel translates 'points' to pts)
        // If we want coins specifically, MatchCompPanel renders "points" param.
        return [participant.puuid, { placement: result.placement, points: result.points, prize: result.prize || 0 }];
      }).filter(Boolean) as [string, { placement: number; points: number; prize: number }][]
    );

    return (
      <div className="mt-3 bg-zinc-950/50 rounded-xl overflow-hidden border border-zinc-800">
        <MatchCompPanel
          matchData={match.matchData as GrimoireMatchData}
          resultMap={resultMap}
        />
      </div>
    );
  }

  // Fallback for mock/older data
  return (
    <div className="mt-3 space-y-1.5">
      {sortedResults.map((result) => {
        const lp = participants.find(p => p.userId === result.userId);
        const prize = result.prize || 0;
        return (
          <div key={result.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${getPlacementBg(result.placement)}`}>
            <span className="font-bold w-6 text-center">{result.placement}</span>
            <span className="flex-1 text-sm font-medium">{(result as any).user?.username ?? lp?.user?.username ?? 'Unknown'}</span>
            <span className="text-xs">{result.points} pts</span>
            {prize > 0 && (
              <span className="flex items-center gap-1 text-green-500 text-xs">
                <Coins className="h-3 w-3" />+{prize}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

interface LobbyMatchesTabProps {
  lobby: MiniTourLobby;
}

export function LobbyMatchesTab({ lobby }: LobbyMatchesTabProps) {
  const { syncingMatchId, fetchMatchFromGrimoire, startPolling, stopPolling, isPolling, pollingMessage, isProcessingAction } = useMiniTourLobbyStore();

  // Store actions are stable Zustand references — excluded from deps intentionally
  // to prevent the isPolling state change from re-triggering the effect and creating
  // an infinite loop (cleanup calls stopPolling → set() → re-render → effect → loop)
  const pollingStartedRef = useRef(false);

  useEffect(() => {
    if (lobby.status === 'IN_PROGRESS') {
      const hasPendingMatch = lobby.matches?.some(m => m.status === 'PENDING');
      if (hasPendingMatch && !pollingStartedRef.current) {
        pollingStartedRef.current = true;
        startPolling(lobby.id);
      }
    }
    // Only stop polling when component unmounts or lobby is no longer IN_PROGRESS
    return () => {
      if (lobby.status !== 'IN_PROGRESS') {
        pollingStartedRef.current = false;
        stopPolling();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby.status, lobby.id, lobby.matches]);

  if (!lobby.matches || lobby.matches.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No matches have been created yet.</div>;
  }

  return (
    <div className="space-y-4">
      {lobby.prizeDistribution && Object.keys(lobby.prizeDistribution).length > 0 && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Championship Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(lobby.prizeDistribution)
                .sort(([placeA], [placeB]) => parseInt(placeA) - parseInt(placeB))
                .map(([place, amount]: [string, any]) => (
                  <div key={place} className="flex items-center bg-black/20 rounded-full px-4 py-1.5 border border-white/5">
                    <span className={`font-bold mr-2 ${parseInt(place) === 1 ? 'text-yellow-500' : parseInt(place) === 2 ? 'text-gray-400' : 'text-amber-700'}`}>
                      {place === '1' ? '1st' : place === '2' ? '2nd' : `${place}rd`}
                    </span>
                    <span className="font-bold flex items-center">
                      <Coins className="inline h-4 w-4 mr-1 text-yellow-500" />
                      {amount}
                    </span>
                  </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Prize is awarded at the end of all matches based on cumulative points.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Matches</CardTitle>
          {isPolling && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span className="text-xs text-blue-400">{pollingMessage || 'Searching for match...'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={stopPolling}>
                <StopCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lobby.matches.map((match: MiniTourMatch) => {
            const isSynced = !!match.fetchedAt && match.miniTourMatchResults.length > 0;
            const isSyncing = syncingMatchId === match.id || isProcessingAction;
            return (
              <Collapsible key={match.id} className="border rounded-lg" defaultOpen={isSynced}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                  <div className="text-left">
                    <p className="font-semibold">Match {match.id.substring(0, 8)}</p>
                    <div className="text-sm text-muted-foreground">
                      Status: <Badge variant={isSynced ? 'default' : 'secondary'}>{isSynced ? 'Completed' : 'Pending'}</Badge>
                    </div>
                    {match.matchIdRiotApi && <p className="text-xs text-muted-foreground mt-1">Riot ID: {match.matchIdRiotApi}</p>}
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:-rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  {isSynced ? (
                    <MatchResultTable match={match} participants={lobby.participants} />
                  ) : (
                    <div className="space-y-3">
                      {isPolling && match.status === 'PENDING' && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-blue-400">Waiting for match to complete...</p>
                          <p className="text-xs text-muted-foreground mt-1">{pollingMessage}</p>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-3 py-6 bg-muted/20 rounded-lg border border-dashed">
                        <Zap className="h-8 w-8 text-blue-400 opacity-60" />
                        <div className="text-center">
                          <p className="text-sm font-medium">No results yet</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Fetched automatically when the game ends — or sync manually:
                          </p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-2"
                          onClick={() => fetchMatchFromGrimoire(lobby.id)}
                          disabled={isSyncing || isPolling}
                        >
                          {isSyncing
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</>
                            : <><Zap className="h-4 w-4" /> Sync via Riot API</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}