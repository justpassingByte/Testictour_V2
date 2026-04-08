"use client"

import { useEffect, useState, Suspense, lazy } from "react"
import Link from "next/link"
import { ChevronRight, Loader2, CheckCircle2, Circle, Timer, Users, AlertTriangle, Wifi, WifiOff, Clock, ShieldAlert, Play } from "lucide-react"
import { useParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { useMiniTourLobbyStore } from '@/app/stores/miniTourLobbyStore';
import type { MiniTourLobby } from '@/app/stores/miniTourLobbyStore';
import { LobbyHeader } from "./components/LobbyHeader";
import { LobbyOverviewTab } from "./components/LobbyOverviewTab";
import { LobbyActionCard } from "./components/LobbyActionCard";
import { LobbyQuickStatsCard } from "./components/LobbyQuickStatsCard";
import { useLobbyActions } from "./hooks/useLobbyActions";
import { getThemeStyle } from "./utils";
import { useUserStore } from "@/app/stores/userStore";
import { useLobbySocket } from "@/app/hooks/useLobbySocket";
import { LobbyState } from "@/app/types/tournament";

// ── Countdown Timer ───────────────────────────────────────────────────────────
function useCountdown(phaseStartedAt: string | undefined, durationSeconds: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!phaseStartedAt || !durationSeconds) return;
    const tick = () => {
      const endsAt = new Date(phaseStartedAt).getTime() + durationSeconds * 1000;
      setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt, durationSeconds]);

  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}


// ── State colors ──────────────────────────────────────────────────────────────
const STATE_CONFIG: Record<LobbyState, { label: string; color: string; pulse?: boolean }> = {
  WAITING:            { label: 'Waiting for players',  color: 'text-muted-foreground' },
  READY_CHECK:        { label: 'Ready Check',          color: 'text-yellow-400', pulse: true },
  GRACE_PERIOD:       { label: 'Grace Period',         color: 'text-orange-400', pulse: true },
  STARTING:           { label: 'Match Starting!',      color: 'text-green-400', pulse: true },
  PLAYING:            { label: 'Match in Progress',    color: 'text-primary', pulse: true },
  FINISHED:           { label: 'Match Finished',       color: 'text-green-600' },
  PAUSED:             { label: 'Paused',               color: 'text-orange-400' },
  ADMIN_INTERVENTION: { label: 'Admin Intervention',   color: 'text-red-400', pulse: true },
};

