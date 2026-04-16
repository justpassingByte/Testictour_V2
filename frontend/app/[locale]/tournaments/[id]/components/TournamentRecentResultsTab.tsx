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

import { Copy, TrendingUp, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export function TournamentRecentResultsTab({ tournamentId, tournament }: { tournamentId: string, tournament: any }) {
  const t = useTranslations("common");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      if (res.data?.leaderboard) {
        // Deterministic sorting with tiebreakers on frontend as a safety layer
        const sorted = [...res.data.leaderboard].sort((a, b) => {
          if ((b.scoreTotal || 0) !== (a.scoreTotal || 0)) return (b.scoreTotal || 0) - (a.scoreTotal || 0);
          
          // Secondary tiebreakers (matches similarity with RoundService.tiebreakComparator)
          const placementsA = a.placements || [];
          const placementsB = b.placements || [];
          
          const sumA = placementsA.reduce((s: number, p: any) => s + (Number(p) || 0), 0);
          const sumB = placementsB.reduce((s: number, p: any) => s + (Number(p) || 0), 0);
          if (sumA !== sumB) return sumA - sumB;

          const winsA = placementsA.filter((p: any) => Number(p) === 1).length;
          const winsB = placementsB.filter((p: any) => Number(p) === 1).length;
          if (winsB !== winsA) return winsB - winsA;

          return (a.id || "").localeCompare(b.id || "");
        });
        setLeaderboard(sorted);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    const handleUpdate = () => fetchLeaderboard();
    window.addEventListener('bracket_update', handleUpdate);
    window.addEventListener('tournament_update', handleUpdate);
    window.addEventListener('leaderboard_update', handleUpdate);
    return () => {
      window.removeEventListener('bracket_update', handleUpdate);
      window.removeEventListener('tournament_update', handleUpdate);
      window.removeEventListener('leaderboard_update', handleUpdate);
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
      case 2: return <Medal className="w-5 h-5 text-slate-300 drop-shadow-md" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600 drop-shadow-md" />;
      default: return null;
    }
  };

  const getPlacementColor = (placement: number) => {
    switch(placement) {
      case 1: return "bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-l-yellow-500";
      case 2: return "bg-gradient-to-r from-slate-400/5 to-transparent border-l-4 border-l-slate-400";
      case 3: return "bg-gradient-to-r from-amber-700/5 to-transparent border-l-4 border-l-amber-700";
      default: return "";
    }
  };

  // Podium Logic
  const podium = leaderboard.slice(0, 3);
  const podiumHeights = ['h-28', 'h-20', 'h-16'];
  const podiumColors = ['bg-yellow-500/20 border-yellow-500/40', 'bg-slate-400/20 border-slate-400/40', 'bg-amber-700/20 border-amber-700/40'];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Podium Section ── */}
      <Card className="bg-card/40 backdrop-blur-xl border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Trophy className="w-32 h-32 text-white" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 font-bold tracking-tight">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {t("podium") || "Bục thưởng"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-2 sm:gap-8 pt-6 pb-2">
            {[1, 0, 2].map((idx) => {
              const p = podium[idx];
              if (!p) return <div key={idx} className="w-24" />;
              
              const name = p.user?.riotGameName || p.user?.username || p.inGameName;
              const reward = p.rewards && p.rewards.length > 0 ? p.rewards[0] : null;

              return (
                <div key={p.id} className={`flex flex-col items-center gap-2 ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                  <div className="text-center animate-bounce-subtle">
                    <p className="text-sm font-black text-white drop-shadow-md truncate max-w-[100px]">{name}</p>
                    <p className="text-[10px] font-bold text-primary/80 mt-0.5">{p.scoreTotal || 0} PTS</p>
                    {reward && (
                       <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 mt-1">
                         ${reward.amount}
                       </Badge>
                    )}
                  </div>
                  <div className={`w-20 sm:w-28 ${podiumHeights[idx]} rounded-t-2xl border-2 ${podiumColors[idx]} flex flex-col items-center justify-center relative shadow-2xl backdrop-blur-md`}>
                    <span className="text-3xl sm:text-4xl filter drop-shadow-lg">{medals[idx]}</span>
                    <div className="absolute -bottom-1 w-full h-1 bg-white/10 blur-sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Leaderboard Table ── */}
      <Card className="border shadow-2xl bg-card/40 backdrop-blur-xl border-white/10 overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-white/5 py-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center font-black tracking-tight">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              {t("leaderboard_results") || "Tournament Leaderboard"}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{t("points_aggregate") || "Thống kê điểm số tổng hợp"}</p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm px-3 py-1">
            {t("live_updating") || "Live Updates"} <span className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-white/5 border-white/5">
                  <TableHead className="w-[70px] text-center text-[10px] font-black uppercase tracking-tighter opacity-70">{t("rank") || "Rank"}</TableHead>
                  <TableHead className="w-[200px] text-[10px] font-black uppercase tracking-tighter opacity-70">{t("player") || "Player"}</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-tighter opacity-70">{t("region") || "Region"}</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-tighter opacity-70">{t("performance") || "Performance"}</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-tighter opacity-70">{t("prize") || "Prize"}</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-tighter opacity-70">{t("total_points") || "Points"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((participant, index) => {
                  const rank = index + 1;
                  const name = participant.user?.riotGameName || participant.user?.username || participant.inGameName;
                  const tag = participant.user?.riotGameTag || participant.gameSpecificId;
                  const totalPoints = participant.scoreTotal || 0;
                  const reward = participant.rewards && participant.rewards.length > 0 ? participant.rewards[0] : null;

                  return (
                    <TableRow key={participant.id} className={`group hover:bg-white/5 border-white/5 transition-all duration-300 ${getPlacementColor(rank)}`}>
                      <TableCell className="font-bold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {getPlacementIcon(rank)}
                          <span className={rank <= 3 ? "text-lg font-black" : "text-sm font-medium text-muted-foreground"}>{rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-white truncate max-w-[140px] group-hover:text-primary transition-colors">{name}</span>
                            {tag && <span className="text-[9px] font-medium text-muted-foreground opacity-60">#{tag}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {participant.user?.region ? (
                           <Badge variant="outline" className="text-[10px] bg-black/40 border-white/10 text-white font-medium">
                             {participant.user.region}
                           </Badge>
                        ) : <span className="text-muted-foreground opacity-20">-</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1">
                            {participant.placements?.slice(0, 5).map((p: number, i: number) => (
                              <div key={i} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold ${p === 1 ? 'bg-yellow-500 text-black' : p <= 4 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted/40 text-muted-foreground'}`}>
                                {p}
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-medium opacity-60">
                             Avg: {(participant.placements?.reduce((a: any, b: any) => a + b, 0) / (participant.placements?.length || 1)).toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {reward ? (
                          <div className="flex flex-col items-center">
                            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30 transition-all shadow-lg font-bold text-xs">
                              ${reward.amount.toLocaleString()}
                            </Badge>
                            <span className={`text-[8px] mt-1 uppercase font-black tracking-tighter ${reward.status === 'projected' ? 'text-amber-500/70' : 'text-emerald-500/70'}`}>
                              {reward.status === 'projected' ? (t("projected") || "Dự kiến") : (t("awarded") || "Đã trao")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30 font-bold italic">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-white hover:text-primary transition-colors flex items-baseline leading-none">
                            {totalPoints}
                            <span className="text-[9px] font-bold text-muted-foreground ml-1 uppercase">pts</span>
                          </span>
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
      
      {/* ── Additional Info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white mb-1">{t("tiebreak_rules") || "Quy định Tiebreak"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Thứ tự ưu tiên: 1. Tổng điểm &gt; 2. Tổng hạng (thấp hơn tốt hơn) &gt; 3. Số lần đạt Top 1 &gt; 4. Hạng đơn tốt nhất.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white mb-1">{t("prize_eligibility") || "Điều kiện nhận thưởng"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Giải thưởng được tính dựa trên cơ cấu giải của giải đấu và thứ hạng cuối cùng sau khi đã áp dụng mọi chỉ số phụ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
