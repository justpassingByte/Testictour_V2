"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import {
  Trophy, Medal, Star, Loader2, Save, XCircle, ChevronDown, ChevronUp,
  ExternalLink, Swords, Clock, Calendar, Hash, User, Edit3, CheckCircle2,
} from "lucide-react"
import api from "@/app/lib/apiConfig"
import { format } from "date-fns"
import { MatchCompPanel, isGrimoireMatchData } from "./MatchCompPanel"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface MatchDetailModalProps {
  matchId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Callback after successful edit to refresh parent data */
  onSaved?: () => void
}

interface MatchResultEntry {
  matchId: string
  userId: string
  placement: number
  points: number
  user?: {
    id: string
    riotGameName?: string
    username?: string
    puuid?: string
  }
}

interface MatchDetail {
  match: {
    id: string
    lobbyId: string
    matchIdRiotApi?: string
    status: string
    fetchedAt?: string
    createdAt?: string
    matchData?: any
  }
  lobby: {
    id: string
    name: string
    state?: string
    completedMatchesCount?: number
    fetchedResult?: boolean
  }
  round: {
    id: string
    roundNumber: number
    status: string
  }
  phase: {
    id: string
    name: string
    phaseNumber: number
    type: string
    tournamentId: string
    advancementCondition?: any
    pointsMapping?: number[]
    matchesPerRound?: number
  }
  tournament: {
    id: string
    name: string
    status: string
    region?: string
  }
  results: MatchResultEntry[]
  lobbyParticipants?: Array<{
    id: string
    riotGameName?: string
    username?: string
    puuid?: string
  }>
}

