"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Clock, Medal, Crown, Star, ArrowUpRight } from 'lucide-react';
import api from '@/app/lib/apiConfig';
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function TournamentRecentResultsTab({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("common");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      if (res.data?.leaderboard) {
        setLeaderboard(res.data.leaderboard);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto refresh mechanism
    const handleUpdate = () => fetchLeaderboard();
    window.addEventListener('bracket_update', handleUpdate);
    window.addEventListener('tournament_update', handleUpdate);
    return () => {
      window.removeEventListener('bracket_update', handleUpdate);
      window.removeEventListener('tournament_update', handleUpdate);
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border border-primary/10 h-64 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-80" />
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border border-border/50 shadow-inner p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
          <Clock className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-xl font-medium mb-1">{t("no_match_results_yet") || "No results yet"}</h3>
        <p className="text-muted-foreground text-sm">{t("once_lobbies_finish_playing_their_top_4__desc") || "Once matches are played, the leaderboard will update."}</p>
      </Card>
    );
  }

  const getPlacementIcon = (placement: number) => {
    switch(placement) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500 drop-shadow-md" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300 drop-shadow-md" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700 drop-shadow-md" />;
      default: return null;
    }
  };

  const getPlacementColor = (placement: number) => {
    switch(placement) {
      case 1: return "bg-gradient-to-r from-yellow-500/20 to-transparent border-l-4 border-l-yellow-500";
      case 2: return "bg-gradient-to-r from-gray-400/10 to-transparent border-l-4 border-l-gray-400";
      case 3: return "bg-gradient-to-r from-amber-700/10 to-transparent border-l-4 border-l-amber-700";
      default: return "";
    }
  };

  return (
    <Card className="border shadow-sm bg-card/60 dark:bg-card/40 backdrop-blur-lg border-white/10 animate-fade-in-up">
      <CardHeader className="bg-muted/30 border-b border-border/50 py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-primary" />
          {t("leaderboard_results") || "Tournament Leaderboard"}
        </CardTitle>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shadow-sm">
          {t("live_updating") || "Live Status"} <span className="ml-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/10">
                <TableHead className="w-[80px] text-center">{t("rank") || "Rank"}</TableHead>
                <TableHead className="w-[200px]">{t("player") || "Player"}</TableHead>
                <TableHead className="text-center">{t("region") || "Region"}</TableHead>
                <TableHead className="text-center">{t("top_four_rate") || "Top 4 %"}</TableHead>
                <TableHead className="text-center">{t("first_place_rate") || "Top 1 %"}</TableHead>
                <TableHead className="text-center">{t("matches") || "Matches"}</TableHead>
                <TableHead className="text-center">{t("prize") || "Prize"}</TableHead>
                <TableHead className="text-right">{t("total_points") || "Total Points"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((participant, index) => {
                const rank = index + 1;
                const name = participant.user?.riotGameName || participant.user?.username || participant.inGameName;
                const tag = participant.user?.riotGameTag || participant.gameSpecificId;
                const totalPoints = participant.scoreTotal || 0;
                
                // Determine if there is a reward
                const reward = participant.rewards && participant.rewards.length > 0 ? participant.rewards[0] : null;

                return (
                  <TableRow key={participant.id} className={`group hover:bg-muted/40 transition-colors ${getPlacementColor(rank)}`}>
                    <TableCell className="font-bold text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {getPlacementIcon(rank)}
                        <span className={rank <= 3 ? "text-lg" : "text-base text-muted-foreground"}>{rank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{name}</span>
                        {tag && <span className="text-[10px] text-muted-foreground">#{tag}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {participant.user?.region ? <Badge variant="outline" className="text-xs bg-background/50">{participant.user.region}</Badge> : <span className="text-muted-foreground opacity-50">-</span>}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {participant.user?.topFourRate !== undefined ? `${participant.user.topFourRate}%` : '-'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {participant.user?.firstPlaceRate !== undefined ? `${participant.user.firstPlaceRate}%` : '-'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      <Badge variant="secondary" className="bg-background/50">
                        {participant.matchesPlayed ?? Math.max(Math.floor(totalPoints / 5), 1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {reward ? (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30 transition-all shadow-sm">
                            <Star className="w-3 h-3 mr-1 fill-emerald-500" />
                            ${reward.amount}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-wider text-center max-w-[60px] truncate leading-[10px]">
                            {reward.status === 'projected' ? (t("projected") || "Projected") : (t("awarded") || "Awarded")}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground opacity-50 bg-transparent">TBD</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-end flex-col">
                        <span className="text-xl font-black text-primary drop-shadow-sm flex items-baseline">
                          {totalPoints}
                          <span className="text-[10px] font-semibold text-muted-foreground ml-1 uppercase">pts</span>
                        </span>
                        {rank === 1 && <span className="text-[9px] text-yellow-600 uppercase font-black tracking-widest mt-0.5 max-w-[80px] break-words text-right">{t("tournament_leader") || "Tournament Leader"}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
