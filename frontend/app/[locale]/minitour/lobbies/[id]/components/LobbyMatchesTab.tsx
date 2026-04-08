/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, Loader2, RefreshCw, Edit, Zap, StopCircle } from "lucide-react"
import { MiniTourLobby, MiniTourMatch, MiniTourMatchResult, MiniTourLobbyParticipant } from "@/app/stores/miniTourLobbyStore"
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { ManualResultDialog } from "./ManualResultDialog"

// --- Trait style background classes ---

const getTraitStyleBgClass = (style: number) => {
  switch (style) {
    case 1: return 'bg-[#A77044]'; // Bronze
    case 2: return 'bg-[#C4C4C4]'; // Silver
    case 3: return 'bg-[#FFB956]'; // Gold
    case 4: return 'bg-gradient-to-r from-purple-500 to-red-500'; // Prismatic
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

// --- Player Detail Row with enriched data from Grimoire ---

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
      {/* Main row - always visible */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
        onClick={onToggle}
      >
        {/* Placement badge */}
        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold ${getPlacementBg(placement)}`}>
          {placement}
        </div>

        {/* Player name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{displayName}</span>
          {participant.lastRound && (
            <span className="text-xs text-muted-foreground">
              Round {participant.lastRound} · {Math.floor((participant.timeEliminated || 0) / 60)}:{String(Math.floor((participant.timeEliminated || 0) % 60)).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Active traits (compact) */}
        {hasEnrichedData && participant.traits && (
          <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
            {participant.traits.slice(0, 5).map((trait: any) => (
              <div key={trait.name} className={`w-5 h-5 rounded-sm flex items-center justify-center ${getTraitStyleBgClass(trait.style)}`}>
                {trait.iconUrl ? (
                  <img src={trait.iconUrl} alt={trait.displayName || trait.name} className="w-4 h-4" />
                ) : (
                  <span className="text-[8px] font-bold text-white">{trait.tierCurrent}</span>
                )}
              </div>
            ))}
            {participant.traits.length > 5 && (
              <span className="text-xs text-muted-foreground ml-1">+{participant.traits.length - 5}</span>
            )}
          </div>
        )}

        {/* Champions preview (compact) */}
        {hasEnrichedData && participant.units && (
          <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
            {participant.units.slice(0, 6).map((unit: any, i: number) => (
              <div key={`${unit.characterId}-${i}`} className={`relative w-7 h-7 rounded border ${getCostBorderClass(unit.cost)} overflow-hidden`}>
                {unit.iconUrl ? (
                  <img src={unit.iconUrl} alt={unit.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[8px]">{unit.name?.charAt(0)}</div>
                )}
                {unit.tier >= 2 && (
                  <div className="absolute bottom-0 left-0 right-0 text-center text-[7px] leading-none bg-black/60 text-yellow-400">
                    {getTierStars(unit.tier)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
          {participant.goldLeft !== undefined && (
            <span className="text-yellow-500" title="Gold left">🪙 {participant.goldLeft}</span>
          )}
          {participant.playersEliminated > 0 && (
            <span title="Players eliminated">⚔️ {participant.playersEliminated}</span>
          )}
          {participant.totalDamage > 0 && (
            <span title="Total damage">🗡️ {participant.totalDamage}</span>
          )}
        </div>

        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded detail - traits + full board */}
      {isExpanded && hasEnrichedData && (
        <div className="ml-10 mr-3 mb-2 p-3 bg-muted/20 rounded-lg border border-muted/30 space-y-3">
          {/* Active Traits */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {participant.traits?.map((trait: any) => (
              <div key={trait.name} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${getTraitBorderClass(trait.style)} bg-black/30`}>
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${getTraitStyleBgClass(trait.style)}`}>
                  {trait.iconUrl ? (
                    <img src={trait.iconUrl} alt="" className="w-3 h-3" />
                  ) : null}
                </div>
                <span className="text-xs font-medium">{trait.tierCurrent}</span>
                <span className="text-xs text-muted-foreground">{trait.displayName || trait.name.split('_').pop()}</span>
              </div>
            ))}
          </div>

          {/* Full board - Champions with items */}
          <div className="flex items-end gap-2 flex-wrap">
            {participant.units?.map((unit: any, i: number) => (
              <div key={`${unit.characterId}-${i}`} className="flex flex-col items-center">
                {/* Tier stars */}
                {unit.tier >= 2 && (
                  <span className={`text-[10px] mb-0.5 ${unit.tier === 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {getTierStars(unit.tier)}
                  </span>
                )}
                {/* Champion icon */}
                <div className={`relative w-12 h-12 rounded-md border-2 overflow-hidden ${getCostBorderClass(unit.cost)}`}>
                  {unit.iconUrl ? (
                    <img src={unit.iconUrl} alt={unit.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs font-medium">
                      {unit.name?.substring(0, 3)}
                    </div>
                  )}
                </div>
                {/* Items */}
                <div className="flex items-center gap-0.5 mt-1 h-[14px]">
                  {unit.items?.slice(0, 3).map((item: any, j: number) => (
                    <div key={`${item.id || item.name}-${j}`} className="w-3.5 h-3.5 rounded-sm overflow-hidden border border-gray-600" title={item.name}>
                      {item.iconUrl ? (
                        <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-600" />
                      )}
                    </div>
                  ))}
                </div>
                {/* Name */}
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[56px] text-center">
                  {unit.name}
                </span>
              </div>
            ))}
          </div>

          {/* Augments */}
          {participant.augments && participant.augments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Augments:</span>
              {participant.augments.map((aug: any, i: number) => (
                <div key={`${aug.id || aug.name}-${i}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30" title={aug.name}>
                  {aug.iconUrl ? (
                    <img src={aug.iconUrl} alt={aug.name} className="w-4 h-4 rounded-sm" />
                  ) : null}
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

// --- Match Result Table with expandable rows ---

function MatchResultTable({ match, participants }: { match: MiniTourMatch; participants: MiniTourLobbyParticipant[] }) {
  const [expandedPuuid, setExpandedPuuid] = useState<string | null>(null);
  const sortedResults = [...match.miniTourMatchResults].sort((a, b) => a.placement - b.placement);

  // Check if we have enriched data from Grimoire (matchData.participants with iconUrl)
  const matchParticipants = match.matchData?.participants || [];
  const hasEnrichedData = matchParticipants.length > 0 && matchParticipants[0]?.units?.[0]?.iconUrl;

  if (hasEnrichedData) {
    // Render enriched view (tactics.tools style)
    return (
      <div className="mt-3 space-y-1">
        {[...(matchParticipants as any[])]
          .sort((a: any, b: any) => a.placement - b.placement)
          .map((participant: any) => {
            const lobbyParticipant = participants.find(p => p.user.puuid === participant.puuid);
            const result = sortedResults.find(r => r.userId === lobbyParticipant?.userId);
            const prize = result?.prize || match.matchData?.prizeSummary?.[result?.userId || ''] || 0;

            return (
              <div key={participant.puuid}>
                <PlayerDetailRow
                  participant={participant}
                  lobbyParticipant={lobbyParticipant}
                  isExpanded={expandedPuuid === participant.puuid}
                  onToggle={() => setExpandedPuuid(expandedPuuid === participant.puuid ? null : participant.puuid)}
                />
                {/* Prize info for this player */}
                {result && prize > 0 && expandedPuuid === participant.puuid && (
                  <div className="ml-10 px-3 pb-2 flex items-center gap-1 text-sm text-green-500">
                    <Coins className="h-4 w-4" />
                    <span>+{prize} coins</span>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  }

  // Fallback: Simple table view (non-enriched data)
  return (
    <div className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Prize</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResults.map((result) => {
            const lobbyParticipant = participants.find((p: MiniTourLobbyParticipant) => p.userId === result.userId);
            const puuid = lobbyParticipant?.user.puuid;
            const matchParticipant = match.matchData?.participants?.find((p: any) => p.puuid === puuid);
            const displayName = matchParticipant?.gameName && matchParticipant?.tagLine
              ? `${matchParticipant.gameName} #${matchParticipant.tagLine}`
              : result.user.username;
            const prize = result.prize || match.matchData?.prizeSummary?.[result.userId] || 0;

            return (
              <TableRow key={result.id}>
                <TableCell className="font-bold">{result.placement}</TableCell>
                <TableCell>{displayName}</TableCell>
                <TableCell className="text-right">{result.points}</TableCell>
                <TableCell className="text-right text-green-500 font-medium">
                  {prize > 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      <span>+{prize}</span>
                      <Coins className="h-4 w-4" />
                    </div>
                  ) : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
}

interface LobbyMatchesTabProps {
  lobby: MiniTourLobby
}

export function LobbyMatchesTab({ lobby }: LobbyMatchesTabProps) {
  const {
    syncMatch, syncingMatchId, submitManualResult,
    fetchMatchFromGrimoire, startPolling, stopPolling,
    isPolling, pollingMessage, isProcessingAction
  } = useMiniTourLobbyStore()
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MiniTourMatch | null>(null)

  // Auto-start polling when lobby is IN_PROGRESS and has a pending match
  useEffect(() => {
    if (lobby.status === 'IN_PROGRESS') {
      const hasPendingMatch = lobby.matches?.some(m => m.status === 'PENDING');
      if (hasPendingMatch && !isPolling) {
        startPolling(lobby.id);
      }
    }

    return () => {
      stopPolling();
    };
  }, [lobby.status, lobby.id, lobby.matches, isPolling, startPolling, stopPolling]);

  const handleManualEntry = (match: MiniTourMatch) => {
    setSelectedMatch(match)
    setManualEntryOpen(true)
  }

  const handleManualResultSubmit = async (placements: { userId: string; placement: number }[]) => {
    if (!selectedMatch) return
    await submitManualResult(lobby.id, placements)
  }

  if (!lobby.matches || lobby.matches.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No matches have been created yet.
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Matches</CardTitle>
            {/* Polling status indicator */}
            {isPolling && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  <span className="text-xs text-blue-400">{pollingMessage || 'Đang tìm trận...'}</span>
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
              const isSyncing = syncingMatchId === match.id;

              return (
                <Collapsible key={match.id} className="border rounded-lg" defaultOpen={isSynced}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                    <div className="text-left">
                      <p className="font-semibold">Match {match.id.substring(0, 8)}</p>
                      <div className="text-sm text-muted-foreground">
                        Status: <Badge variant={isSynced ? 'default' : 'secondary'}>{isSynced ? 'Completed' : 'Pending'}</Badge>
                      </div>
                      {match.matchIdRiotApi && (
                        <p className="text-xs text-muted-foreground mt-1">Riot ID: {match.matchIdRiotApi}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 pt-0">
                    {isSynced ? (
                      <MatchResultTable match={match} participants={lobby.participants} />
                    ) : (
                      <div className="space-y-4">
                        {/* Polling status for this match */}
                        {isPolling && match.status === 'PENDING' && (
                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-blue-400">Đang chờ kết quả trận đấu...</p>
                            <p className="text-xs text-muted-foreground mt-1">{pollingMessage}</p>
                          </div>
                        )}

                        <div className="bg-muted/30 border border-dashed rounded-lg p-6">
                          <div className="text-center mb-4">
                            <h4 className="font-semibold text-lg mb-2">No Results Yet</h4>
                            <p className="text-sm text-muted-foreground">
                              Choose how you want to record the match results:
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Grimoire Auto Fetch (primary) */}
                            <Card className="border-2 hover:border-primary/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="bg-blue-500/10 p-2 rounded-lg">
                                    <Zap className="h-5 w-5 text-blue-500" />
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-1">Grimoire Fetch</h5>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Tìm trận mới nhất với icons đầy đủ
                                    </p>
                                    <Button
                                      className="w-full"
                                      variant="default"
                                      onClick={() => fetchMatchFromGrimoire(lobby.id)}
                                      disabled={isProcessingAction || isPolling}
                                    >
                                      {isProcessingAction ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Đang tìm...
                                        </>
                                      ) : (
                                        <>
                                          <Zap className="mr-2 h-4 w-4" />
                                          Fetch Now
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Legacy Auto Fetch */}
                            <Card className="border-2 hover:border-primary/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="bg-primary/10 p-2 rounded-lg">
                                    <RefreshCw className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-1">Legacy Fetch</h5>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Fetch trực tiếp từ Riot API
                                    </p>
                                    <Button
                                      className="w-full"
                                      variant="outline"
                                      onClick={() => syncMatch(match.id)}
                                      disabled={isSyncing}
                                    >
                                      {isSyncing ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Fetching...
                                        </>
                                      ) : (
                                        <>
                                          <RefreshCw className="mr-2 h-4 w-4" />
                                          Fetch from API
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Manual Entry */}
                            <Card className="border-2 hover:border-primary/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="bg-secondary/50 p-2 rounded-lg">
                                    <Edit className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-1">Manual Entry</h5>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Nhập kết quả thủ công
                                    </p>
                                    <Button
                                      className="w-full"
                                      variant="secondary"
                                      onClick={() => handleManualEntry(match)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Enter Results
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="mt-4 text-center">
                            <p className="text-xs text-muted-foreground">
                              💡 Grimoire Fetch sẽ hiển thị icons tướng, trang bị, traits. Auto-polling sẽ tự động tìm khi lobby đang chơi.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedMatch && (
        <ManualResultDialog
          open={manualEntryOpen}
          onOpenChange={setManualEntryOpen}
          lobby={lobby}
          onSubmit={handleManualResultSubmit}
        />
      )}
    </>
  )
}