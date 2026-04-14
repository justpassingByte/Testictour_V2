'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Circle, Clock, AlertTriangle, ChevronRight, ChevronDown, Wifi, WifiOff, Timer, Users, Zap, ShieldAlert, Play, Pause, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLobbySocket } from '@/app/hooks/useLobbySocket';
import { useUserStore } from '@/app/stores/userStore';
import { ILobbyStateSnapshot, LobbyState, IDelayRequest } from '@/app/types/tournament';
import { GrimoireParticipantData, GrimoireTraitData, GrimoireUnitData, GrimoireAugmentData, GrimoireMatchData } from '@/app/types/riot';
import { MatchCompPanel, isGrimoireMatchData } from '@/components/match/MatchCompPanel';

// ── Countdown Timer ──────────────────────────────────────────────────────────
function useCountdown(phaseStartedAt: string | undefined, phaseDurationSeconds: number, countUp: boolean = false) {
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

// ── State Colors / Labels ────────────────────────────────────────────────────
function stateConfig(state: LobbyState) {
  const map: Record<LobbyState, { label: string; color: string; pulse?: boolean }> = {
    WAITING:            { label: 'Waiting for players',   color: 'text-muted-foreground' },
    READY_CHECK:        { label: 'Ready Check',           color: 'text-yellow-400', pulse: true },
    GRACE_PERIOD:       { label: 'Grace Period',          color: 'text-orange-400', pulse: true },
    STARTING:           { label: 'Match Starting!',       color: 'text-green-400', pulse: true },
    PLAYING:            { label: 'Match in Progress',     color: 'text-primary', pulse: true },
    FINISHED:           { label: 'Match Finished',        color: 'text-green-600' },
    PAUSED:             { label: 'Paused',                color: 'text-orange-400' },
    ADMIN_INTERVENTION: { label: 'Admin Intervention',    color: 'text-red-400', pulse: true },
  };
  return map[state] ?? { label: state, color: 'text-muted-foreground' };
}

// ── Trait tier → border color ────────────────────────────────────────────────
const traitStyleBorder: Record<number, string> = {
  0: 'border-zinc-700',
  1: '#895b2e',   // bronze
  2: '#b0b3b8',   // silver
  3: '#e2c42c',   // gold
  4: '#ab47ea',   // prismatic
};

const TRAIT_COLORS = ['border-zinc-700', 'border-amber-800', 'border-slate-400', 'border-yellow-400', 'border-purple-400'];

// ── Star level icons ─────────────────────────────────────────────────────────
function Stars({ tier }: { tier: number }) {
  return (
    <div className="flex gap-px justify-center">
      {Array.from({ length: Math.min(tier, 3) }).map((_, i) => (
        <span
          key={i}
          className={`text-[8px] ${
            tier === 3 ? 'text-yellow-400' : tier === 2 ? 'text-yellow-200' : 'text-zinc-400'
          }`}
        >★</span>
      ))}
    </div>
  );
}

// ── Unit cell ────────────────────────────────────────────────────────────────
function UnitIcon({ unit }: { unit: GrimoireUnitData }) {
  const costBorder = ['border-zinc-500', 'border-zinc-300', 'border-green-400', 'border-blue-400', 'border-purple-500', 'border-yellow-400'];
  const border = costBorder[unit.cost] ?? 'border-zinc-500';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-0.5">
            <div className={`relative w-9 h-9 rounded border-2 ${border} overflow-hidden bg-zinc-800`}>
              {unit.iconUrl
                ? <Image src={unit.iconUrl} alt={unit.name} fill className="object-cover" unoptimized />
                : <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-400">{unit.name.slice(0, 3)}</div>
              }
              {/* Items row overlaid at bottom */}
              {unit.items?.length > 0 && (
                <div className="absolute bottom-0 left-0 flex flex-wrap gap-[1px]">
                  {unit.items.map((item, i) => (
                    <div key={i} className="w-3 h-3 relative bg-zinc-900 rounded-sm overflow-hidden">
                      {item.iconUrl && <Image src={item.iconUrl} alt={item.name} fill className="object-cover" unoptimized />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Stars tier={unit.tier} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[180px]">
          <p className="font-semibold">{unit.name}</p>
          <p className="text-xs text-muted-foreground">{unit.cost}-cost · {unit.tier}★</p>
          {unit.items?.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {unit.items.map((item, i) => <li key={i} className="text-xs">{item.name}</li>)}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Trait icon ───────────────────────────────────────────────────────────────
function TraitIcon({ trait }: { trait: GrimoireTraitData }) {
  const border = TRAIT_COLORS[trait.style] ?? 'border-zinc-700';
  const bg = trait.style >= 3 ? 'bg-yellow-900/30' : trait.style >= 2 ? 'bg-slate-700/30' : trait.style >= 1 ? 'bg-amber-900/20' : 'bg-zinc-800/60';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative w-6 h-6 rounded border ${border} ${bg} overflow-hidden flex-shrink-0`}>
            {trait.iconUrl
              ? <Image src={trait.iconUrl} alt={trait.displayName} fill className="object-contain p-0.5" unoptimized />
              : <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-400">{trait.displayName.slice(0, 2)}</div>
            }
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold">{trait.displayName}</p>
          <p className="text-xs text-muted-foreground">{trait.numUnits} / {trait.tierTotal} active</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Augment icon ─────────────────────────────────────────────────────────────
function AugmentIcon({ augment }: { augment: GrimoireAugmentData }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative w-7 h-7 rounded border border-indigo-400/60 bg-indigo-950/40 overflow-hidden flex-shrink-0">
            {augment.iconUrl
              ? <Image src={augment.iconUrl} alt={augment.name} fill className="object-cover" unoptimized />
              : <div className="w-full h-full flex items-center justify-center text-[7px] text-indigo-300">{augment.name.slice(0, 2)}</div>
            }
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{augment.name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Lobby Page ───────────────────────────────────────────────────────────────

interface LobbyPageClientProps {
  lobbyId: string;
  tournamentId: string;
  initialState: ILobbyStateSnapshot | null;
  lobbyData?: any;
  participantMap: Record<string, string>; // userId → displayName
}

export default function LobbyPageClient({ lobbyId, tournamentId, initialState, lobbyData, participantMap }: LobbyPageClientProps) {
  const { currentUser } = useUserStore();
  const userId = currentUser?.id;
  const router = useRouter();

  const [liveLobbyData, setLiveLobbyData] = useState(lobbyData);

  const { state, isConnected, error, toggleReady, requestDelay, isReadyToggling } = useLobbySocket({
    lobbyId,
    userId,
    tournamentId,
    initialState,
  });

  // Fetch lobby data on WebSocket events (No teardown when state changes)
  useEffect(() => {
    let isSubscribed = true;
    const checkUpdates = async () => {
      try {
        // Fetch fresh lobby data using timestamp to bypass all caches (browser/Next.js) safely without CORS issues
        const lobbyRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/lobbies/${lobbyId}?t=${Date.now()}`);
        const lobbyJson = await lobbyRes.json();
        
        // Ensure we actually got new data before updating
        if (lobbyJson.success && isSubscribed) {
          setLiveLobbyData(lobbyJson.data);
        }
      } catch (e) {
        // Ignore fetch errors
      }
    };

    checkUpdates(); // Initial fetch

    const { io } = require('socket.io-client');
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket.emit('join', { tournamentId, lobbyId });
    });

    socket.on('tournament_update', (data: any) => {
      if (data && data.type === 'lobbies_reshuffled') {
        // When lobbies shuffle, explicitly check for new lobby assignment
        if (!userId) return;
        setTimeout(async () => {
          try {
            const nextLobbyRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/players/${userId}/incoming-matches?t=${Date.now()}`, { credentials: 'include' });
            const json = await nextLobbyRes.json();
            if (json.success && json.data) {
              const match = json.data.find((m: any) => m.tournamentId === tournamentId);
              if (match && match.lobbyId && match.lobbyId !== lobbyId) {
                router.push(`/tournaments/${tournamentId}/lobbies/${match.lobbyId}`);
              } else if (isSubscribed) {
                checkUpdates(); // same lobby, just refresh state
              }
            }
          } catch (e) {}
        }, 500); // Small delay to let DB settle
      } else if (isSubscribed) {
        checkUpdates();
      }
    });

    // Also trigger update on lobby state changes in case tournament_update is missed
    socket.on('lobby:state_update', () => {
      if (isSubscribed) checkUpdates();
    });

    return () => {
      isSubscribed = false;
      socket.disconnect();
    };
  }, [lobbyId, tournamentId]); // Removed state?.state to prevent socket teardown

  // Auto navigate to new lobby if advanced
  useEffect(() => {
    if (userId && state?.state === 'FINISHED') {
      const checkNextLobby = async () => {
        try {
          const nextLobbyRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/players/${userId}/incoming-matches?t=${Date.now()}`, { credentials: 'include' });
          const data = await nextLobbyRes.json();
          if (data.success && data.data) {
            const match = data.data.find((m: any) => m.tournamentId === tournamentId);
            if (match && match.lobbyId && match.lobbyId !== lobbyId) {
              router.push(`/tournaments/${tournamentId}/lobbies/${match.lobbyId}`);
            }
          }
        } catch (e) {}
      };
      
      // Add slight delay to ensure DB commits are finalized before routing
      const timer = setTimeout(checkNextLobby, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.state, userId, tournamentId, lobbyId, router]);

  const isPlaying = state?.state === 'PLAYING';
  const { formatted: timeLeft, remaining } = useCountdown(
    state?.phaseStartedAt,
    state?.remainingDurationOnPause ?? state?.phaseDuration ?? 0,
    isPlaying
  );

  const isReady = state && userId ? state.readyPlayerIds.includes(userId) : false;
  const isParticipant = userId && (liveLobbyData?.participantDetails?.some((p: any) => p.id === userId) || liveLobbyData?.participants?.includes(userId));
  const hasUsedDelay = state?.delayRequests.some(d => d.userId === userId) ?? false;
  const canDelay = isParticipant && !hasUsedDelay && (state?.totalDelaysUsed ?? 0) < 3 && state?.state !== 'FINISHED';
  const sc = state ? stateConfig(state.state) : null;

  return (
    <div className="container min-h-screen py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/tournaments" className="hover:text-foreground">Tournaments</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/tournaments/${tournamentId}`} className="hover:text-foreground">
          {liveLobbyData?.round?.phase?.tournament?.name || 'Tournament'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{liveLobbyData?.name || 'Lobby'}</span>
      </div>

      {state ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content: Header & Tabs */}
          <div className="md:col-span-2 space-y-6">
            {/* Header matching MiniTour Layout */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-card/60 backdrop-blur-lg">
              <div className="absolute inset-0 border-b-2 border-primary/20 pointer-events-none" />
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-primary border-primary/20">
                        {liveLobbyData?.round?.phase?.type || 'Tournament Round'}
                      </Badge>
                      <Badge variant="outline" className="text-muted-foreground">
                        Round {liveLobbyData?.round?.roundNumber || '?'}
                      </Badge>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                      {liveLobbyData?.name || 'Lobby'}
                    </h1>
                    <p className="text-muted-foreground max-w-xl">
                      {liveLobbyData?.round?.phase?.tournament?.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="matches">Match Results</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 pt-4">
                <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
                  <CardHeader>
                    <CardTitle>Lobby Information</CardTitle>
                    <CardDescription>Rules and tournament advancement</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>Tiebreaker rule: Highest Last Placement</p>
                    <p>Ensure you check your connection and are ready before the countdown finishes.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="players" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {liveLobbyData?.participantDetails?.map((p: any) => (
                    <Link key={p.id} href={`/players/${p.id}`}>
                      <Card className="border-white/10 bg-card/60 hover:bg-card/80 transition-colors backdrop-blur-lg cursor-pointer">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border">
                              {p.username?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{p.username}</p>
                              <p className="text-xs text-muted-foreground">{p.riotGameName}#{p.riotGameTag}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {(!liveLobbyData?.participantDetails || liveLobbyData.participantDetails.length === 0) && (
                     <div className="col-span-2 py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                       Waiting for participants to be assigned...
                     </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="matches" className="space-y-4 pt-4">
                <div className="space-y-3">
                  {Array.from({ length: Math.max(liveLobbyData?.round?.phase?.matchesPerRound || 1, liveLobbyData?.matches?.length || 0) }).map((_, idx: number) => {
                    const match = liveLobbyData?.matches?.[idx];
                    const isSynced = match && !!match.fetchedAt && (match.matchResults?.length > 0 || match.miniTourMatchResults?.length > 0);
                    const hasGrimoire = match && isGrimoireMatchData(match.matchData);
                    const key = match?.id || `pending-${idx}`;
                    
                    return (
                      <Collapsible key={key} className="border border-white/10 rounded-xl bg-card/60 backdrop-blur-lg overflow-hidden" defaultOpen={isSynced}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <div className="text-left flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">Match {idx + 1}</Badge>
                            <div>
                              <p className="font-semibold text-sm">Match Results</p>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Status: <Badge variant={isSynced ? 'default' : 'secondary'} className="text-[10px] ml-1">
                                  {isSynced ? 'Completed' : (idx === (liveLobbyData?.completedMatchesCount || 0) && state.state === 'PLAYING' ? 'In Progress' : (idx > (liveLobbyData?.completedMatchesCount || 0) ? 'Scheduled' : 'Pending Start'))}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {match?.matchIdRiotApi && (
                              <Badge variant="outline" className="text-[10px] font-mono opacity-50 hidden sm:inline-flex">
                                Riot ID: {match.matchIdRiotApi}
                              </Badge>
                            )}
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:-rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          {isSynced && hasGrimoire ? (
                            <div className="mt-2 bg-zinc-950/50 rounded-xl overflow-hidden border border-zinc-800">
                              <MatchCompPanel
                                matchData={match.matchData as GrimoireMatchData}
                                resultMap={Object.fromEntries(
                                  (match.matchResults ?? []).map((r: any) => [
                                    r.user?.puuid ?? r.userId,
                                    { placement: r.placement, points: r.points }
                                  ])
                                )}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3 pt-2">
                              {idx > (liveLobbyData?.completedMatchesCount || 0) ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8 bg-muted/10 rounded-xl border border-dashed border-white/5 text-center">
                                  <Timer className="h-10 w-10 text-muted-foreground opacity-30" />
                                  <div>
                                    <p className="text-sm font-semibold text-muted-foreground">Scheduled Match</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-[250px]">
                                      Will begin after previous matches are completed.
                                    </p>
                                  </div>
                                </div>
                              ) : !isSynced && idx === (liveLobbyData?.completedMatchesCount || 0) && ['PLAYING', 'FINISHED'].includes(state.state) ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8 bg-blue-500/5 rounded-xl border border-blue-500/20 text-center">
                                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 opacity-80" />
                                  <div>
                                    <p className="text-sm font-semibold text-blue-400">Waiting for Riot APIs...</p>
                                    <p className="text-xs text-muted-foreground mt-1 text-blue-400/80 max-w-[250px]">
                                      Match {idx + 1} is in progress. Actively polling Riot for completion.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-8 bg-muted/20 rounded-xl border border-dashed border-white/10 text-center">
                                  <Zap className="h-10 w-10 text-blue-400 opacity-40" />
                                  <div>
                                    <p className="text-sm font-semibold text-foreground/80">No details available</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                                      {isSynced && !hasGrimoire 
                                        ? "Results are synced, but full match data is unavailable." 
                                        : (idx === (liveLobbyData?.completedMatchesCount || 0) ? "Match not started yet." : "Match data is currently unavailable.")}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Sidebar Actions & Player List */}
          <div className="md:col-span-1 space-y-4">
            <Card className={`border transition-all ${state.state !== 'WAITING' && state.state !== 'FINISHED' ? 'border-primary/40 bg-primary/5' : 'border-white/10'}`}>
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
              <CardContent className="space-y-3">
                <div className={`text-lg font-bold ${sc?.color} ${sc?.pulse ? 'animate-pulse' : ''}`}>
                  {sc?.label}
                </div>

                {/* Countdown */}
                {state.state !== 'FINISHED' && state.phaseDuration > 0 && (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className={`font-mono text-xl font-bold tabular-nums ${remaining <= 30 ? 'text-red-400' : ''}`}>
                      {timeLeft}
                    </span>
                  </div>
                )}

                {/* Ready count bar */}
                {['WAITING', 'READY_CHECK', 'GRACE_PERIOD'].includes(state.state) && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Ready</span>
                      <span>{state.readyCount} / {state.lobbySize}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 transition-all duration-500"
                        style={{ width: `${(state.readyCount / state.lobbySize) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Delays used */}
                {state.totalDelaysUsed > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Pause className="h-3.5 w-3.5" />
                    Delays used: {state.totalDelaysUsed}/3
                  </div>
                )}

                {/* Alert banners */}
                {state.state === 'ADMIN_INTERVENTION' && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-sm">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    Admin reviewing lobby.
                  </div>
                )}
                {state.state === 'STARTING' && (
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded px-3 py-2 animate-pulse text-sm font-medium">
                    <Play className="h-4 w-4 flex-shrink-0" />
                    Match is starting!
                  </div>
                )}

                {/* Actions */}
                {isParticipant && (
                  <div className="space-y-2 pt-2">
                    {['WAITING', 'READY_CHECK', 'GRACE_PERIOD'].includes(state.state) && (
                      <Button
                        id="lobby-ready-btn"
                        className={`w-full gap-2 transition-all ${isReady ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={toggleReady}
                        disabled={isReadyToggling}
                      >
                        {isReady ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        {isReadyToggling ? 'Updating…' : isReady ? 'Waiting for other players...' : 'Click to Ready Up'}
                      </Button>
                    )}

                    {canDelay && (
                      <Button
                        id="lobby-delay-btn"
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

            {/* Quick Player List */}
            <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                   Quick Ready Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {liveLobbyData?.participantDetails?.map((p: any) => {
                    const rid = p.id;
                    const ready = state.readyPlayerIds.includes(rid);
                    return (
                      <div key={rid} className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
                         <span className={ready ? 'text-foreground' : 'text-muted-foreground'}>{p.username}</span>
                         {ready ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground opacity-30" />}
                      </div>
                    );
                  })}
                  {!liveLobbyData?.participantDetails && state.readyPlayerIds.map((rid) => (
                    <div key={rid} className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
                       <span className="text-foreground">{participantMap[rid] ?? rid.slice(0, 8)}</span>
                       <CheckCircle2 className="h-3 w-3 text-green-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading lobby…
        </div>
      )}
    </div>
  );
}
