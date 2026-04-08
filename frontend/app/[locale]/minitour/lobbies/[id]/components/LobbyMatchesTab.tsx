/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, Loader2, Zap, StopCircle } from "lucide-react"
import { MiniTourLobby, MiniTourMatch, MiniTourLobbyParticipant } from "@/app/stores/miniTourLobbyStore"
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────────────────────

const getTraitStyleBgClass = (style: number) => {
  switch (style) {
    case 1: return 'bg-[#A77044]';
    case 2: return 'bg-[#C4C4C4]';
    case 3: return 'bg-[#FFB956]';
    case 4: return 'bg-gradient-to-r from-purple-500 to-red-500';
    default: return 'bg-gray-700';
  }
}

const getTraitBorderClass = (style: number) => {
  switch (style) {
    case 1: return 'border-[#A77044]';
    case 2: return 'border-[#C4C4C4]';
    case 3: return 'border-[#FFB956]';
    case 4: return 'border-purple-500';
    default: return 'border-gray-600';
  }
}

const getCostBorderClass = (cost: number) => {
  switch (cost) {
    case 1: return 'border-gray-400';
    case 2: return 'border-green-500';
    case 3: return 'border-blue-500';
    case 4: return 'border-purple-500';
    case 5: return 'border-yellow-500';
    default: return 'border-gray-500';
  }
}

const getTierStars = (tier: number) => {
  if (tier === 3) return '★★★';
  if (tier === 2) return '★★';
  return '';
}

const getPlacementBg = (placement: number) => {
  switch (placement) {
    case 1: return 'bg-yellow-500/20 text-yellow-400';
    case 2: return 'bg-gray-300/20 text-gray-300';
    case 3: return 'bg-orange-600/20 text-orange-400';
    case 4: return 'bg-green-600/20 text-green-400';
    default: return 'bg-muted/50 text-muted-foreground';
  }
}

// ── Player Detail Row ─────────────────────────────────────────────────────────

