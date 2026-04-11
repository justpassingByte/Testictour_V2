"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Coins, Loader2, Users, Wifi, WifiOff, Timer, ShieldAlert, Play, CheckCircle2, Circle } from "lucide-react"
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { useMiniTourSocket } from "../hooks/useMiniTourSocket";
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import type { SecondaryAction } from "../hooks/useLobbyActions";

export type GameStatus = "WAITING" | "READY_CHECK" | "GRACE_PERIOD" | "STARTING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ADMIN_INTERVENTION";

interface LobbyActionCardProps {
  lobby: MiniTourLobby
  userCoins: number
  mainButtonText: string
  mainButtonDisabled: boolean
  mainButtonAction: (() => Promise<void>) | undefined
  isProcessingAction: boolean
  secondaryActions?: SecondaryAction[]
  currentUserId: string;
}

// ── Countdown Timer ──────────────────────────────────────────────────────────
function useCountdown(phaseStartedAt: string | null, phaseDurationSeconds: number, countUp: boolean = false) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!phaseStartedAt) return;

    const tick = () => {
      const started = new Date(phaseStartedAt).getTime();
      if (countUp) {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setRemaining(Math.max(0, elapsed));
      } else {
        const endsAt = started + phaseDurationSeconds * 1000;
        const rem = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
        setRemaining(rem);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt, phaseDurationSeconds, countUp]);

  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  return { remaining, formatted: `${m}:${s}` };
}

function stateConfig(state: string) {
  const map: Record<string, { label: string; color: string; pulse?: boolean }> = {
    WAITING: { label: 'Waiting for players', color: 'text-muted-foreground' },
    READY_CHECK: { label: 'Ready Check', color: 'text-yellow-400', pulse: true },
    GRACE_PERIOD: { label: 'Grace Period', color: 'text-orange-400', pulse: true },
    STARTING: { label: 'Match Starting!', color: 'text-green-400', pulse: true },
    IN_PROGRESS: { label: 'Match in Progress', color: 'text-primary', pulse: true },
    COMPLETED: { label: 'Match Finished', color: 'text-green-600' },
    CANCELLED: { label: 'Cancelled', color: 'text-red-600' },
    ADMIN_INTERVENTION: { label: 'Admin Intervention', color: 'text-red-400', pulse: true },
  };
  return map[state] ?? { label: state, color: 'text-muted-foreground' };
}

export function LobbyActionCard({
  lobby,
  userCoins,
  mainButtonText,
  mainButtonDisabled,
  mainButtonAction,
  isProcessingAction,
  secondaryActions = [],
  currentUserId
}: LobbyActionCardProps) {
  const { isConnected, toggleReady, isReadyToggling, socketError } = useMiniTourSocket(lobby.id, currentUserId);
  const { readyPlayerIds, phaseDurationMs, phaseStartedAt } = useMiniTourLobbyStore();

  const readyCount = readyPlayerIds.length;
  const isPlaying = lobby.status === 'IN_PROGRESS';
  const { formatted: timeLeft, remaining } = useCountdown(phaseStartedAt, phaseDurationMs, isPlaying);

  const isParticipant = (lobby.participants || []).some(p => p.userId === currentUserId);
  const isReady = readyPlayerIds.includes(currentUserId);
  const sc = stateConfig(lobby.status);

  return (
    <Card className={`border transition-all ${lobby.status !== 'WAITING' && lobby.status !== 'COMPLETED' ? 'border-primary/40 bg-primary/5' : 'border-white/10'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Lobby Live Status
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isConnected
              ? <><Wifi className="h-3.5 w-3.5 text-green-400" /><span className="text-xs text-green-400">Live</span></>
              : <><WifiOff className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-red-400">Reconnecting…</span></>
            }
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Area (Top) */}
        {!isParticipant && lobby.status === 'WAITING' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {lobby.currentPlayers}/{lobby.maxPlayers}
              </div>
              <div className="text-sm text-muted-foreground">Players Joined</div>
              <Progress value={(lobby.currentPlayers / lobby.maxPlayers) * 100} className="mt-2" />
            </div>
            <div className="pt-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Entry Fee:</span>
                <span className="font-medium"><Coins className="inline h-4 w-4 mr-1" />{lobby.entryFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Prize Pool:</span>
                <span className="font-bold"><Coins className="inline h-4 w-4 mr-1" />{lobby.prizePool}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              disabled={mainButtonDisabled || isProcessingAction}
              onClick={mainButtonAction || undefined}
              size="lg"
            >
              {isProcessingAction ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Joining...</>
              ) : mainButtonText}
            </Button>
          </div>
        ) : null}

        {/* Live State Tracker (When Participant or Not Waiting) */}
        {(isParticipant || lobby.status !== 'WAITING') && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className={`text-lg font-bold ${sc?.color} ${sc?.pulse ? 'animate-pulse' : ''}`}>
              {sc?.label}
            </div>

            {/* Countdown */}
            {lobby.status !== 'COMPLETED' && phaseDurationMs > 0 && (
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className={`font-mono text-xl font-bold tabular-nums ${remaining <= 30 ? 'text-red-400' : ''}`}>
                  {timeLeft}
                </span>
              </div>
            )}

            {/* Ready count bar */}
            {['WAITING', 'READY_CHECK', 'GRACE_PERIOD'].includes(lobby.status) && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Ready ({Math.max(6, Math.min(lobby.currentPlayers, lobby.maxPlayers))} required)</span>
                  <span>{readyCount} / {lobby.currentPlayers}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 transition-all duration-500"
                    style={{ width: `${(readyCount / lobby.currentPlayers) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Alert banners */}
            {lobby.status === 'ADMIN_INTERVENTION' && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-sm">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                Admin reviewing lobby.
              </div>
            )}
            {lobby.status === 'STARTING' && (
              <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded px-3 py-2 animate-pulse text-sm font-medium">
                <Play className="h-4 w-4 flex-shrink-0" />
                Match is starting! Do not close.
              </div>
            )}

            {/* Ready Action (Only for Participants) */}
            {isParticipant && ['WAITING', 'READY_CHECK', 'GRACE_PERIOD'].includes(lobby.status) && (
              <div className="space-y-2 pt-2">
                <Button
                  id="minitour-ready-btn"
                  className={`w-full gap-2 transition-all ${isReady ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={toggleReady}
                  disabled={isReadyToggling}
                >
                  {isReady ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  {isReadyToggling ? 'Updating…' : isReady ? 'Waiting for others...' : 'Click to Ready Up'}
                </Button>
              </div>
            )}

            {/* Show other actions normally (like Leave Lobby) */}
            {isParticipant && lobby.status === 'WAITING' && secondaryActions.length > 0 && (
              <div className="pt-2 space-y-2">
                {secondaryActions.map(action => (
                  <Button
                    key={action.id}
                    className="w-full"
                    variant={action.variant || "secondary"}
                    disabled={action.disabled || action.isLoading}
                    onClick={action.action}
                    size="sm"
                  >
                    {action.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Player Ready List */}
        {(lobby.status === 'READY_CHECK' || lobby.status === 'GRACE_PERIOD' || lobby.status === 'STARTING') && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
            <h4 className="text-xs text-muted-foreground mb-2">Players Status</h4>
            {lobby.participants?.map((p: any) => {
              const rid = p.userId;
              const ready = readyPlayerIds.includes(rid);
              return (
                <div key={rid} className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
                  <span className={ready ? 'text-foreground' : 'text-muted-foreground'}>{p.user?.username || p.user?.riotGameName || 'Player'}</span>
                  {ready ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground opacity-50" />}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}  