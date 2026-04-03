"use client";

import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";


import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { usePlayerStore } from "@/app/stores/playerStore";

import { PlayerTournamentList } from "./player-tournament-list";
import { PlayerMatchHistoryTable } from "./player-match-history-table";
import { PlayerStatisticsDisplay } from "./player-statistics-display";
import { PlayerSummaryCard } from "./player-summary-card";
import { PlayerUpcomingMatchesCard } from "./player-upcoming-matches-card";
import { PlayerHeader } from "./player-header";

export default function PlayerPage() {
  const { 
    player,
    playerTournaments,
    playerMatches,
    stats,
    isLoading,
    error,
    fetchPlayer,
    fetchPlayerTournaments,
    fetchPlayerMatchesSummary,
  } = usePlayerStore();

  const params = useParams();
  const playerId = params.id as string;

  useEffect(() => {
    const loadPlayerData = async () => {
      await fetchPlayer(playerId);
      await fetchPlayerTournaments(playerId);
      await fetchPlayerMatchesSummary(playerId);
    };

    if (playerId) {
      loadPlayerData();
    }
  }, [playerId, fetchPlayer, fetchPlayerTournaments, fetchPlayerMatchesSummary]);

  // Helper for last active date (assuming playerMatches are sorted by date desc)
  const lastActiveDate = playerMatches.length > 0
    ? new Date(Math.max(...playerMatches.map(m => new Date(m.date).getTime()))).toLocaleDateString()
    : "N/A";

  if (isLoading) {
  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/players">Players</Link>
        <ChevronRight className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                <Skeleton className="h-28 w-28 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-10 w-48" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex space-x-4 mb-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <Skeleton className="h-[160px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link href="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/players">Players</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Error</span>
          </div>

        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Error Loading Player</h2>
              <p className="text-muted-foreground">{error}</p>
              <Link href="/players" className="mt-6 block">
                <Button>Back to Players</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link href="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/players">Players</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Player Not Found</span>
          </div>

        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Player Not Found</h2>
              <p className="text-muted-foreground">Could not find player with the provided ID</p>
              <Link href="/players" className="mt-6 block">
                <Button>Back to Players</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/players">Players</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{player.user?.username}</span>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <PlayerHeader
            inGameName={player.inGameName}
            region={player.region}
            username={player.user?.username}
            rank={player.rank}
            level={player.user?.level || 312}
            puuid={player.user?.puuid}
            riotGameTag={player.user?.riotGameTag}
          />

          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <Tabs defaultValue="tournaments" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
                  <TabsTrigger value="matches">Match History</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                </TabsList>

                <TabsContent value="tournaments" className="mt-6">
                  <h2 className="text-2xl font-bold mb-4">Tournament Participation</h2>
                  <PlayerTournamentList tournaments={playerTournaments} />
                </TabsContent>

                <TabsContent value="matches" className="mt-6">
                  <PlayerMatchHistoryTable matches={playerMatches} />
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <PlayerStatisticsDisplay stats={stats} playerMatches={playerMatches} />
                </TabsContent>

                <TabsContent value="achievements" className="mt-6">
                  <h2 className="text-2xl font-bold mb-4">Achievements</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { title: "First Blood", desc: "Win your first tournament", icon: "🏆", unlocked: true, rarity: "Common" },
                      { title: "Top 4 Machine", desc: "Get top 4 in 10 games", icon: "🎯", unlocked: true, rarity: "Common" },
                      { title: "MiniTour Master", desc: "Play 25 MiniTour lobbies", icon: "🎮", unlocked: false, progress: 12, target: 25, rarity: "Rare" },
                      { title: "Social Butterfly", desc: "Refer 3 friends", icon: "👥", unlocked: false, progress: 1, target: 3, rarity: "Rare" },
                      { title: "Diamond Grinder", desc: "Earn 5,000 coins total", icon: "💎", unlocked: false, progress: 1850, target: 5000, rarity: "Epic" },
                      { title: "Untouchable", desc: "Win 5 tournaments with 1st place", icon: "👑", unlocked: false, progress: 2, target: 5, rarity: "Epic" },
                    ].map((ach, idx) => (
                      <Card key={idx} className={`card-hover-effect overflow-hidden ${ach.unlocked ? "bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20" : "opacity-60 hover:opacity-100"}`}>
                        {ach.unlocked && <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />}
                        <CardContent className="pt-5 pb-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${ach.unlocked ? "bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/20" : "bg-muted"}`}>
                              {ach.unlocked ? ach.icon : "🔒"}
                            </div>
                            <h3 className="font-bold text-sm">{ach.title}</h3>
                            <p className="text-xs text-muted-foreground">{ach.desc}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${ach.rarity === "Common" ? "text-gray-400 border-gray-400/30" : ach.rarity === "Rare" ? "text-blue-400 border-blue-400/30" : "text-violet-400 border-violet-400/30"}`}>
                              {ach.rarity}
                            </span>
                            {!ach.unlocked && ach.progress !== undefined && (
                              <div className="w-full">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((ach.progress / (ach.target || 1)) * 100, 100)}%` }} />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{ach.progress}/{ach.target}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PlayerSummaryCard
            tournamentsPlayed={stats.tournamentsPlayed}
            averagePlacement={stats.averagePlacement}
            topFourRate={stats.topFourRate}
            lastActiveDate={lastActiveDate}
            joinedDate={player.user?.createdAt ? new Date(player.user.createdAt).toLocaleDateString() : "N/A"}
            eliminated={player.eliminated}
          />
          <PlayerUpcomingMatchesCard playerTournaments={playerTournaments} />
        </div>
      </div>
    </div>
  );
}