function PlayerDetailRow({ participant, lobbyParticipant, isExpanded, onToggle }: {
  participant: any;
  lobbyParticipant?: MiniTourLobbyParticipant;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!participant) return null;

  const displayName = participant.gameName
    ? `${participant.gameName}#${participant.tagLine}`
    : lobbyParticipant?.user?.username || 'Unknown';

  const placement = participant.placement;
  const hasEnrichedData = participant.units && participant.units.length > 0 && participant.units[0].iconUrl;

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
        onClick={onToggle}
      >
        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold ${getPlacementBg(placement)}`}>
          {placement}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{displayName}</span>
          {participant.lastRound && (
            <span className="text-xs text-muted-foreground">
              Round {participant.lastRound} · {Math.floor((participant.timeEliminated || 0) / 60)}:{String(Math.floor((participant.timeEliminated || 0) % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
        {/* Active traits compact */}
        {hasEnrichedData && participant.traits && (
          <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
            {participant.traits.filter((t: any) => t.style > 0).slice(0, 5).map((trait: any) => (
              <div key={trait.name} className={`w-5 h-5 rounded-sm flex items-center justify-center ${getTraitStyleBgClass(trait.style)}`}>
                {trait.iconUrl
                  ? <img src={trait.iconUrl} alt={trait.displayName || trait.name} className="w-4 h-4" />
                  : <span className="text-[8px] font-bold text-white">{trait.tierCurrent}</span>}
              </div>
            ))}
          </div>
        )}
        {/* Champions preview */}
        {hasEnrichedData && participant.units && (
          <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
            {participant.units.slice(0, 6).map((unit: any, i: number) => (
              <div key={`${unit.characterId}-${i}`} className={`relative w-7 h-7 rounded border ${getCostBorderClass(unit.cost)} overflow-hidden`}>
                {unit.iconUrl
                  ? <img src={unit.iconUrl} alt={unit.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[8px]">{unit.name?.charAt(0)}</div>}
                {unit.tier >= 2 && (
                  <div className="absolute bottom-0 left-0 right-0 text-center text-[7px] leading-none bg-black/60 text-yellow-400">
                    {getTierStars(unit.tier)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          {participant.goldLeft !== undefined && <span className="text-yellow-500">🪙{participant.goldLeft}</span>}
          {participant.playersEliminated > 0 && <span>⚔️{participant.playersEliminated}</span>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {isExpanded && hasEnrichedData && (
        <div className="ml-10 mr-3 mb-2 p-3 bg-muted/20 rounded-lg border border-muted/30 space-y-3">
          {/* Traits */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {participant.traits?.filter((t: any) => t.style > 0).map((trait: any) => (
              <div key={trait.name} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${getTraitBorderClass(trait.style)} bg-black/30`}>
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${getTraitStyleBgClass(trait.style)}`}>
                  {trait.iconUrl && <img src={trait.iconUrl} alt="" className="w-3 h-3" />}
                </div>
                <span className="text-xs font-medium">{trait.tierCurrent}</span>
                <span className="text-xs text-muted-foreground">{trait.displayName || trait.name.split('_').pop()}</span>
              </div>
            ))}
          </div>
          {/* Board */}
          <div className="flex items-end gap-2 flex-wrap">
            {participant.units?.map((unit: any, i: number) => (
              <div key={`${unit.characterId}-${i}`} className="flex flex-col items-center">
                {unit.tier >= 2 && (
                  <span className={`text-[10px] mb-0.5 ${unit.tier === 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {getTierStars(unit.tier)}
                  </span>
                )}
                <div className={`relative w-12 h-12 rounded-md border-2 overflow-hidden ${getCostBorderClass(unit.cost)}`}>
                  {unit.iconUrl
                    ? <img src={unit.iconUrl} alt={unit.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs">{unit.name?.substring(0, 3)}</div>}
                </div>
                <div className="flex items-center gap-0.5 mt-1 h-[14px]">
                  {unit.items?.slice(0, 3).map((item: any, j: number) => (
                    <div key={j} className="w-3.5 h-3.5 rounded-sm overflow-hidden border border-gray-600" title={item.name}>
                      {item.iconUrl
                        ? <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-600" />}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[56px] text-center">{unit.name}</span>
              </div>
            ))}
          </div>
          {/* Augments */}
          {participant.augments?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Augments:</span>
              {participant.augments.map((aug: any, i: number) => (
                <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30" title={aug.name}>
                  {aug.iconUrl && <img src={aug.iconUrl} alt={aug.name} className="w-4 h-4 rounded-sm" />}
                  <span className="text-xs">{aug.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Match Result Table ────────────────────────────────────────────────────────

function MatchResultTable({ match, participants }: { match: MiniTourMatch; participants: MiniTourLobbyParticipant[] }) {
  const [expandedPuuid, setExpandedPuuid] = useState<string | null>(null);
  const sortedResults = [...match.miniTourMatchResults].sort((a, b) => a.placement - b.placement);
  const matchParticipants: any[] = (match.matchData?.participants as any[]) || [];
  const hasEnrichedData = matchParticipants.length > 0 && matchParticipants[0]?.units?.[0]?.iconUrl;

  if (hasEnrichedData) {
    return (
      <div className="mt-3 space-y-1">
        {[...matchParticipants]
          .sort((a, b) => a.placement - b.placement)
          .map((participant) => {
            const lobbyParticipant = participants.find(p => p.user.puuid === participant.puuid);
            const result = sortedResults.find(r => r.userId === lobbyParticipant?.userId);
            const prize = result?.prize || (match.matchData as any)?.prizeSummary?.[result?.userId || ''] || 0;
            return (
              <div key={participant.puuid}>
                <PlayerDetailRow
                  participant={participant}
                  lobbyParticipant={lobbyParticipant}
                  isExpanded={expandedPuuid === participant.puuid}
                  onToggle={() => setExpandedPuuid(prev => prev === participant.puuid ? null : participant.puuid)}
                />
                {result && prize > 0 && expandedPuuid === participant.puuid && (
                  <div className="ml-10 px-3 pb-2 flex items-center gap-1 text-sm text-green-500">
                    <Coins className="h-4 w-4" /><span>+{prize} coins</span>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  }

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

  useEffect(() => {
    if (lobby.status === 'IN_PROGRESS') {
      const hasPendingMatch = lobby.matches?.some(m => m.status === 'PENDING');
      if (hasPendingMatch && !isPolling) startPolling(lobby.id);
    }
    return () => { stopPolling(); };
  }, [lobby.status, lobby.id, lobby.matches, isPolling, startPolling, stopPolling]);

  if (!lobby.matches || lobby.matches.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No matches have been created yet.</div>;
  }

  return (
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
  );
}