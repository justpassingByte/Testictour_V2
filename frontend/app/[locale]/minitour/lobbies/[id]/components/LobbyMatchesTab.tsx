"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, Loader2, RefreshCw, Edit } from "lucide-react"
import { MiniTourLobby, MiniTourMatch, MiniTourMatchResult, MiniTourLobbyParticipant } from "@/app/stores/miniTourLobbyStore"
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { ManualResultDialog } from "./ManualResultDialog"

// --- Helper functions to get image URLs from Riot/Community Dragon ---

/*
const getUnitIconUrl = (characterId: string) => {
  if (!characterId) return "";
  const name = characterId.split('_')[1]?.toLowerCase();
  if (!name) return "";
  // Using a community-driven CDN like lolchess.gg is often simpler for static assets
  return `https://cdn.lolchess.gg/images/tft/11/champions/${name}.png`;
};

const getItemIconUrl = (itemName: string) => {
  if (!itemName) return "";
  // Transforms 'TFT_Item_ArchangelsStaff' or 'TFT14_Item_MobEmblem' to 'archangels-staff' or 'mob-emblem'
  const cleanName = itemName
    .replace(/^TFT\d*_Item_/, '') // Remove TFT_Item_ or TFTX_Item_
    .replace(/([A-Z])/g, (match, p1, offset) => (offset > 0 ? '-' : '') + p1.toLowerCase());
  return `https://cdn.lolchess.gg/images/tft/11/items/${cleanName}.png`;
};

const getTraitIconUrl = (traitName: string) => {
  if (!traitName) return "";
  const name = traitName.split('_')[1]?.toLowerCase();
  if (!name) return "";
  return `https://cdn.lolchess.gg/images/tft/11/traits/${name.toLowerCase()}.png`;
};
*/

const getTraitStyleBgClass = (style: number) => {
  switch (style) {
    case 1: return 'bg-[#A77044]'; // Bronze
    case 2: return 'bg-[#C4C4C4]'; // Silver
    case 3: return 'bg-[#FFB956]'; // Gold
    case 4: return 'bg-gradient-to-r from-purple-500 to-red-500'; // Prismatic
    default: return 'bg-gray-700';
  }
}

// --- New component to display a player's board ---

function PlayerCompositionDetail({ participant }: { participant: any }) {
  if (!participant || !participant.traits || !participant.units) {
    return <div className="p-2 text-xs text-muted-foreground">No detailed composition data available.</div>;
  }

  const activeTraits = participant.traits.filter((t: any) => t.style > 0);
  activeTraits.sort((a: any, b: any) => b.style - a.style || b.tier_current - a.tier_current);

  const units = participant.units.sort((a: any, b: any) => b.tier - a.tier);

  // Removed debugging logs

  return (
    <div className="bg-muted/30 p-2 rounded-md w-full">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {activeTraits.map((trait: any) => (
          <div key={trait.name} className={`flex items-center gap-1.5 p-1 rounded-sm text-white`}>
            <div className={`w-5 h-5 flex items-center justify-center rounded-sm ${getTraitStyleBgClass(trait.style)}`}>
              {/* <img src={getTraitIconUrl(trait.name)} alt={trait.name} className="w-4 h-4" /> */}
            </div>
            <span className="text-xs font-semibold text-foreground">{trait.tier_current}</span>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-1 flex-wrap">
        {units.map((unit: any) => (
          <div key={unit.character_id} className="flex flex-col items-center w-14">
            <div className={`relative border-2 rounded-md ${unit.tier === 3 ? 'border-yellow-500' : unit.tier === 2 ? 'border-slate-400' : 'border-transparent'}`}>
              {/* <img src={getUnitIconUrl(unit.character_id)} alt={unit.character_id} className="w-12 h-12 rounded" /> */}
              <div className="absolute -bottom-1 -right-1 bg-background text-foreground text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center border">
                {unit.tier}
              </div>
            </div>
            <div className="flex items-center gap-0.5 mt-1 h-[16px]">
              {unit.itemNames.slice(0, 3).map((item: string, index: number) => {
                if (item === 'TFT_Item_EmptyBag') return null;
                return (
                  // <img key={`${item}-${index}`} src={getItemIconUrl(item)} alt={item} className="w-4 h-4 rounded-sm" />
                  <div key={`${item}-${index}`} className="w-4 h-4 rounded-sm bg-gray-500" title={item}></div>
                )
              })}
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 truncate w-full text-center">{unit.character_id.split('_')[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LobbyMatchesTabProps {
  lobby: MiniTourLobby
}

function MatchResultTable({ match, participants }: { match: MiniTourMatch; participants: MiniTourLobbyParticipant[] }) {
  const sortedResults = [...match.miniTourMatchResults].sort((a, b) => a.placement - b.placement);

  console.log('[MatchResultTable] Rendering match:', match.id, 'Results:', sortedResults);

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

            // Try to get prize from the result object first (new schema), fallback to matchData (legacy/robustness)
            const prize = result.prize || match.matchData?.prizeSummary?.[result.userId] || 0;

            return (
              <React.Fragment key={result.id}>
                <TableRow>
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
                {matchParticipant && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-1">
                      <PlayerCompositionDetail participant={matchParticipant} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function LobbyMatchesTab({ lobby }: LobbyMatchesTabProps) {
  const { syncMatch, syncingMatchId, submitManualResult } = useMiniTourLobbyStore()
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MiniTourMatch | null>(null)

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
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lobby.matches.map((match: MiniTourMatch) => {
              const isSynced = !!match.fetchedAt && match.miniTourMatchResults.length > 0;
              const isSyncing = syncingMatchId === match.id;

              return (
                <Collapsible key={match.id} className="border rounded-lg">
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
                        <div className="bg-muted/30 border border-dashed rounded-lg p-6">
                          <div className="text-center mb-4">
                            <h4 className="font-semibold text-lg mb-2">No Results Yet</h4>
                            <p className="text-sm text-muted-foreground">
                              Choose how you want to record the match results:
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Card className="border-2 hover:border-primary/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="bg-primary/10 p-2 rounded-lg">
                                    <RefreshCw className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-1">Auto Fetch</h5>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Automatically fetch results from Riot API
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

                            <Card className="border-2 hover:border-primary/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="bg-secondary/50 p-2 rounded-lg">
                                    <Edit className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-1">Manual Entry</h5>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Manually enter placements for each player
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
                              💡 Tip: Use Auto Fetch for official matches, Manual Entry for custom lobbies or as backup
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