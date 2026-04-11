"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Loader2, Save, Trophy, RefreshCw, Users, Play,
  Square, CheckCircle2, XCircle, Clock, AlertTriangle, Settings2,
  ChevronRight, MoreVertical, UserMinus, Crown, Skull, Image as ImageIcon,
  ShieldAlert, Wrench, GitBranch, FastForward, SkipForward
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { TournamentService } from "@/app/services/TournamentService"
import { ITournament, IParticipant } from "@/app/types/tournament"
import { formatCurrency } from "@/lib/utils"
import { PieChart, TrendingUp, Medal, Sword } from "lucide-react"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:      { label: "pending",      color: "slate",  icon: Clock },
  UPCOMING:     { label: "upcoming",     color: "blue",   icon: Clock },
  REGISTRATION: { label: "registration", color: "cyan",   icon: Users },
  in_progress:  { label: "in_progress",  color: "green",  icon: Play },
  COMPLETED:    { label: "completed",    color: "violet", icon: CheckCircle2 },
  CANCELLED:    { label: "cancelled",    color: "red",    icon: XCircle },
}

export default function TournamentManagePage() {
  const t = useTranslations("common")
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<ITournament | null>(null)
  const [participants, setParticipants] = useState<IParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; participant: IParticipant | null }>({ open: false, participant: null })
  const [stats, setStats] = useState<{ topUnits: any[]; topTraits: any[]; avgDuration: string | null } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [roundControlLoading, setRoundControlLoading] = useState<Record<string, boolean>>({})

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    maxPlayers: 0,
    entryFee: 0,
    budget: 0,
    hostFeePercent: 0.1,
    status: "",
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  const refresh = async () => {
    try {
      const [t, p] = await Promise.all([
        TournamentService.detail(tournamentId),
        TournamentService.listParticipants(tournamentId, 1, 100).catch(() => ({ participants: [] })),
      ])
      setTournament(t)
      setParticipants(p.participants || [])
      setEditForm({
        name: t.name,
        description: t.description || "",
        maxPlayers: t.maxPlayers,
        entryFee: t.entryFee,
        budget: t.budget || 0,
        hostFeePercent: t.hostFeePercent || 0.1,
        status: t.status,
      })

      // Fetch stats asynchronously in the background so it doesn't block main UI
      setStatsLoading(true)
      api.get(`/dev/tournament-statistics/${tournamentId}`)
        .then(res => {
          if (res.data?.success && res.data?.stats) {
            setStats(res.data.stats)
          }
        })
        .catch(console.error)
        .finally(() => setStatsLoading(false))

    } catch (error) {
      toast({ title: "Error", description: "Failed to load tournament data.", variant: "destructive" })
    }
  }

  useEffect(() => {
    const init = async () => {
      await refresh()
      setLoading(false)
    }
    init()
  }, [tournamentId])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (selectedImage) {
        const formData = new FormData()
        formData.append("image", selectedImage)
        
        // Remove default application/json content-type so browser forms the multipart boundary safely
        await api.post(`/tournaments/${tournamentId}/image`, formData, {
          headers: {
            "Content-Type": undefined
          },
          transformRequest: [(data, headers) => {
            delete headers['Content-Type'];
            return data;
          }]
        })
      }
      await TournamentService.update(tournamentId, editForm as any)
      toast({ title: "Saved", description: "Tournament updated successfully." })
      setSelectedImage(null)
      await refresh()
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true)
    try {
      await api.put(`/tournaments/${tournamentId}`, { status: newStatus })
      toast({ title: "Status Updated", description: `Tournament is now ${newStatus.replace('_', ' ')}.` })
      await refresh()
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" })
    } finally {
      setStatusChanging(false)
    }
  }

  // ── Emergency manual round control (production-safe) ──────────────────────
  const handleRoundControl = async (roundId: string, action: 'advance') => {
    setRoundControlLoading(prev => ({ ...prev, [roundId + action]: true }));
    try {
      // Uses the production-safe, auth-protected RoundController endpoint
      await api.post(`/rounds/${roundId}/auto-advance`);
      toast({
        title: '✅ Round Advanced',
        description: 'Round advancement triggered. Lobbies will be assigned automatically.',
      });
      await refresh();
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error?.response?.data?.message || error.message || 'Could not advance round.',
        variant: 'destructive',
      });
    } finally {
      setRoundControlLoading(prev => ({ ...prev, [roundId + action]: false }));
    }
  };

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await TournamentService.syncMatches(tournamentId)
      toast({ title: "Sync Initiated", description: result.message })
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleRemoveParticipant = async () => {
    if (!removeDialog.participant) return
    try {
      await api.delete(`/tournaments/${tournamentId}/participants/${removeDialog.participant.id}`)
      toast({ title: "Removed", description: `${removeDialog.participant.inGameName || removeDialog.participant.user?.username} removed from tournament.` })
      setRemoveDialog({ open: false, participant: null })
      await refresh()
    } catch (error: any) {
      toast({ title: "Failed", description: error.message || "Could not remove participant.", variant: "destructive" })
    }
  }

  const handleToggleEliminate = async (participant: IParticipant) => {
    try {
      await api.put(`/tournaments/${tournamentId}/participants/${participant.id}`, { eliminated: !participant.eliminated })
      toast({ title: "Status Updated", description: `Player has been ${participant.eliminated ? 'revived' : 'eliminated'}.` })
      await refresh()
    } catch (error: any) {
      toast({ title: "Failed", description: "Could not update participant status.", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Tournament not found.</p>
        <Link href="/dashboard/admin/tournaments"><Button variant="link">← Back</Button></Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const registeredCount = tournament.registered || participants.length
  const fillPercent = (registeredCount / tournament.maxPlayers) * 100
  const prizePool = tournament.budget || (registeredCount * tournament.entryFee * (1 - (tournament.hostFeePercent || 0.1)))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/admin/tournaments">
            <Button variant="ghost" size="icon" className="mt-0.5"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{tournament.name}</h1>
              <Badge variant="outline" className={`bg-${statusCfg.color}-500/10 text-${statusCfg.color}-400 border-${statusCfg.color}-500/20 flex items-center gap-1`}>
                <StatusIcon className="h-3 w-3" />
              {statusCfg.label === 'pending' ? t('idle') : statusCfg.label === 'upcoming' ? t('upcoming') : statusCfg.label === 'in_progress' ? t('ongoing') : statusCfg.label === 'completed' ? t('finished') : t(statusCfg.label)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID: {tournament.id.substring(0, 12)}... · Organizer: <strong>{tournament.organizer?.username || 'System'}</strong>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="hidden sm:inline ml-2">{t("sync")}</span>
          </Button>
          {tournament.status !== 'in_progress' && tournament.status !== 'COMPLETED' && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => {
                const firstRoundId = tournament.phases?.[0]?.rounds?.[0]?.id;
                if (firstRoundId) {
                  handleRoundControl(firstRoundId, 'advance');
                } else {
                  handleStatusChange('in_progress'); // fallback
                }
              }} 
              disabled={statusChanging || (tournament.phases?.[0]?.rounds?.[0]?.id ? roundControlLoading[tournament.phases[0].rounds[0].id + 'advance'] : false)}
            >
              {(statusChanging || (tournament.phases?.[0]?.rounds?.[0]?.id && roundControlLoading[tournament.phases?.[0]?.rounds?.[0]?.id + 'advance'])) 
                ? <Loader2 className="h-4 w-4 animate-spin" /> 
                : <Play className="h-4 w-4" />}
              <span className="ml-2">Start Tournament</span>
            </Button>
          )}
          {tournament.status === 'in_progress' && (
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => handleStatusChange('COMPLETED')} disabled={statusChanging}>
              {statusChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">{t("finished")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide">Registration</p>
            <p className="text-2xl font-bold mt-1">{registeredCount} <span className="text-base text-muted-foreground font-normal">/ {tournament.maxPlayers}</span></p>
            <Progress value={fillPercent} className="mt-2 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{fillPercent.toFixed(0)}% full</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wide">Prize Pool</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{prizePool.toLocaleString()} <span className="text-sm font-normal text-emerald-400/70">Credits</span></p>
            <p className="text-[10px] text-muted-foreground mt-1">Entry: {tournament.entryFee.toLocaleString()} Credits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-wide">Phases</p>
            <p className="text-2xl font-bold mt-1">{tournament.phases?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {tournament.phases?.reduce((s, p) => s + (p.numberOfRounds || 0), 0) || 0} total rounds
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wide">Start</p>
            <p className="text-base font-bold mt-1">{new Date(tournament.startTime).toLocaleDateString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      {/* Emergency warning banner when tournament is live */}
      {tournament.status === 'in_progress' && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Tournament is <strong>live</strong>. If lobbies fail to auto-assign after a round, use the <strong>Round Control</strong> tab to manually intervene.</span>
        </div>
      )}

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="participants">
            <Users className="mr-1.5 h-4 w-4" />
            {t("players")} ({registeredCount})
          </TabsTrigger>
          <TabsTrigger value="phases">
            <Trophy className="mr-1.5 h-4 w-4" />
            {t("tournament_format")}
          </TabsTrigger>
          <TabsTrigger value="round-control" className="relative">
            <Wrench className="mr-1.5 h-4 w-4" />
            Round Control
            {tournament.status === 'in_progress' && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">
            <PieChart className="mr-1.5 h-4 w-4" />
            {t("statistics")}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="mr-1.5 h-4 w-4" />
            {t("settings")}
          </TabsTrigger>
        </TabsList>

        {/* ─── PARTICIPANTS TAB ─── */}
        <TabsContent value="participants">
          <Card className="bg-card/60 border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("players")}</CardTitle>
                <span className="text-sm text-muted-foreground">{registeredCount} / {tournament.maxPlayers}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {participants.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">No participants yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("player")}</TableHead>
                      <TableHead>Riot ID</TableHead>
                      <TableHead>{t("region")}</TableHead>
                      <TableHead>{t("total_score")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px]">
                                {(p.inGameName || p.user?.username || '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{p.inGameName || p.user?.username || 'Unknown'}</span>
                            {i === 0 && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.gameSpecificId || 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.region || 'VN'}</Badge></TableCell>
                        <TableCell className="font-semibold">{p.scoreTotal || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={p.eliminated ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}>
                            {p.eliminated ? t('eliminated') : t('active')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleEliminate(p)}>
                                <Skull className="mr-2 h-4 w-4" /> 
                                {p.eliminated ? "Revive Player" : "Eliminate Player"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-500 focus:text-red-500" 
                                onClick={() => setRemoveDialog({ open: true, participant: p })}
                              >
                                <UserMinus className="mr-2 h-4 w-4" /> Remove Complete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PHASES TAB ─── */}
        <TabsContent value="phases">
          <div className="space-y-3">
            {tournament.phases?.length > 0 ? tournament.phases.map((phase, i) => (
              <Card key={phase.id} className="bg-card/60 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{phase.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{phase.type} · Lobby size {phase.lobbySize}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      phase.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        phase.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }>{phase.status || 'pending'}</Badge>
                  </div>

                  {phase.rounds && phase.rounds.length > 0 && (
                    <>
                      <Separator className="my-3 bg-white/10" />
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {phase.rounds.map((round) => (
                          <div key={round.id} className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Round {round.roundNumber}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5">{round.status}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {round.lobbies?.length || 0} lobbies · {round.lobbies?.reduce((s: number, l: any) => s + (l.matches?.length || 0), 0) || 0} matches
                            </div>
                            {round.lobbies && round.lobbies.length > 0 && (
                              <div className="mt-2 flex gap-1 flex-wrap">
                                {round.lobbies.map((lobby: any) => (
                                  <Link key={lobby.id} href={`/tournaments/${tournament.id}?tab=phases&expandedRound=${round.id}`}>
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 hover:bg-white/10 cursor-pointer transition-colors border-white/20">
                                      {lobby.name || `Lobby ${lobby.lobbyNumber || ''}`}
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )) : (
              <Card className="bg-card/60 border-white/10">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No phases configured yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── ROUND CONTROL TAB (Admin Emergency Fallback) ─── */}
        <TabsContent value="round-control">
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
              <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Emergency Manual Override</p>
                <p className="text-amber-400/80 leading-relaxed">
                  This panel is for <strong>production incidents only</strong> — when the auto-advance system fails to assign lobbies or advance rounds after a match completes.
                  Each button calls the same production-safe <code className="bg-amber-500/10 px-1 rounded text-[11px]">RoundService.autoAdvance</code> logic.
                  Only use this if players are stuck and lobbies haven't been reassigned automatically.
                </p>
              </div>
            </div>

            {/* Per-phase round cards */}
            {!tournament.phases?.length ? (
              <Card className="bg-card/60 border-white/10">
                <CardContent className="text-center py-10 text-muted-foreground">
                  <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No phases/rounds found for this tournament.</p>
                </CardContent>
              </Card>
            ) : tournament.phases.map((phase) => (
              <Card key={phase.id} className="bg-card/60 border-white/10">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-violet-400" />
                    Phase {phase.phaseNumber}: {phase.name}
                    <Badge variant="outline" className="ml-auto text-[10px]">{phase.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {!phase.rounds?.length ? (
                    <p className="text-xs text-muted-foreground py-4">No rounds in this phase.</p>
                  ) : (
                    <div className="space-y-2">
                      {phase.rounds.map((round: any) => {
                        const lobbyCount = round.lobbies?.length || 0;
                        const completedLobbies = round.lobbies?.filter((l: any) => l.state === 'COMPLETED').length || 0;
                        const isStuck = round.status !== 'completed' && round.status !== 'cancelled';
                        const advancingKey = round.id + 'advance';
                        return (
                          <div key={round.id} className={`flex items-center justify-between gap-3 rounded-lg p-3 border ${
                            round.status === 'completed' ? 'bg-green-500/5 border-green-500/20' :
                            round.status === 'in_progress' ? 'bg-yellow-500/5 border-yellow-500/20' :
                            'bg-white/5 border-white/10'
                          }`}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Round {round.roundNumber}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 ${
                                  round.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                  round.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                  'text-slate-400'
                                }`}>{round.status}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {lobbyCount} lobbies · {completedLobbies}/{lobbyCount} completed
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {round.status === 'completed' ? (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={roundControlLoading[advancingKey]}
                                  onClick={() => handleRoundControl(round.id, 'advance')}
                                  className="border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 h-8 text-xs gap-1.5"
                                >
                                  {roundControlLoading[advancingKey] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <SkipForward className="h-3.5 w-3.5" />
                                  )}
                                  Force Advance
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Log note */}
            <p className="text-[11px] text-muted-foreground text-center">
              All actions here are logged. Calls <code className="bg-white/5 px-1 rounded">POST /rounds/:id/auto-advance</code> — the same endpoint the auto-advance queue uses.
            </p>
          </div>
        </TabsContent>

        {/* ─── STATISTICS TAB ─── */}
        <TabsContent value="stats">
          {statsLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !stats || (stats.topUnits.length === 0 && stats.topTraits.length === 0) ? (
            <Card className="bg-card/60 border-white/10">
              <CardContent className="text-center py-12 text-muted-foreground">
                <PieChart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No matches have been played yet. Play matches to generate statistics.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card/60 border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Most Played Units
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topUnits.map((champ, i) => (
                      <div key={champ.name} className="flex items-center gap-3 text-sm">
                        <div className="w-4 text-muted-foreground font-mono">{i + 1}</div>
                        <div className="w-32 font-medium capitalize truncate flex-shrink-0" title={champ.name}>{champ.name}</div>
                        <div className="flex-1">
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(5, (champ.count / stats.topUnits[0].count) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="w-16 text-right font-medium">{champ.count} <span className="text-muted-foreground text-xs font-normal">picks</span></div>
                        <div className="w-16 text-right text-muted-foreground">{champ.winrate}% WR</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-white/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sword className="h-4 w-4 text-emerald-400" />
                    Popular Traits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topTraits.map((trait, i) => (
                      <div key={`${trait.name}-${trait.level}`} className="flex items-center justify-between p-2 rounded-md bg-white/5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white/10 border-white/20 w-6 h-6 flex items-center justify-center p-0 rounded-full">{trait.level}</Badge>
                          <span className="font-medium text-sm truncate max-w-[120px]">{trait.name.replace('Set14_', '').replace('Set13_', '')}</span>
                        </div>
                        <span className="text-sm text-muted-foreground font-mono">{trait.count} plays</span>
                      </div>
                    ))}
                    {stats.avgDuration && (
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Average Match Duration</span>
                          <span className="font-mono font-medium">{stats.avgDuration} min</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── SETTINGS TAB ─── */}
        <TabsContent value="settings">
          <Card className="bg-card/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Tournament Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("tournament_name")}</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("status")}</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="REGISTRATION">Registration Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t("max_players")}</Label>
                  <Input type="number" value={editForm.maxPlayers} onChange={(e) => setEditForm(p => ({ ...p, maxPlayers: parseInt(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("registration_fee")}</Label>
                  <Input type="number" value={editForm.entryFee} onChange={(e) => setEditForm(p => ({ ...p, entryFee: parseFloat(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Prize Pool (Budget)</Label>
                  <Input type="number" value={editForm.budget} onChange={(e) => setEditForm(p => ({ ...p, budget: parseFloat(e.target.value) }))} placeholder="Auto calc if 0" />
                </div>
                <div className="space-y-2">
                  <Label>Host Fee %</Label>
                  <Input type="number" step="0.01" min="0" max="1" value={editForm.hostFeePercent} onChange={(e) => setEditForm(p => ({ ...p, hostFeePercent: parseFloat(e.target.value) }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tournament Banner/Image</Label>
                <div className="flex items-center gap-4">
                  {(selectedImage || tournament?.image) && (
                    <div className="h-16 w-32 rounded-md overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      <img 
                        src={selectedImage 
                          ? URL.createObjectURL(selectedImage) 
                          : tournament?.image?.startsWith('http') 
                            ? tournament.image 
                            : `${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') : 'http://localhost:4000'}${tournament?.image}`
                        } 
                        alt="Banner" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])} 
                      className="cursor-pointer file:cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Recommended size: 1920x1080px (16:9 ratio)</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Last synced</p>
                  <p className="text-xs text-muted-foreground">
                    {(tournament as any).lastSyncTime ? new Date((tournament as any).lastSyncTime).toLocaleString() : 'Never synced'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSync} disabled={syncing}>
                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {t("sync")}
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-violet-600 to-cyan-600">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t("save")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Participant Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(o) => setRemoveDialog({ open: o, participant: o ? removeDialog.participant : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("remove_participant")}</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeDialog.participant?.inGameName || removeDialog.participant?.user?.username}</strong> from this tournament? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, participant: null })}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleRemoveParticipant}>{t("delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
