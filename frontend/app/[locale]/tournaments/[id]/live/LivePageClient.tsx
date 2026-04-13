"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Clock, Trophy, Activity, LayoutGrid, BarChart3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"
import { useTranslations } from "next-intl"

import { ITournament } from "@/app/types/tournament"
import { TournamentBracketTab } from "@/app/[locale]/tournaments/[id]/components/TournamentBracketTab"
import { TournamentStatisticsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentStatisticsTab"
import { TournamentRecentResultsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentRecentResultsTab"
import { io } from "socket.io-client"
import { useTournamentStore } from "@/app/stores/tournamentStore"
import { useRouter } from "next/navigation"

interface LivePageClientProps {
  tournament: ITournament;
}

export default function LivePageClient({ tournament: initialTournament }: LivePageClientProps) {
  const t = useTranslations("Common");
  const router = useRouter()
  const fetchTournamentDetail = useTournamentStore(state => state.fetchTournamentDetail)
  const currentTournament = useTournamentStore(state => state.currentTournament)
  
  const tournament = currentTournament?.id === initialTournament.id ? currentTournament : initialTournament

  const [activeTab, setActiveTab] = useState("bracket")
  const [duration, setDuration] = useState(0)

  // Socket Connection for Real-time Updates
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    
    socket.on('connect', () => {
      socket.emit('join', { tournamentId: initialTournament.id });
    });
    
    socket.on('tournament_update', () => {
      fetchTournamentDetail(initialTournament.id);
      window.dispatchEvent(new CustomEvent('bracket_update'));
      router.refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchTournamentDetail, initialTournament.id, router]);

  // Duration Timer (Count Up since tournament start, or if not started, 0)
  useEffect(() => {
    if (!tournament.startTime || ['DRAFT', 'UPCOMING', 'REGISTRATION'].includes(tournament.status)) {
      setDuration(0);
      return;
    }

    const startTimestamp = new Date(tournament.startTime).getTime();
    
    const updateTimer = () => {
      let diff = 0;
      if (tournament.status === 'COMPLETED' && tournament.endTime) {
        diff = Math.floor((new Date(tournament.endTime).getTime() - startTimestamp) / 1000);
      } else {
        diff = Math.floor((Date.now() - startTimestamp) / 1000);
      }
      setDuration(Math.max(0, diff));
    };

    updateTimer(); // Initial call
    
    // Only tick if currently in progress
    if (tournament.status === 'in_progress') {
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [tournament.startTime, tournament.endTime, tournament.status]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  const calculatedPrizePool = tournament.budget || (tournament.entryFee * (tournament.registered || 0) * (1 - (tournament.hostFeePercent || 0.1)))
  const liveLobbyCount = tournament.phases?.[0]?.rounds?.flatMap(r => r.lobbies || [])?.filter((l: any) => l.state === 'PLAYING').length ?? 0

  return (
    <div className="container py-8">
      {/* Breadcrumb & Sync */}
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">{t("home")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tournaments" className="hover:text-primary transition-colors">{t("tournaments")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/tournaments/${tournament.id}`} className="hover:text-primary transition-colors">{tournament.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{t("live_updates") || "Live Scoreboard"}</span>
        </div>
        <SyncStatus status={tournament.status === 'in_progress' ? "live" : "idle"} />
      </div>

      <div className="mt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{tournament.name} - {t("live_updates") || "Live"}</h1>
            {tournament.status === 'in_progress' ? (
               <Badge className="bg-red-500/20 text-red-600 dark:text-red-500 animate-pulse border border-red-500/30 flex items-center gap-1.5 px-3 py-1">
                 <div className="h-2 w-2 rounded-full bg-red-500 animate-ping"></div> {t("live")}
               </Badge>
            ) : tournament.status === 'COMPLETED' ? (
               <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 px-3 py-1 text-sm">{t("status_completed") || "Finished"}</Badge>
            ) : (
               <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 text-sm">{t("status_waiting") || "Waiting"}</Badge>
            )}
          </div>
          <p className="text-muted-foreground max-w-3xl">{tournament.description}</p>
        </div>

        {/* Live Status Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
            <CardContent className="pt-6 relative z-10 flex items-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mr-4">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold font-mono tracking-wider text-primary shadow-sm">
                  {formatDuration(duration)}
                </p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">{t("duration") || "Duration"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-sm">
            <CardContent className="pt-6 flex items-center">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mr-4">
                <LayoutGrid className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {liveLobbyCount} <span className="text-lg text-muted-foreground font-normal">/ {tournament.phases?.[0]?.rounds?.flatMap(r => r.lobbies || []).length || 0}</span>
                </p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{t("active_lobbies") || "Active Lobbies"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-sm">
            <CardContent className="pt-6 flex items-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 mr-4">
                <Trophy className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {calculatedPrizePool.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">[{tournament.registered || 0} Players]</span>
                </p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{t("prize_pool") || "Current Prize Pool"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real Content Tabs */}
        <Card className="border border-border/50 shadow-xl overflow-hidden mt-8 bg-card/40 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
              <TabsList className="bg-transparent p-0 h-auto gap-4">
                <TabsTrigger value="bracket" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-primary border border-transparent px-6 py-2.5 rounded-full transition-all text-sm font-medium hover:bg-muted">
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  {t("bracket")} / {t("leaderboard") || "Leaderboard"}
                </TabsTrigger>
                <TabsTrigger value="recent-results" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/50 border border-transparent px-6 py-2.5 rounded-full transition-all text-sm font-medium hover:bg-muted">
                  <Activity className="w-4 h-4 mr-2" />
                  {t("recent_results") || "Recent Results"}
                </TabsTrigger>
                <TabsTrigger value="statistics" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/50 border border-transparent px-6 py-2.5 rounded-full transition-all text-sm font-medium hover:bg-muted">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t("statistics")} 
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="bracket" className="m-0 animate-fade-in-up">
                <TournamentBracketTab tournamentId={tournament.id} />
              </TabsContent>

              <TabsContent value="recent-results" className="m-0 animate-fade-in-up">
                <TournamentRecentResultsTab tournamentId={tournament.id} />
              </TabsContent>

              <TabsContent value="statistics" className="m-0 space-y-4 animate-fade-in-up">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <h3 className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1 flex items-center"><Activity className="w-4 h-4 mr-2"/> {t("live_statistics_stream") || "Live Analytics Feed"}</h3>
                  <p className="text-sm text-emerald-700/70 dark:text-emerald-200/70">
                    {t("stats_update_realtime") || "These statistics compile instantly as each lobby match finishes (Uses aggregated statistics)."}
                  </p>
                </div>
                <TournamentStatisticsTab tournamentId={tournament.id} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
