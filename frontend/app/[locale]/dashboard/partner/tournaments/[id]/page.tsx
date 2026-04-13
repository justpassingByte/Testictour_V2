"use client"
import { useState, useEffect, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { Link } from "@/i18n/navigation"
import {
  ArrowLeft, Loader2, Save, Trophy, RefreshCw, Users, Play,
  Square, CheckCircle2, XCircle, Clock, AlertTriangle, Settings2,
  ChevronRight, MoreVertical, UserMinus, Crown, Skull, Image as ImageIcon,
  ShieldAlert, ShieldCheck, Wrench, GitBranch, FastForward, SkipForward
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
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell, Pie, PieChart as RechartsPieChart } from 'recharts'
import { useTranslations } from "next-intl"
import { TournamentAnalyticsDash } from "@/app/[locale]/components/TournamentAnalyticsDash"
import { TournamentQuickStats } from "@/app/[locale]/components/TournamentQuickStats"
import { EscrowManagementTab } from "@/app/[locale]/dashboard/partner/components/EscrowManagementTab"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:      { label: "pending",      color: "slate",  icon: Clock },
  UPCOMING:     { label: "upcoming",     color: "blue",   icon: Clock },
  REGISTRATION: { label: "registration", color: "cyan",   icon: Users },
  in_progress:  { label: "in_progress",  color: "green",  icon: Play },
  COMPLETED:    { label: "completed",    color: "violet", icon: CheckCircle2 },
  CANCELLED:    { label: "cancelled",    color: "red",    icon: XCircle },
}