// ── Ready Check Panel ─────────────────────────────────────────────────────────
function ReadyPanel({ lobbyId, userId, tournamentId }: { lobbyId: string; userId?: string; tournamentId?: string }) {
  const { state, isConnected, error, toggleReady, requestDelay, isReadyToggling } = useLobbySocket({
    lobbyId,
    userId,
    tournamentId,
  });

  const timeLeft = useCountdown(state?.phaseStartedAt, state?.remainingDurationOnPause ?? state?.phaseDuration ?? 0);
  const isReady = state && userId ? state.readyPlayerIds.includes(userId) : false;
  const hasUsedDelay = state?.delayRequests.some(d => d.userId === userId) ?? false;
  const canDelay = !hasUsedDelay && (state?.totalDelaysUsed ?? 0) < 3;
  const sc = state ? STATE_CONFIG[state.state] : null;

  if (!state) return null;

  const isActive = !['WAITING', 'FINISHED'].includes(state.state);

  return (
    <Card className={`border transition-all ${isActive ? 'border-primary/40 bg-primary/5' : 'border-white/10'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Lobby Status
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isConnected
              ? <><Wifi className="h-3.5 w-3.5 text-green-400" /><span className="text-xs text-green-400">Live</span></>
              : <><WifiOff className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-red-400">Reconnecting</span></>
            }
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* State label */}
        <div className={`text-lg font-bold ${sc?.color} ${sc?.pulse ? 'animate-pulse' : ''}`}>
          {sc?.label}
        </div>

        {/* Countdown */}
        {isActive && state.phaseDuration > 0 && (
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xl font-bold tabular-nums">{timeLeft}</span>
          </div>
        )}

        {/* Ready bar */}
        {(state.state === 'READY_CHECK' || state.state === 'GRACE_PERIOD') && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Ready</span>
              <span>{state.readyCount}/{state.lobbySize}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${(state.readyCount / state.lobbySize) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {/* STARTING alert */}
        {state.state === 'STARTING' && (
          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded px-3 py-2 animate-pulse text-sm font-medium">
            <Play className="h-4 w-4" />
            Get into the game — match is starting!
          </div>
        )}

        {/* ADMIN */}
        {state.state === 'ADMIN_INTERVENTION' && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-sm">
            <ShieldAlert className="h-4 w-4" />
            Admin reviewing this lobby.
          </div>
        )}

        {/* Actions — only in READY_CHECK */}
        {userId && state.state === 'READY_CHECK' && (
          <div className="space-y-2 pt-1">
            <Button
              id="minitour-ready-btn"
              className={`w-full gap-2 ${isReady ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={toggleReady}
              disabled={isReadyToggling}
            >
              {isReady
                ? <><CheckCircle2 className="h-4 w-4" /> Ready ✓</>
                : <><Circle className="h-4 w-4" /> Click to Ready Up</>}
            </Button>
            {canDelay && (
              <Button
                id="minitour-delay-btn"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={requestDelay}
              >
                <Clock className="h-3.5 w-3.5" />
                Request +60s ({3 - (state.totalDelaysUsed ?? 0)} left)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const LazyLobbyPlayersTab = lazy(() => import('./components/LobbyPlayersTab').then(mod => ({ default: mod.LobbyPlayersTab })));
const LazyLobbyMatchesTab = lazy(() => import('./components/LobbyMatchesTab').then(mod => ({ default: mod.LobbyMatchesTab })));
const LazyLobbyRulesTab = lazy(() => import('./components/LobbyRulesTab').then(mod => ({ default: mod.LobbyRulesTab })));

interface LobbyDetailsClientProps {
  initialLobby: MiniTourLobby | null;
}

export function LobbyDetailsClient({ initialLobby }: LobbyDetailsClientProps) {
  const { lobby, isLoading, error: storeError, isProcessingAction, fetchLobby, joinLobby, startLobby, setLobby, syncAllUnsyncedMatches } = useMiniTourLobbyStore();
  const { currentUser, isLoading: userLoading } = useUserStore();
  const { id } = useParams();

  useEffect(() => {
    if (initialLobby) setLobby(initialLobby);
  }, [initialLobby, setLobby]);

  useEffect(() => {
    if (id && !initialLobby && !lobby) {
      fetchLobby(id as string);
    }
  }, [id, fetchLobby, initialLobby, lobby]);

  const userCoins = 1000;

  const { mainButtonText, mainButtonDisabled, mainButtonAction, secondaryActions } = useLobbyActions({
    lobby,
    isCurrentUserParticipant: !!currentUser && (lobby?.participants || []).some(p => p.userId === currentUser.id),
    isLoading: isLoading || userLoading,
    isProcessingAction,
    userCoins,
    joinLobby,
    startLobby,
    syncAllUnsyncedMatches,
    currentUserId: currentUser?.id || '',
  });

  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading lobby...</p>
      </div>
    );
  }

  if (!lobby) return null;

  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/minitour">MiniTour</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{lobby.name}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <LobbyHeader lobby={lobby} getThemeStyle={getThemeStyle} />

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <LobbyOverviewTab lobby={lobby} />
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading Players...</div>}>
                <LazyLobbyPlayersTab lobby={lobby} />
              </Suspense>
            </TabsContent>

            <TabsContent value="matches" className="space-y-4">
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading Matches...</div>}>
                <LazyLobbyMatchesTab lobby={lobby} />
              </Suspense>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading Rules...</div>}>
                <LazyLobbyRulesTab lobby={lobby} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {/* Real-time ready-check panel */}
          <ReadyPanel
            lobbyId={lobby.id}
            userId={currentUser?.id}
          />

          {/* Join / coin info card */}
          <LobbyActionCard
            lobby={lobby}
            userCoins={userCoins}
            mainButtonText={mainButtonText}
            mainButtonDisabled={mainButtonDisabled}
            mainButtonAction={mainButtonAction}
            isProcessingAction={isProcessingAction}
            secondaryActions={secondaryActions}
          />

          <LobbyQuickStatsCard lobby={lobby} />
        </div>
      </div>
    </div>
  );
}