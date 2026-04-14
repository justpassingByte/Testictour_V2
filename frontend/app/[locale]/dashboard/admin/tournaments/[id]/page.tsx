"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Loader2, Save, Trophy, RefreshCw, Users, Play,
  Square, CheckCircle2, XCircle, Clock, AlertTriangle, Settings2,
  ChevronRight, MoreVertical, UserMinus, Crown, Skull, Image as ImageIcon,
  ShieldAlert, ShieldCheck, Wrench, GitBranch, FastForward, SkipForward, Lock, Send, Trash2, Copy
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
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate"
import { EscrowManagementTab } from "@/app/[locale]/dashboard/partner/components/EscrowManagementTab"
import { TournamentStatisticsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentStatisticsTab"
import { io, Socket } from "socket.io-client"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "pending", color: "slate", icon: Clock },
  UPCOMING: { label: "upcoming", color: "blue", icon: Clock },
  REGISTRATION: { label: "registration", color: "cyan", icon: Users },
  in_progress: { label: "in_progress", color: "green", icon: Play },
  COMPLETED: { label: "completed", color: "violet", icon: CheckCircle2 },
  CANCELLED: { label: "cancelled", color: "red", icon: XCircle },
}

export default function TournamentManagePage() {
  const t = useTranslations("common")
  const { formatVndText } = useCurrencyRate()
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<ITournament | null>(null)
  const [participants, setParticipants] = useState<IParticipant[]>([])
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [listPage, setListPage] = useState(1)
  const LIMIT = 10

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
  const [editPhases, setEditPhases] = useState<any[]>([])
  const [deletedPhaseIds, setDeletedPhaseIds] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  const refresh = async () => {
    try {
      const [t, p] = await Promise.all([
        TournamentService.detail(tournamentId),
        TournamentService.listParticipants(tournamentId, listPage, LIMIT).catch(() => ({ participants: [], total: 0 })),
      ])
      setTournament(t)
      setParticipants(p.participants || [])
      setTotalParticipants(p.total || 0)
      setEditForm({
        name: t.name,
        description: t.description || "",
        maxPlayers: t.maxPlayers,
        entryFee: t.entryFee,
        budget: t.budget || 0,
        hostFeePercent: t.hostFeePercent || 0.1,
        status: t.status,
      })
      setEditPhases(t.phases?.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        lobbySize: p.lobbySize || 8,
        numberOfRounds: p.numberOfRounds || 1,
        matchesPerRound: p.matchesPerRound || 1,
        advancementType: p.advancementCondition?.type || "top_n_scores",
        advancementValue: p.advancementCondition?.value || 4,
      })) || [])
      setDeletedPhaseIds([])

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

    // Real-time: subscribe to tournament socket events
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'
    const socket: Socket = io(SOCKET_URL, { transports: ['websocket'] })
    socket.emit('join_tournament', tournamentId)
    const handleUpdate = () => { refresh() }
    socket.on('tournament_update', handleUpdate)
    socket.on('bracket_update', handleUpdate)
    return () => {
      socket.off('tournament_update', handleUpdate)
      socket.off('bracket_update', handleUpdate)
      socket.disconnect()
    }
  }, [tournamentId])

  const fetchParticipants = async (page: number) => {
    try {
      const res = await TournamentService.listParticipants(tournamentId, page, LIMIT)
      setParticipants(res.participants || [])
      setTotalParticipants(res.total || 0)
    } catch {
      toast({ title: "Error", description: "Failed to load participants.", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchParticipants(listPage)
    }
  }, [listPage])

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

      const { budget, ...restForm } = editForm
      const payload: any = { ...restForm, customPrizePool: budget }
      const phasePayload: any = {}

      if (editPhases.length > 0) {
        phasePayload.update = editPhases.map(p => ({
          where: { id: p.id },
          data: {
            name: p.name,
            type: p.type,
            lobbySize: p.lobbySize,
            numberOfRounds: p.numberOfRounds,
            matchesPerRound: p.matchesPerRound,
            advancementCondition: { type: p.advancementType, value: p.advancementValue }
          }
        }))
      }

      if (deletedPhaseIds.length > 0) {
        phasePayload.delete = deletedPhaseIds.map(id => ({ id }))
      }

      if (Object.keys(phasePayload).length > 0) {
        payload.phases = phasePayload
      }

      await TournamentService.update(tournamentId, payload)
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
  const handleRoundControl = async (roundId: string, action: 'advance' | 'force-fetch' | 'force-complete') => {
    const key = roundId + action;
    setRoundControlLoading(prev => ({ ...prev, [key]: true }));
    try {
      const endpointMap = {
        'advance': `/rounds/${roundId}/auto-advance`,
        'force-fetch': `/rounds/${roundId}/force-fetch-lobbies`,
        'force-complete': `/rounds/${roundId}/force-complete`,
      };
      const titleMap = {
        'advance': '✅ Round Advanced',
        'force-fetch': '✅ Lobbies Marked Fetched',
        'force-complete': '✅ Round Force-Completed',
      };
      const descMap = {
        'advance': 'Auto-advance triggered. Lobbies will be reassigned automatically.',
        'force-fetch': 'All stuck lobbies marked as fetchedResult=true. Trigger Force Advance next.',
        'force-complete': 'All lobbies marked fetched + auto-advance triggered.',
      };
      await api.post(endpointMap[action]);
      toast({ title: titleMap[action], description: descMap[action] });
      await refresh();
    } catch (error: any) {
      toast({
        title: 'Action Failed',
        description: error?.response?.data?.error || error?.response?.data?.message || error.message || 'Could not complete action.',
        variant: 'destructive',
      });
    } finally {
      setRoundControlLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleForceStartLobby = async (lobbyId: string) => {
    const key = 'lobby-' + lobbyId;
    setRoundControlLoading(prev => ({ ...prev, [key]: true }));
    try {
      await api.post(`/rounds/lobbies/${lobbyId}/force-start`);
      toast({ title: '🚀 Lobby Force-Started', description: 'Lobby is now transitioning to STARTING → PLAYING. Players bypassed ready check.' });
      await refresh();
    } catch (error: any) {
      toast({
        title: 'Force Start Failed',
        description: error?.response?.data?.error || error.message || 'Could not force-start lobby.',
        variant: 'destructive',
      });
    } finally {
      setRoundControlLoading(prev => ({ ...prev, [key]: false }));
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
  const registeredCount = tournament.registered || totalParticipants
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
              {tournament.isCommunityMode ? (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                  <AlertTriangle className="mr-1 h-3 w-3 inline" />
                  Community Mode
                </Badge>
              ) : (
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    <ShieldCheck className="mr-1 h-3 w-3 inline" />
                    Escrow Secured
                  </Badge>
                  {tournament.escrowStatus === 'locked' && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 hidden md:inline-flex">
                      <Lock className="mr-1 h-3 w-3 inline" />
                      Funding Locked
                    </Badge>
                  )}
                  {tournament.escrowStatus === 'not_funded' && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 hidden md:inline-flex">
                      <AlertTriangle className="mr-1 h-3 w-3 inline" />
                      Not Funded
                    </Badge>
                  )}
                  {tournament.escrowStatus === 'partially_funded' && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hidden md:inline-flex">
                      <ShieldAlert className="mr-1 h-3 w-3 inline" />
                      Partial Fund
                    </Badge>
                  )}
                  {tournament.escrowStatus === 'payout_released' && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hidden md:inline-flex">
                      <Send className="mr-1 h-3 w-3 inline" />
                      Payout Released
                    </Badge>
                  )}
                </div>
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
            <div className="flex flex-col mt-1">
              <p className="text-xl font-bold text-emerald-400">${prizePool.toLocaleString()} <span className="text-xs font-normal text-emerald-400/70">USD</span></p>
              <p className="text-[10px] text-emerald-400/50 -mt-0.5">{formatVndText(prizePool)}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 flex justify-between items-center">
              <span>Entry: ${tournament.entryFee.toLocaleString()} <span className="text-[9px]">USD</span></span>
              <span>{formatVndText(tournament.entryFee)}</span>
            </p>
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

      {/* ─── Winner Banner (shown when COMPLETED) ─── */}
      {tournament.status === 'COMPLETED' && (() => {
        const sortedByScore = [...participants].sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
        const winner = sortedByScore[0];
        const prizeStructure = tournament.prizeStructure as number[] | null;
        const totalPot = tournament.budget || (participants.length * tournament.entryFee * (1 - (tournament.hostFeePercent || 0.1)));
        const winnerPrize = prizeStructure && prizeStructure.length > 0 ? ((prizeStructure[0] / 100) * totalPot) : null;
        return winner ? (
          <div className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-400/5 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40 flex items-center justify-center shrink-0">
                <Crown className="h-7 w-7 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider mb-0.5">🏆 Tournament Champion</p>
                <p className="text-xl font-bold text-yellow-300 truncate">{winner.inGameName || winner.user?.username || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Score: <span className="font-semibold text-white">{winner.scoreTotal || 0} pts</span></p>
              </div>
              {winnerPrize && (
                <div className="shrink-0 text-right">
                  <p className="text-xs text-emerald-400/70 font-semibold uppercase tracking-wider">Prize Won</p>
                  <p className="text-2xl font-bold text-emerald-400">${winnerPrize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              )}
            </div>
          </div>
        ) : null;
      })()}

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
          <TabsTrigger value="escrow">
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            Quỹ Escrow
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="mr-1.5 h-4 w-4" />
            {t("settings")}
          </TabsTrigger>
          {tournament.status === 'COMPLETED' && (
            <TabsTrigger value="results" className="relative">
              <Trophy className="mr-1.5 h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400">Kết quả &amp; Thưởng</span>
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-400" />
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── PARTICIPANTS TAB ─── */}
        <TabsContent value="participants">
          {participants.length > 0 && (() => {
            const stats = { facebook: 0, discord: 0, friend: 0, other: 0, unknown: 0 };
            participants.forEach(p => {
              if (p.referralSource === "facebook") stats.facebook++;
              else if (p.referralSource === "discord") stats.discord++;
              else if (p.referralSource === "friend") stats.friend++;
              else if (p.referralSource === "other") stats.other++;
              else stats.unknown++;
            });
            const referralData = [
              { name: 'Facebook', value: stats.facebook, color: '#1877F2' },
              { name: 'Discord', value: stats.discord, color: '#5865F2' },
              { name: 'Bạn bè giới thiệu', value: stats.friend, color: '#10b981' },
              { name: 'Khác', value: stats.other, color: '#f59e0b' },
              { name: 'Tự tìm kiếm / Không rõ', value: stats.unknown, color: '#64748b' }
            ].filter(s => s.value > 0).sort((a, b) => b.value - a.value);

            return (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Nguồn truy cập (Referral Sources)</h3>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                  {referralData.map(stat => (
                    <Card key={stat.name} className="bg-card/40 border-white/5 py-3 px-4 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-xs font-medium text-muted-foreground truncate">{stat.name}</span>
                      </div>
                      <span className="text-2xl font-bold font-mono pl-4.5">{stat.value}</span>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

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
                      <TableHead>PUUID</TableHead>
                      <TableHead>{t("region")}</TableHead>
                      <TableHead>Nguồn</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {p.user?.puuid ? (
                            <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => {
                              navigator.clipboard.writeText(p.user!.puuid!);
                              toast({ description: "Đã copy PUUID" });
                            }}>
                              <span className="font-mono text-xs text-muted-foreground">{p.user.puuid.slice(0, 4)}...{p.user.puuid.slice(-4)}</span>
                              <Copy className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <span className="text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.region || 'VN'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{p.referralSource || 'Unknown'}</TableCell>
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
            {totalParticipants > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <div className="text-sm text-muted-foreground">
                  Showing {(listPage - 1) * LIMIT + 1} to {Math.min(listPage * LIMIT, totalParticipants)} of {totalParticipants}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setListPage(p => Math.max(1, p - 1))} disabled={listPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setListPage(p => p + 1)} disabled={listPage * LIMIT >= totalParticipants}>Next</Button>
                </div>
              </div>
            )}
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
                        <p className="text-xs text-muted-foreground capitalize">{phase.type} · Lobby size {phase.lobbySize} · {t("matches_per_player", { fallback: "Total matches" })}: {phase.matchesPerRound || 1}</p>
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
                              <span className="text-sm font-medium">
                                {phase.type === 'elimination' || phase.type === 'GROUP_STAGE'
                                  ? t('group_n', { letter: String.fromCharCode(64 + round.roundNumber) })
                                  : t('match_n', { number: round.roundNumber, fallback: `Match ${round.roundNumber}` })
                                }
                              </span>
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {phase.rounds.map((round: any) => {
                        const lobbyCount = round.lobbies?.length || 0;
                        const fetchedCount = round.lobbies?.filter((l: any) => l.fetchedResult).length || 0;
                        const finishedCount = round.lobbies?.filter((l: any) => l.state === 'FINISHED' || l.state === 'COMPLETED').length || 0;
                        const stuckLobbies = round.lobbies?.filter((l: any) => !['FINISHED', 'PLAYING', 'STARTING'].includes(l.state)) || [];
                        const advanceKey = round.id + 'advance';
                        const fetchKey = round.id + 'force-fetch';
                        const completeKey = round.id + 'force-complete';
                        return (
                          <div key={round.id} className={`rounded-lg border ${round.status === 'completed' ? 'bg-green-500/5 border-green-500/20' :
                              round.status === 'in_progress' ? 'bg-yellow-500/5 border-yellow-500/20' :
                                'bg-white/5 border-white/10'
                            }`}>
                            {/* Round header */}
                            <div className="flex items-center justify-between gap-3 p-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {phase.type === 'elimination' || phase.type === 'GROUP_STAGE'
                                      ? t('group_n', { letter: String.fromCharCode(64 + round.roundNumber) })
                                      : t('match_n', { number: round.roundNumber, fallback: `Match ${round.roundNumber}` })
                                    }
                                  </span>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 ${round.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                      round.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                        'text-slate-400'
                                    }`}>{round.status}</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {lobbyCount} lobbies · {fetchedCount}/{lobbyCount} fetched · {finishedCount}/{lobbyCount} finished
                                </p>
                              </div>
                              {round.status === 'completed' ? (
                                <span className="text-xs text-green-400 flex items-center gap-1 shrink-0 bg-green-400/10 px-3 py-1.5 rounded-md font-medium border border-green-400/20">
                                  <CheckCircle2 className="h-4 w-4" /> Đã xong
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1.5 shrink-0 justify-start">
                                  {/* Step 1: Force Advance (normal trigger) */}
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={roundControlLoading[advanceKey]}
                                    onClick={() => handleRoundControl(round.id, 'advance')}
                                    className="border-amber-500/30 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-400 h-8 w-8 shadow-sm transition-colors"
                                    title="Tiến Vòng / Trộn Lobby (Force Advance)"
                                  >
                                    {roundControlLoading[advanceKey] ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}
                                  </Button>
                                  {/* Step 2: Force Fetch (unstick fetchedResult) */}
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={roundControlLoading[fetchKey]}
                                    onClick={() => handleRoundControl(round.id, 'force-fetch')}
                                    className="border-blue-500/30 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-400 h-8 w-8 shadow-sm transition-colors"
                                    title="Tải Bảng Điểm (Force Fetch)"
                                  >
                                    {roundControlLoading[fetchKey] ? <Loader2 className="h-4 w-4 animate-spin" /> : <FastForward className="h-4 w-4" />}
                                  </Button>
                                  {/* Step 3: Nuclear — mark all fetched + auto-advance together */}
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={roundControlLoading[completeKey]}
                                    onClick={() => handleRoundControl(round.id, 'force-complete')}
                                    className="border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 h-8 w-8 shadow-sm transition-colors"
                                    title="Bỏ Qua Lỗi & Xếp Vòng (Force Complete)"
                                  >
                                    {roundControlLoading[completeKey] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Per-lobby Force Start — only show for non-finished, non-playing lobbies */}
                            {stuckLobbies.length > 0 && round.status !== 'completed' && (
                              <div className="border-t border-white/5 px-4 py-3 bg-white/[0.02] flex flex-col gap-2">
                                <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1.5 uppercase tracking-wide">
                                  <Play className="h-3.5 w-3.5" /> Force Start:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {stuckLobbies.map((lobby: any) => (
                                    <Button
                                      key={lobby.id}
                                      size="sm"
                                      variant="outline"
                                      disabled={roundControlLoading['lobby-' + lobby.id]}
                                      onClick={() => handleForceStartLobby(lobby.id)}
                                      className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300 gap-1.5 px-2.5 py-1 font-medium shadow-sm transition-colors justify-start h-auto min-h-[30px]"
                                      title={`Ép Bắt Đầu ${lobby.name} — bỏ qua chờ Ready`}
                                    >
                                      {roundControlLoading['lobby-' + lobby.id]
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                        : <Play className="h-3.5 w-3.5 shrink-0" />
                                      }
                                      <span className="truncate">{lobby.name || `Lobby ${lobby.id.slice(-4)}`}</span>
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-500/80 uppercase font-semibold shrink-0">{lobby.state}</Badge>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Legend */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2.5 shadow-sm mt-4">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                Hướng dẫn sử dụng các nút
              </p>
              <div className="grid gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-start gap-2.5"><span className="text-amber-500 w-32 shrink-0 font-semibold bg-amber-500/10 px-2 py-0.5 rounded text-center">Tiến Vòng</span>— Tự động kiểm tra điều kiện lấy danh sách người chơi mới & trộn lobby. (Dùng nút này đầu tiên khi vòng không tự nhảy)</div>
                <div className="flex items-start gap-2.5"><span className="text-blue-500 w-32 shrink-0 font-semibold bg-blue-500/10 px-2 py-0.5 rounded text-center">Tải Bảng Điểm</span>— Ép chuyển trạng thái <code className="bg-white/10 px-1 py-0.5 rounded">fetchedResult=true</code> cho các lobby bị kẹt đang lấy điểm lâu. Sau đó ấn Tiến Vòng.</div>
                <div className="flex items-start gap-2.5"><span className="text-red-500 w-32 shrink-0 font-semibold bg-red-500/10 px-2 py-0.5 rounded text-center">Bỏ Qua & Xếp Vòng</span>— Phương án mạnh nhất: Ép tất cả lobbies thành đã tải điểm và ngay lập tức lấy TOP hiện tại để chuyển sang round kế tiếp. Dùng khi 2 nút trên gặp lỗi.</div>
                <div className="flex items-start gap-2.5"><span className="text-emerald-500 w-32 shrink-0 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-center">Ép Bắt Đầu</span>— Bắt đầu trận ngay lập tức bỏ qua thời gian đếm ngược hoặc việc người chơi chưa ấn "Sẵn Sàng".</div>
              </div>
            </div>
          </div>
        </TabsContent>


        {/* ─── STATISTICS TAB ─── */}
        <TabsContent value="stats">
          <TournamentStatisticsTab tournamentId={tournamentId} />
        </TabsContent>

        {/* ─── ESCROW TAB ─── */}
        <TabsContent value="escrow">
          <EscrowManagementTab
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            tournamentStatus={tournament.status}
            isCommunityMode={tournament.isCommunityMode || false}
            participants={participants}
            isAdmin={true}
            prizeStructure={tournament.prizeStructure}
          />
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

              {editPhases.length > 0 && (
                <div className="border border-white/10 rounded-lg p-0 mt-6">
                  <div className="p-3 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between">
                    <div>
                      <h3 className="font-bold">Phase Configuration</h3>
                      <p className="text-xs text-muted-foreground">Modify phase settings. Avoid changing if tournament has started.</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {editPhases.map((phase, index) => (
                      <Card key={phase.id} className="bg-black/30 border-white/5">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm text-violet-300">Phase {index + 1}</h4>
                            <Button variant="ghost" size="sm" className="h-6 px-2.5 text-red-400/70 hover:text-red-300 hover:bg-red-400/10" onClick={() => {
                              setEditPhases(prev => prev.filter(p => p.id !== phase.id));
                              setDeletedPhaseIds(prev => [...prev, phase.id]);
                            }}>
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              <span className="text-[10px] font-medium tracking-wide uppercase">Remove</span>
                            </Button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide">Name</Label>
                              <Input value={phase.name} onChange={(e) => setEditPhases(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} placeholder="Phase name" className="bg-black/40" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                              <Label className="text-[11px] uppercase tracking-wide">Type</Label>
                              <Select value={phase.type} onValueChange={(v) => setEditPhases(prev => prev.map((p, i) => i === index ? { ...p, type: v } : p))}>
                                <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="elimination">Group Elimination (Loại theo bảng - BO1/BO2..)</SelectItem>
                                  <SelectItem value="points">Global Points (Sảnh chung tính điểm)</SelectItem>
                                  <SelectItem value="swiss">Swiss (Thụy Sĩ / Tính điểm tích luỹ)</SelectItem>
                                  <SelectItem value="round_robin">Round Robin (Vòng tròn)</SelectItem>
                                  <SelectItem value="checkmate">Checkmate (Tới ngưỡng checkmate)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-[9px] text-muted-foreground mt-1 px-1">
                                {phase.type === 'elimination' && "Chia bảng đấu cố định trống suốt số vòng. Cuối cùng loại những người bét bảng."}
                                {phase.type === 'points' && "Gom tất cả người chơi vào sảnh chung, xào lại sau mỗi trận, tính tổng điểm."}
                                {phase.type === 'swiss' && "Thi đấu nhiều trận, cộng dồn điểm, ưu tiên bắt cặp đồng điểm."}
                                {phase.type === 'round_robin' && "Thi đấu vòng tròn tính điểm."}
                                {phase.type === 'checkmate' && "Người chơi phải đạt đủ số điểm ngưỡng, sau đó dành Top 1 để vô địch."}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide text-orange-400">Matches to Play (Thể thức thi đấu)</Label>
                              <Input type="number" min={1} value={phase.matchesPerRound || phase.numberOfRounds} onChange={(e) => setEditPhases(prev => prev.map((p, i) => i === index ? { ...p, matchesPerRound: parseInt(e.target.value) || 1, numberOfRounds: parseInt(e.target.value) || 1 } : p))} className="bg-black/40 border-orange-500/50" />
                              <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
                                {phase.type === 'elimination' ? "Số trận mỗi bảng (1 = BO1, 2 = BO2)." : "Sẽ xào lobby sau mỗi trận cho đến khi đủ số trận."}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide">Advancement Mechanism</Label>
                              <Select value={phase.advancementType} onValueChange={(v) => setEditPhases(prev => prev.map((p, i) => i === index ? { ...p, advancementType: v } : p))}>
                                <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="top_n_scores">Top N Scores</SelectItem>
                                  <SelectItem value="placement">By Placement</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide">Advance Target</Label>
                              <Input type="number" min={1} value={phase.advancementValue} onChange={(e) => setEditPhases(prev => prev.map((p, i) => i === index ? { ...p, advancementValue: parseInt(e.target.value) || 4 } : p))} className="bg-black/40" />
                            </div>
                            {index > 0 && (
                              <div className="space-y-1.5">
                                <Label className="text-[11px] uppercase tracking-wide">Carry Over Scores</Label>
                                <Select value={phase.carryOverScores ? "true" : "false"} onValueChange={(v) => setEditPhases(prev => prev.map((p, i) => i === index ? { ...p, carryOverScores: v === "true" } : p))}>
                                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="false">Reset Points (Về 0 điểm)</SelectItem>
                                    <SelectItem value="true">Keep Points (Cộng dồn điểm)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

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

        {/* ─── RESULTS & PRIZE DISTRIBUTION TAB ─── */}
        {tournament.status === 'COMPLETED' && (
          <TabsContent value="results">
            <div className="space-y-4">
              {/* Podium */}
              {(() => {
                const sorted = [...participants].sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
                const prizeStructure = tournament.prizeStructure as number[] | null;
                const totalPot = tournament.budget || (participants.length * tournament.entryFee * (1 - (tournament.hostFeePercent || 0.1)));
                const getPrize = (rank: number) => prizeStructure && prizeStructure[rank] ? ((prizeStructure[rank] / 100) * totalPot) : 0;
                const podium = [sorted[1], sorted[0], sorted[2]]; // 2nd, 1st, 3rd
                const podiumHeights = ['h-20', 'h-28', 'h-16'];
                const podiumColors = ['bg-gray-400/20 border-gray-400/40', 'bg-yellow-500/20 border-yellow-500/40', 'bg-amber-700/20 border-amber-700/40'];
                const podiumTextColors = ['text-gray-300', 'text-yellow-400', 'text-amber-600'];
                const medals = ['🥈', '🥇', '🥉'];
                const podiumRanks = [2, 1, 3];
                return (
                  <Card className="bg-card/60 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        Bục thưởng
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end justify-center gap-4 pt-4 pb-2">
                        {podium.map((p, i) => p ? (
                          <div key={p.id} className="flex flex-col items-center gap-2">
                            <div className="text-center">
                              <p className="text-sm font-bold">{p.inGameName || p.user?.username || '?'}</p>
                              {p.user?.puuid && (
                                <div className="flex items-center gap-1 mt-0.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => {
                                  navigator.clipboard.writeText(p.user!.puuid!);
                                  toast({ description: "Đã copy PUUID" });
                                }}>
                                  <span className="font-mono text-[10px]">{p.user.puuid.slice(0, 4)}...{p.user.puuid.slice(-4)}</span>
                                  <Copy className="h-2.5 w-2.5" />
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">{p.scoreTotal || 0} pts</p>
                              {getPrize(podiumRanks[i] - 1) > 0 && (
                                <p className="text-xs font-bold text-emerald-400">${getPrize(podiumRanks[i] - 1).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              )}
                            </div>
                            <div className={`w-24 ${podiumHeights[i]} rounded-t-lg border-2 ${podiumColors[i]} flex items-center justify-center`}>
                              <span className="text-3xl">{medals[i]}</span>
                            </div>
                          </div>
                        ) : <div key={i} className="w-24" />)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Full Prize Table */}
              <Card className="bg-card/60 border-white/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Medal className="h-4 w-4 text-violet-400" />
                    Bảng phân phối thưởng
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Người chơi</TableHead>
                        <TableHead>PUUID</TableHead>
                        <TableHead className="text-center">Điểm</TableHead>
                        <TableHead className="text-center">% Thưởng</TableHead>
                        <TableHead className="text-right">Số tiền thưởng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...participants]
                        .sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0))
                        .map((p, i) => {
                          const rank = i + 1;
                          const prizeStructure = tournament.prizeStructure as number[] | null;
                          const totalPot = tournament.budget || (participants.length * tournament.entryFee * (1 - (tournament.hostFeePercent || 0.1)));
                          const prizePercent = prizeStructure && prizeStructure[i] ? prizeStructure[i] : 0;
                          const prizeAmount = (prizePercent / 100) * totalPot;
                          const hasPrize = prizeAmount > 0;
                          return (
                            <TableRow key={p.id} className={hasPrize ? 'bg-yellow-500/5' : ''}>
                              <TableCell>
                                <span className={`font-bold ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-[10px]">
                                      {(p.inGameName || p.user?.username || '?').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{p.inGameName || p.user?.username || 'Unknown'}</span>
                                  {rank === 1 && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.user?.puuid ? (
                                  <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => {
                                    navigator.clipboard.writeText(p.user!.puuid!);
                                    toast({ description: "Đã copy PUUID" });
                                  }}>
                                    <span className="font-mono text-xs">{p.user.puuid.slice(0, 4)}...{p.user.puuid.slice(-4)}</span>
                                    <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                ) : (
                                  <span className="text-xs">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-bold">{p.scoreTotal || 0}</TableCell>
                              <TableCell className="text-center">
                                {hasPrize ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{prizePercent}%</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {hasPrize ? (
                                  <span className="font-bold text-emerald-400">${prizeAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
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
