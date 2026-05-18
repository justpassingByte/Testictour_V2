"use client";

import { useEffect, useState } from "react";
import { Award, ChevronRight, Coins, Gift } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";


import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { usePlayerStore } from "@/app/stores/playerStore";
import { useUserStore } from "@/app/stores/userStore";
import api from "@/app/lib/apiConfig";

import { PlayerTournamentList } from "./player-tournament-list";
import { PlayerMatchHistoryTable } from "./player-match-history-table";
import { PlayerStatisticsDisplay } from "./player-statistics-display";
import { PlayerSummaryCard } from "./player-summary-card";
import { PlayerUpcomingMatchesCard } from "./player-upcoming-matches-card";
import { PlayerHeader } from "./player-header";
import { useTranslations } from "next-intl";

interface RedeemedReward {
  id: string;
  rewardId: string;
  redeemedAt: string;
  reward?: {
    title: string;
    description?: string | null;
    type: string;
    value: number;
    currency: string;
    partner?: { username: string };
  };
}

export default function PlayerPage() {
  const t = useTranslations("common");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [isRewardsLoading, setIsRewardsLoading] = useState(false);
  const { currentUser } = useUserStore();
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
      setIsPageLoading(true);
      await Promise.all([
        fetchPlayer(playerId),
        fetchPlayerTournaments(playerId),
        fetchPlayerMatchesSummary(playerId)
      ]);
      setIsPageLoading(false);
    };

    if (playerId) {
      loadPlayerData();
    }
  }, [playerId, fetchPlayer, fetchPlayerTournaments, fetchPlayerMatchesSummary]);

  useEffect(() => {
    const loadRedeemedRewards = async () => {
      if (!currentUser?.id || currentUser.id !== playerId) {
        setRedeemedRewards([]);
        return;
      }

      setIsRewardsLoading(true);
      try {
        const res = await api.get("/partner/rewards/redemptions/me");
        setRedeemedRewards(res.data?.data || []);
      } catch {
        setRedeemedRewards([]);
      } finally {
        setIsRewardsLoading(false);
      }
    };

    loadRedeemedRewards();
  }, [currentUser?.id, playerId]);

  // Real-time: listen for profile/tournament updates via Socket.IO
  useEffect(() => {
    if (!playerId) return;

    const { io } = require('socket.io-client');
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    const refreshAll = () => {
      fetchPlayer(playerId);
      fetchPlayerTournaments(playerId);
      fetchPlayerMatchesSummary(playerId);
    };

    socket.on('player_profile_update', (data?: any) => {
      // If the event targets a specific user, only refresh if it matches
      if (!data?.userId || data.userId === playerId) {
        refreshAll();
      }
    });

    socket.on('tournaments_refresh', () => {
      refreshAll();
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // Helper for last active date (assuming playerMatches are sorted by date desc)
  const lastActiveDate = playerMatches.length > 0
    ? new Date(Math.max(...playerMatches.map(m => new Date(m.playedAt).getTime()))).toLocaleDateString()
    : "N/A";

  if (isLoading || isPageLoading) {
  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">{t("home")}</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/players">{t("players")}</Link>
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
          <Link href="/">{t("home")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/players">{t("players")}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Error</span>
          </div>

        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">{t("error_loading_player")}</h2>
              <p className="text-muted-foreground">{error}</p>
              <Link href="/players" className="mt-6 block">
                <Button>{t("back_to_players")}</Button>
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
          <Link href="/">{t("home")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/players">{t("players")}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{t("player_not_found")}</span>
          </div>

        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">{t("player_not_found")}</h2>
              <p className="text-muted-foreground">{t("player_not_found_desc")}</p>
              <Link href="/players" className="mt-6 block">
                <Button>{t("back_to_players")}</Button>
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
        <Link href="/">{t("home")}</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/players">{t("players")}</Link>
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
            userId={player.user?.id}
          />

          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <Tabs defaultValue="tournaments" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="tournaments">{t("tournaments")}</TabsTrigger>
                  <TabsTrigger value="matches">{t("match_history")}</TabsTrigger>
                  <TabsTrigger value="stats">{t("statistics")}</TabsTrigger>
                  <TabsTrigger value="achievements">{t("achievements")}</TabsTrigger>
                </TabsList>

                <TabsContent value="tournaments" className="mt-6">
                  <h2 className="text-2xl font-bold mb-4">{t("tournament_participation")}</h2>
                  <PlayerTournamentList tournaments={playerTournaments} />
                </TabsContent>

                <TabsContent value="matches" className="mt-6">
                  <PlayerMatchHistoryTable matches={playerMatches} />
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <PlayerStatisticsDisplay stats={stats} playerMatches={playerMatches} />
                </TabsContent>

                <TabsContent value="achievements" className="mt-6">
                  <h2 className="text-2xl font-bold mb-4">{t("achievements")}</h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-white/5">
                      <Award className="mx-auto mb-4 h-10 w-10 opacity-60" />
                      <p>{t("achievements_dev_desc")}</p>
                      <p className="text-sm">{t("achievements_dev_subdesc")}</p>
                    </div>

                    <div className="bg-card/30 rounded-lg border border-white/5 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Reward đã quy đổi</h3>
                          <p className="text-sm text-muted-foreground">Các phần quà đã đổi bằng Flex coin.</p>
                        </div>
                        <Badge variant="outline">{redeemedRewards.length}</Badge>
                      </div>

                      {isRewardsLoading ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">Đang tải reward...</div>
                      ) : redeemedRewards.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          <Gift className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          Chưa có reward nào được quy đổi.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {redeemedRewards.map((item) => (
                            <div key={item.id} className="rounded-md border border-white/10 bg-background/40 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">{item.reward?.title || "Reward"}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(item.redeemedAt).toLocaleDateString()}
                                    {item.reward?.partner?.username ? ` - ${item.reward.partner.username}` : ""}
                                  </div>
                                </div>
                                <Badge className="shrink-0 bg-amber-500/10 text-amber-500 border-amber-500/30" variant="outline">
                                  <Coins className="mr-1 h-3 w-3" />
                                  {item.reward?.value?.toLocaleString?.() || 0}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
            flexCoins={player.user?.balance?.coins}
          />
          <PlayerUpcomingMatchesCard playerId={player.user?.id || player.id || playerId} />
        </div>
      </div>
    </div>
  );
}