export function MatchDetailModal({ matchId, open, onOpenChange, onSaved }: MatchDetailModalProps) {
  const t = useTranslations("common")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editResults, setEditResults] = useState<MatchResultEntry[]>([])
  const [showCompPanel, setShowCompPanel] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/${matchId}/detail`)
      if (res.data?.success) {
        const payload = res.data
        setDetail(payload)
        const seededResults =
          payload.results?.length > 0
            ? payload.results
            : (payload.lobbyParticipants || []).map((user: any, index: number) => ({
                matchId: payload.match?.id || "",
                userId: user.id,
                placement: index + 1,
                points: 0,
                user,
              }))
        setEditResults(seededResults || [])
      } else {
        setError("Failed to load match details")
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load match details")
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    if (open && matchId) {
      fetchDetail()
      setEditing(false)
      setShowCompPanel(false)
    }
  }, [open, matchId, fetchDetail])

  const handleEditResult = (index: number, field: 'placement' | 'points', value: string) => {
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) return
    setEditResults(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: numValue }
      return updated
    })
  }

  const handleSave = async () => {
    if (!matchId) return
    setSaving(true)
    try {
      const payload = editResults.map(r => ({
        userId: r.userId,
        placement: r.placement,
        points: r.points,
      }))
      const res = await api.post(`/${matchId}/results`, payload)
      if (res.data?.result) {
        toast({
          title: "Success",
          description: "Match results updated successfully.",
        })
        setEditing(false)
        // Refresh detail
        await fetchDetail()
        // Notify parent to refresh
        onSaved?.()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Failed to update results.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    // Restore from original
    if (detail?.results) {
      setEditResults([...detail.results])
    }
  }

  // Placement color classes
  const placementBadge = (placement: number) => {
    if (placement === 1) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border-yellow-500/40"
    if (placement === 2) return "bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/40"
    if (placement === 3) return "bg-amber-600/20 text-amber-700 dark:text-amber-500 border-amber-600/40"
    return "bg-secondary/50 text-secondary-foreground border-secondary"
  }

  const formatGameDuration = (seconds?: number) => {
    if (!seconds) return "-"
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            {t("match_details")}
            {detail && (
              <Badge variant="outline" className="ml-2 text-xs">
                #{detail.match.id.slice(-6)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.tournament.name} • ${detail.lobby.name} • Round ${detail.round.roundNumber}`
              : "Loading match information..."
            }
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-8 text-center">
            <XCircle className="h-10 w-10 text-red-500 mb-3" />
            <p className="text-red-500 font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchDetail}>
              Retry
            </Button>
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-4">
            {/* Match Info Header */}
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> Tournament
                    </span>
                    <p className="font-medium">{detail.tournament.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {detail.tournament.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Phase / Round
                    </span>
                    <p className="font-medium">
                      {detail.phase.name} (Phase {detail.phase.phaseNumber})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Round {detail.round.roundNumber} • {detail.round.status}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <User className="h-3 w-3" /> Lobby
                    </span>
                    <p className="font-medium">{detail.lobby.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {detail.lobby.state || detail.lobby.fetchedResult ? "Completed" : "Pending"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Created
                    </span>
                    <p className="font-medium text-xs">
                      {detail.match.createdAt
                        ? format(new Date(detail.match.createdAt), "MMM d, HH:mm")
                        : "-"}
                    </p>
                    {detail.match.fetchedAt && (
                      <p className="text-xs text-muted-foreground">
                        Fetched: {format(new Date(detail.match.fetchedAt), "MMM d, HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase config info */}
            {detail.phase.pointsMapping && (
              <Card className="bg-card/60 border-white/10">
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                    <span className="font-medium">Points Mapping:</span>
                    {detail.phase.pointsMapping.map((pt, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        #{i + 1}: {pt}pt
                      </Badge>
                    ))}
                    {detail.phase.matchesPerRound && detail.phase.matchesPerRound > 1 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span>{detail.phase.matchesPerRound} matches/round</span>
                      </>
                    )}
                    <span className="text-muted-foreground">•</span>
                    <span>{detail.phase.type} format</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Table */}
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("results")}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {detail.results.length} players
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Show Comp Panel button if matchData exists (Grimoire) */}
                  {detail.match.matchData && isGrimoireMatchData(detail.match.matchData) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCompPanel(!showCompPanel)}
                      className="text-xs gap-1"
                    >
                      {showCompPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {showCompPanel ? "Hide Game Panel" : "Show Game Panel"}
                    </Button>
                  )}
                  {!editing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                      className="text-xs gap-1.5"
                      disabled={saving}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {detail.results.length === 0 ? "Enter Results Manually" : (t("edit") || "Edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="text-xs gap-1"
                        disabled={saving}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        className="text-xs gap-1"
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>{t("player")}</TableHead>
                    <TableHead className="text-center w-24">
                      {t("placement")}
                    </TableHead>
                    <TableHead className="text-center w-24">
                      {editing ? (
                        <span className="flex items-center justify-center gap-1">
                          <Edit3 className="h-3 w-3" /> {t("points")}
                        </span>
                      ) : (
                        t("points")
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editing ? editResults : detail.results).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                        No results yet. Click &quot;Enter Results Manually&quot; to add placements and points.
                      </TableCell>
                    </TableRow>
                  ) : (
                  (editing ? editResults : detail.results)
                    .sort((a, b) => a.placement - b.placement)
                    .map((result, index) => {
                      const playerName = result.user?.riotGameName || result.user?.username || `User ${result.userId.slice(-6)}`
                      const isEditing = editing

                      return (
                        <TableRow key={result.userId || index} className="hover:bg-muted/30">
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium border ${placementBadge(result.placement)}`}>
                              {result.placement}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {playerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{playerName}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  ID: {result.userId.slice(-8)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                min={1}
                                max={8}
                                value={editResults[index]?.placement || result.placement}
                                onChange={(e) => handleEditResult(index, 'placement', e.target.value)}
                                className="w-16 h-8 text-center text-sm mx-auto"
                              />
                            ) : (
                              <span className="font-semibold">{result.placement}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                value={editResults[index]?.points || result.points}
                                onChange={(e) => handleEditResult(index, 'points', e.target.value)}
                                className="w-16 h-8 text-center text-sm mx-auto"
                              />
                            ) : (
                              <span className="font-bold text-primary text-sm">{result.points} pts</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="flex items-center justify-end gap-4 px-4 py-2.5 border-t border-white/5 bg-muted/20 text-xs text-muted-foreground">
                <span>
                  Total Players: <strong>{detail.results.length}</strong>
                </span>
                <span>
                  Total Points: <strong>
                    {(editing ? editResults : detail.results).reduce((sum, r) => sum + (r.points || 0), 0)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Game Comp Panel (Grimoire enriched data) */}
            {showCompPanel && detail.match.matchData && isGrimoireMatchData(detail.match.matchData) && (
              <Collapsible open={showCompPanel}>
                <CollapsibleContent>
                  <Card className="bg-card/60 border-white/10">
                    <CardContent className="p-0">
                      <MatchCompPanel
                        matchData={detail.match.matchData}
                        resultMap={Object.fromEntries(
                          detail.results.map(r => [
                            r.user?.puuid || `placement_${r.placement}`,
                            { placement: r.placement, points: r.points }
                          ])
                        )}
                      />
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Riot Match ID */}
            {detail.match.matchIdRiotApi && (
              <div className="text-xs text-muted-foreground text-center border-t border-white/5 pt-3">
                Riot Match ID: <code className="bg-white/5 px-1.5 py-0.5 rounded">{detail.match.matchIdRiotApi}</code>
                {detail.tournament.region && (
                  <span className="ml-2">Region: {detail.tournament.region}</span>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