export default function TournamentManagePage() {
  const t = useTranslations("Common");
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<ITournament | null>(null)
  const [participants, setParticipants] = useState<IParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; participant: IParticipant | null }>({ open: false, participant: null })
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
        <p>{t("tournament_not_found")}</p>
        <Link href="/dashboard/partner?tab=tournaments"><Button variant="link">{t("back")}</Button></Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const registeredCount = participants.length
  const fillPercent = tournament.maxPlayers > 0 ? (registeredCount / tournament.maxPlayers) * 100 : 0
  const prizePool = tournament.entryFee * registeredCount * (1 - (tournament.hostFeePercent || 0.1))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/partner?tab=tournaments">
            <Button variant="ghost" size="icon" className="mt-0.5"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{tournament.name}</h1>
              <Badge variant="outline" className={`bg-${statusCfg.color}-500/10 text-${statusCfg.color}-400 border-${statusCfg.color}-500/20 flex items-center gap-1`}>
                <StatusIcon className="h-3 w-3" />
              {statusCfg.label === 'pending' ? t('idle') : statusCfg.label === 'upcoming' ? t('upcoming') : statusCfg.label === 'in_progress' ? t('ongoing') : statusCfg.label === 'completed' ? t('finished') : t(statusCfg.label)}
              </Badge>
              {tournament.isCommunityMode ? (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                  <AlertTriangle className="mr-1 h-3 w-3 inline" />
                  Community Mode
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  <ShieldCheck className="mr-1 h-3 w-3 inline" />
                  Escrow Secured
                </Badge>
              )}
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
              <span className="ml-2">{t("start_tournament")}</span>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide">{t("registration")}</p>
            <p className="text-2xl font-bold mt-1">{registeredCount} <span className="text-base text-muted-foreground font-normal">/ {tournament.maxPlayers}</span></p>
            <Progress value={fillPercent} className="mt-2 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{fillPercent.toFixed(0)}% full</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wide">{t("prize_pool")}</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(prizePool)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Entry: {formatCurrency(tournament.entryFee)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-wide">{t("phases")}</p>
            <p className="text-2xl font-bold mt-1">{tournament.phases?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {tournament.phases?.reduce((sum, p) => sum + (p.rounds?.length || 0), 0) || 0} rounds total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wide">{t("start")}</p>
            <p className="text-base font-bold mt-1">{new Date(tournament.startTime).toLocaleDateString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </CardContent>
        </Card>
      </div>

      {(tournament.status === 'in_progress' || tournament.status === 'COMPLETED') && (
        <Card className="bg-gradient-to-r from-card/40 via-card/80 to-card/40 border-white/5 py-4 px-6 md:px-12 backdrop-blur-md">
          <TournamentQuickStats tournamentId={tournament.id} className="text-sm justify-center gap-12 sm:gap-24 md:gap-32" />
        </Card>
      )}

      {/* Management Tabs */}
      {/* Emergency warning banner when tournament is live */}
      {tournament.status === 'in_progress' && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{t("tournament_is")}<strong>{t("live")}</strong>{t("if_lobbies_fail_to_auto_assign_after_a_r_desc")}<strong>{t("round_control")}</strong>{t("tools_under_phases_to_manually_intervene")}</span>
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
            Format & Control
            {tournament.status === 'in_progress' && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">
            <PieChart className="mr-1.5 h-4 w-4" />
            {t("statistics")}
          </TabsTrigger>
          <TabsTrigger value="escrow">
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            Quỹ Escrow
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
                <p className="text-center py-10 text-muted-foreground text-sm">{t("no_participants_yet")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("player")}</TableHead>
                      <TableHead>{t("riot_id")}</TableHead>
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
                                <UserMinus className="mr-2 h-4 w-4" />{t("remove_complete")}</DropdownMenuItem>
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

        {/* ─── PHASES FORMAT & CONTROL TAB ─── */}
        <TabsContent value="phases">
          <div className="space-y-4">
            
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-blue-400/90 text-sm">
              <GitBranch className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <p className="font-semibold text-blue-400 mb-1">{t("interactive_format_round_control")}</p>{t("browse_through_phases_and_directly_contr_desc")}<strong>{t("force_advance")}</strong>{t("during_production_incidents_only_e_g_if__desc")}</div>
            </div>

            {tournament.phases?.length > 0 ? tournament.phases.map((phase, i) => (
              <Card key={phase.id} className="bg-card/60 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-lg font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{phase.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{phase.type} Format · Lobby size {phase.lobbySize}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`px-2.5 py-1 ${
                      phase.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        phase.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>{phase.status || 'pending'}</Badge>
                  </div>

                  {phase.rounds && phase.rounds.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {phase.rounds.map((round) => {
                         const lobbyCount = round.lobbies?.length || 0;
                         const completedLobbies = round.lobbies?.filter((l: any) => l.state === 'FINISHED' || l.state === 'COMPLETED').length || 0;
                         const advancingKey = round.id + 'advance';
                         return (
                           <div key={round.id} className={`flex flex-col bg-white/5 rounded-lg p-3 border transition-colors ${
                              round.status === 'completed' ? 'border-green-500/20' :
                              round.status === 'in_progress' ? 'border-yellow-500/20 shadow-[0_0_15px_-3px_rgba(234,179,8,0.1)]' :
                              'border-white/10'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold">Round {round.roundNumber}</span>
                              <Badge variant="outline" className={`text-[10px] px-1.5 ${
                                round.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                round.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                'text-slate-400'
                              }`}>{round.status}</Badge>
                            </div>

                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-end">
                                <div className="text-xs text-muted-foreground">
                                  {lobbyCount} lobbies · {completedLobbies}/{lobbyCount} finished
                                </div>
                              </div>
                              
                              {/* Displaying Lobbies */}
                              {round.lobbies && round.lobbies.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap pt-1">
                                  {round.lobbies.map((lobby: any) => (
                                    <Link key={lobby.id} href={`/tournaments/${tournament.id}?tab=phases&expandedRound=${round.id}`}>
                                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 cursor-pointer transition-colors ${
                                        lobby.state === 'PLAYING' ? 'bg-primary/20 text-primary border-primary/30' :
                                        lobby.state === 'FINISHED' || lobby.state === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        'hover:bg-white/10 border-white/20'
                                      }`}>
                                        {lobby.name || `Lobby ${lobby.lobbyNumber || ''}`}
                                      </Badge>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Control button for active round */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                {round.status === 'completed' ? (
                                  <span className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4" />{t("finished")}</span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={roundControlLoading[advancingKey]}
                                    onClick={() => handleRoundControl(round.id, 'advance')}
                                    className="w-full border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 h-8 text-xs gap-1.5"
                                  >
                                    {roundControlLoading[advancingKey] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <><SkipForward className="h-3.5 w-3.5" /> {t("force_advance")}</>
                                    )}
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
            )) : (
              <Card className="bg-card/60 border-white/10">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>{t("no_phases_configured_yet")}</p>
                </CardContent>
              </Card>
            )}
            <p className="text-[11px] text-muted-foreground text-center pt-2 opacity-60">{t("round_controls_securely_dispatch_to_back_desc")}<code className="bg-white/5 px-1 rounded">{t("auto_advance")}</code>).
            </p>
          </div>
        </TabsContent>


        {/* ─── STATISTICS TAB ─── */}
        <TabsContent value="stats">
          <Suspense fallback={<div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <TournamentAnalyticsDash tournamentId={tournamentId} />
          </Suspense>
        </TabsContent>

        {/* ─── ESCROW TAB ─── */}
        <TabsContent value="escrow">
          <EscrowManagementTab 
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            tournamentStatus={tournament.status}
            isCommunityMode={tournament.isCommunityMode!}
            participants={participants}
          />
        </TabsContent>

        {/* ─── SETTINGS TAB ─── */}
        <TabsContent value="settings">
          <Card className="bg-card/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />{t("tournament_settings")}</CardTitle>
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
                      <SelectItem value="pending">{t("pending")}</SelectItem>
                      <SelectItem value="UPCOMING">{t("upcoming")}</SelectItem>
                      <SelectItem value="REGISTRATION">{t("registration_open")}</SelectItem>
                      <SelectItem value="in_progress">{t("in_progress")}</SelectItem>
                      <SelectItem value="COMPLETED">{t("completed")}</SelectItem>
                      <SelectItem value="CANCELLED">{t("cancelled")}</SelectItem>
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
                  <Label>{t("prize_pool_budget")}</Label>
                  <Input type="number" value={editForm.budget} onChange={(e) => setEditForm(p => ({ ...p, budget: parseFloat(e.target.value) }))} placeholder="Auto calc if 0" />
                </div>
                <div className="space-y-2">
                  <Label>{t("host_fee")}</Label>
                  <Input type="number" step="0.01" min="0" max="1" value={editForm.hostFeePercent} onChange={(e) => setEditForm(p => ({ ...p, hostFeePercent: parseFloat(e.target.value) }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("tournament_banner_image")}</Label>
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
                    <p className="text-[10px] text-muted-foreground mt-1">{t("recommended_size_1920x1080px_16_9_ratio")}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("last_synced")}</p>
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
            <DialogDescription>{t("remove")}<strong>{removeDialog.participant?.inGameName || removeDialog.participant?.user?.username}</strong>{t("from_this_tournament_this_cannot_be_undo_desc")}</DialogDescription>
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
