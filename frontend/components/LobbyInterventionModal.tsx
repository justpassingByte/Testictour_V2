"use client"

import { useState, useEffect } from "react"
import { Loader2, UserPlus, UserMinus, Crown, Clock, AlertCircle, RefreshCw, Play, ShieldAlert, Zap } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { ReservePlayerAPI } from "@/app/services/ParticipantService"
import api from "@/app/lib/apiConfig"

/**
 * LobbyInterventionModal — Unified modal for managing a single lobby.
 * Shows lobby participants, reserve queue, and quick actions (kick, assign, force start).
 * Triggered by clicking on a lobby alert/card in the tournament management UI.
 */

interface LobbyInterventionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  lobby: any // Lobby object with id, name, state, participants
  reserves: any[] // List of reserve participants from API
  allParticipants?: any[] // All tournament participants for name resolution
  onRefresh?: () => void
  /** If true, shows Force Start / Force Advance buttons */
  showRoundControl?: boolean
  roundId?: string
}

/** State badge colors for lobby states */
const STATE_COLORS: Record<string, string> = {
  WAITING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  READY_CHECK: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  GRACE_PERIOD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  STARTING: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PLAYING: "bg-green-500/10 text-green-400 border-green-500/20",
  ADMIN_INTERVENTION: "bg-red-500/10 text-red-400 border-red-500/20",
  FINISHED: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  COMPLETED: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  PAUSED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
}

export default function LobbyInterventionModal({
  open,
  onOpenChange,
  tournamentId,
  lobby,
  reserves,
  allParticipants = [],
  onRefresh,
  showRoundControl = true,
  roundId,
}: LobbyInterventionModalProps) {
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [selectedReserve, setSelectedReserve] = useState<string>("")

  // Resolve participant userId → display name using allParticipants
  const resolvePlayerName = (userId: string): string => {
    const participant = allParticipants.find(p => p.userId === userId || p.user?.id === userId)
    if (participant) {
      return participant.user?.riotGameName
        || participant.inGameName
        || participant.user?.username
        || userId.slice(0, 8) + "..."
    }
    return userId.slice(0, 8) + "..."
  }

  if (!lobby) return null

  const participants = (lobby.participants as string[]) || []
  const lobbySize = 8 // Default, could be passed via phase config
  const isManageable = ['ADMIN_INTERVENTION', 'READY_CHECK', 'WAITING', 'GRACE_PERIOD'].includes(lobby.state)
  const hasVacancy = participants.length < lobbySize
  const waitingReserves = reserves.filter(r => r.isReserve !== false) // Active reserves only

  // ── Handlers ──
  const handleKickPlayer = async (targetUserId: string) => {
    const playerName = resolvePlayerName(targetUserId)
    if (!window.confirm(`Kick "${playerName}" from ${lobby.name}? Reserve players will be notified.`)) return
    const key = `kick-${targetUserId}`
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      const result = await ReservePlayerAPI.kickPlayer(lobby.id, targetUserId)
      toast({
        title: "✅ Player Kicked",
        description: result.message || `${playerName} removed. ${result.reserveCount} reserves notified.`,
      })
      onRefresh?.()
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.response?.data?.message || err.message || "Could not kick player.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleAssignReserve = async () => {
    if (!selectedReserve) {
      toast({ title: "Missing Selection", description: "Select a reserve player first.", variant: "destructive" })
      return
    }
    const key = `assign-${selectedReserve}`
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      const result = await ReservePlayerAPI.assignReserve(lobby.id, selectedReserve)
      toast({
        title: "✅ Reserve Assigned",
        description: result.message || "Reserve player has been assigned to the lobby.",
      })
      setSelectedReserve("")
      onRefresh?.()
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.response?.data?.message || err.message || "Could not assign reserve.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleForceStart = async () => {
    const key = "force-start"
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      await api.post('/dev/automation/auto-start', { type: 'tournament', lobbyId: lobby.id })
      toast({ title: "✅ Lobby Force Started", description: `${lobby.name} is now PLAYING.` })
      onRefresh?.()
    } catch (err: any) {
      toast({
        title: "Force Start Failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Lobby Intervention — {lobby.name || `Lobby ${lobby.id?.slice(-6)}`}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-[10px] ${STATE_COLORS[lobby.state] || ''}`}>
              {lobby.state}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {participants.length}/{lobbySize} players
              {hasVacancy && <span className="text-amber-400 ml-1">· {lobbySize - participants.length} slots open</span>}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* ── PARTICIPANTS SECTION ── */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Crown className="h-3 w-3 text-blue-400" />
            Participants ({participants.length})
          </h4>
          {participants.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No participants in this lobby.</p>
          ) : (
            <div className="space-y-1">
              {participants.map((userId: string, i: number) => {
                const name = resolvePlayerName(userId)
                return (
                  <div key={userId} className="flex items-center justify-between rounded-md px-3 py-2 bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium truncate">{name}</span>
                    </div>
                    {isManageable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-colors shrink-0"
                        disabled={actionLoading[`kick-${userId}`]}
                        onClick={() => handleKickPlayer(userId)}
                      >
                        {actionLoading[`kick-${userId}`]
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <UserMinus className="h-3 w-3" />
                        }
                        Kick
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* ── RESERVE QUEUE SECTION ── */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-amber-400" />
            Reserve Queue ({waitingReserves.length})
          </h4>
          {waitingReserves.length === 0 ? (
            <div className="text-center py-3 text-muted-foreground">
              <UserPlus className="h-6 w-6 mx-auto mb-1 opacity-30" />
              <p className="text-xs">No reserve players available.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {waitingReserves.map((r: any, i: number) => (
                <div key={r.userId || r.id} className="flex items-center justify-between rounded-md px-3 py-2 bg-amber-500/[0.03] border border-amber-500/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {r.user?.riotGameName || r.user?.username || r.userId?.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.user?.rank || 'Unranked'} · {r.paid ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assign control — show when lobby can accept and reserves exist */}
          {isManageable && waitingReserves.length > 0 && hasVacancy && (
            <div className="flex gap-2 mt-2">
              <Select value={selectedReserve} onValueChange={setSelectedReserve}>
                <SelectTrigger className="bg-black/20 flex-1 h-8 text-xs">
                  <SelectValue placeholder="Select reserve player..." />
                </SelectTrigger>
                <SelectContent>
                  {waitingReserves.map((r: any) => (
                    <SelectItem key={r.userId} value={r.userId}>
                      {r.user?.riotGameName || r.user?.username || r.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignReserve}
                disabled={!selectedReserve || actionLoading[`assign-${selectedReserve}`]}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 h-8 text-xs gap-1 shrink-0"
              >
                {actionLoading[`assign-${selectedReserve}`]
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <UserPlus className="h-3 w-3" />
                }
                Assign
              </Button>
            </div>
          )}

          {/* Not manageable info */}
          {!isManageable && (
            <div className="flex items-center gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400 text-[11px]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Lobby is in <strong>{lobby.state}</strong> state — player management is disabled.</span>
            </div>
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* ── QUICK ACTIONS ── */}
        {showRoundControl && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-emerald-400" />
              Quick Actions
            </h4>
            <div className="flex flex-wrap gap-2">
              {isManageable && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading['force-start']}
                  onClick={handleForceStart}
                  className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300 gap-1.5 h-8 text-xs"
                >
                  {actionLoading['force-start']
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Play className="h-3.5 w-3.5" />
                  }
                  Force Start Lobby
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
