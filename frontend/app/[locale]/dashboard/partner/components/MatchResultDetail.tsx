"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, Loader2, RefreshCw, Edit, Trophy, ChevronDown } from "lucide-react"
import { MiniTourMatch, MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ManualResultDialog } from "@/app/[locale]/minitour/lobbies/[id]/components/ManualResultDialog"

interface MatchResultDetailProps {
    match: MiniTourMatch
    lobby: MiniTourLobby
    onSync: (matchId: string) => Promise<void>
    onManualSubmit: (lobbyId: string, placements: { userId: string; placement: number }[]) => Promise<void>
    isSyncing: boolean
}

export function MatchResultDetail({ match, lobby, onSync, onManualSubmit, isSyncing }: MatchResultDetailProps) {
    const [manualEntryOpen, setManualEntryOpen] = useState(false)
    const isSynced = !!match.fetchedAt && match.miniTourMatchResults.length > 0

    console.log('[MatchResultDetail] Rendering match:', {
        matchId: match.id.substring(0, 8),
        status: match.status,
        fetchedAt: match.fetchedAt,
        resultCount: match.miniTourMatchResults?.length,
        isSynced
    });

    const handleManualEntry = () => {
        setManualEntryOpen(true)
    }

    const handleManualResultSubmit = async (placements: { userId: string; placement: number }[]) => {
        await onManualSubmit(lobby.id, placements)
    }

    // Sort results by placement
    const sortedResults = [...(match.miniTourMatchResults || [])].sort((a, b) => a.placement - b.placement)

    return (
        <>
            <Collapsible className="border border-slate-600 rounded-lg bg-slate-800">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="text-left flex-1">
                        <div className="flex items-center gap-3">
                            <p className="font-semibold text-white">Match {match.id.substring(0, 8)}</p>
                            <Badge
                                variant="outline"
                                className={`text-[10px] ${isSynced
                                    ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                                    : 'border-amber-500 text-amber-500 bg-amber-500/10'
                                    }`}
                            >
                                {isSynced ? 'Completed' : 'Pending'}
                            </Badge>
                        </div>
                        {match.matchIdRiotApi && (
                            <p className="text-xs text-slate-400 mt-1 font-mono">Riot ID: {match.matchIdRiotApi}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                            {new Date(match.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="p-4 pt-0 border-t border-slate-700">
                    {isSynced ? (
                        <div className="space-y-3">
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                                    <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                                    Match Results
                                </h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700">
                                            <TableHead className="text-slate-400">Rank</TableHead>
                                            <TableHead className="text-slate-400">Player</TableHead>
                                            <TableHead className="text-right text-slate-400">Points</TableHead>
                                            {(match.status === 'COMPLETED' || match.status === 'SETTLED' || match.miniTourMatchResults?.some(r => ((r as any).prize || 0) > 0)) && (
                                                <TableHead className="text-right text-slate-400">Prize</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedResults.map((result) => {
                                            // Get prize from persisted data (best for settled matches)
                                            // Fallback to calculation ONLY if not settled (e.g. preview) - but usually 0 if not settled
                                            let reward = (result as any).prize || (match.matchData as any)?.prizeSummary?.[result.userId] || 0;

                                            const showPrizeCol = (match.status === 'COMPLETED' || match.status === 'SETTLED' || match.miniTourMatchResults?.some(r => ((r as any).prize || 0) > 0));

                                            return (
                                                <TableRow key={result.id} className="border-slate-700">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {result.placement === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                            <span className={`font-bold ${result.placement === 1 ? 'text-yellow-500' : 'text-white'}`}>
                                                                #{result.placement}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-200">
                                                        {result.user?.username || 'Unknown Player'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={result.placement === 1 ? 'default' : 'secondary'}>
                                                            {result.points} pts
                                                        </Badge>
                                                    </TableCell>
                                                    {showPrizeCol && (
                                                        <TableCell className="text-right font-bold text-emerald-400">
                                                            {reward > 0 ? (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <span>+{reward}</span>
                                                                    <Coins className="h-3 w-3 text-emerald-500" />
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-500">-</span>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-900/30 border border-dashed border-slate-600 rounded-lg p-6">
                                <div className="text-center mb-4">
                                    <h4 className="font-semibold text-lg text-white mb-2">No Results Yet</h4>
                                    <p className="text-sm text-slate-400">
                                        Choose how you want to record the match results:
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Card className="border-2 border-slate-600 hover:border-primary/50 transition-colors bg-slate-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-primary/10 p-2 rounded-lg">
                                                    <RefreshCw className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold mb-1 text-white">Auto Fetch</h5>
                                                    <p className="text-xs text-slate-400 mb-3">
                                                        Automatically fetch results from Riot API
                                                    </p>
                                                    <Button
                                                        className="w-full"
                                                        variant="outline"
                                                        onClick={() => onSync(match.id)}
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

                                    <Card className="border-2 border-slate-600 hover:border-secondary/50 transition-colors bg-slate-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-secondary/50 p-2 rounded-lg">
                                                    <Edit className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold mb-1 text-white">Manual Entry</h5>
                                                    <p className="text-xs text-slate-400 mb-3">
                                                        Manually enter placements for each player
                                                    </p>
                                                    <Button
                                                        className="w-full"
                                                        variant="secondary"
                                                        onClick={handleManualEntry}
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
                                    <p className="text-xs text-slate-500">
                                        💡 Tip: Use Auto Fetch for official matches, Manual Entry for custom lobbies or as backup
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>

            <ManualResultDialog
                open={manualEntryOpen}
                onOpenChange={setManualEntryOpen}
                lobby={lobby}
                onSubmit={handleManualResultSubmit}
            />
        </>
    )
}
