"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Sword, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend, LineChart, Line } from 'recharts';
import api from '@/app/lib/apiConfig';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from "next-intl";
import { useQuery } from '@tanstack/react-query';
import { ALL_SUB_REGIONS } from "@/app/config/regions";
import { StatisticsTabSkeleton } from './TabSkeletons';

const getUnitImgUrl = (name: string, payload?: any) => {
  if (payload?.iconUrl) return payload.iconUrl;
  const cleanName = name.toLowerCase().replace(/['\s.]/g, '');
  return `https://raw.communitydragon.org/latest/game/assets/characters/${cleanName}/hud/${cleanName}_square.png`;
};

const getTraitImgUrl = (name: string, payload?: any) => {
  if (payload?.iconUrl) return payload.iconUrl;
  const cleanName = name.toLowerCase().replace(/['\s.]/g, '').replace('tft16_', '16_').replace('set16_', '16_').replace('tft14_', '14_').replace('set14_', '14_').replace('tft13_', '13_').replace('set13_', '13_');
  return `https://raw.communitydragon.org/latest/game/assets/traits/trait_icon_${cleanName}.png`;
};

const getSubRegionConfig = (regionStr: string) => {
  return ALL_SUB_REGIONS.find(sr => sr.id.toUpperCase() === regionStr?.toUpperCase());
};

export function TournamentStatisticsTab({ tournamentId, hideGeneralStats = false }: { tournamentId: string, hideGeneralStats?: boolean }) {
  const t = useTranslations("common");

  // ── React Query replaces manual fetch + socket.on listeners ──
  // Socket invalidation is handled by useTournamentSocket at the page level
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['tournament-statistics', tournamentId],
    queryFn: async () => {
      const res = await api.get(`/dev/tournament-statistics/${tournamentId}`);
      if (res.data?.success && res.data?.stats) {
        return res.data.stats;
      }
      return null;
    },
    staleTime: 10000, // 10s — statistics are expensive to compute, don't refetch often
  });

  const CustomUnitTick = (props: any): React.ReactElement => {
    const { x, y, payload } = props;
    const name = payload.value;
    const unitName = name.split('_').pop() || name;
    const dataPoint = stats?.topUnits?.find((u: any) => u.name === name);
    const imgUrl = getUnitImgUrl(unitName, dataPoint);
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-110} y={-12} width={110} height={24}>
          <div className="flex items-center justify-end w-full h-full gap-2 pr-2">
            <span className="text-[11px] text-white/90 truncate max-w-[70px] drop-shadow-md">{unitName}</span>
            <img 
              src={imgUrl} 
              className="h-6 w-6 rounded-full border border-primary/20 object-cover shadow-sm bg-black/40" 
              onError={(e) => { 
                e.currentTarget.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/tft_item_empty_transparent.png'; 
                e.currentTarget.className = "h-6 w-6 rounded-full border border-white/5 bg-slate-800 opacity-50";
              }} 
              alt={unitName} 
            />
          </div>
        </foreignObject>
      </g>
    );
  };

  const renderCustomizedTraitLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, payload } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const imgUrl = getTraitImgUrl(payload.name, payload);
    
    return (
      <g>
        <image 
          href={imgUrl} 
          x={x - 8} 
          y={y - 8} 
          height="16" 
          width="16" 
          style={{ filter: 'invert(1) opacity(0.9) drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} 
        />
      </g>
    );
  };

  if (statsLoading) {
    return <StatisticsTabSkeleton />;
  }

  if (!stats) {
    return (
      <Card className="bg-gradient-to-br from-card/60 to-muted/20 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skeleton-shimmer" />
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground relative z-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
            <PieChartIcon className="h-8 w-8 text-primary/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground/80">{t("no_data_available_yet")}</h3>
          <p className="max-w-md text-center">{t("matches_need_to_be_played_in_this_tourna_desc")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUMMARY TOP CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Người Chơi */}
        <Card className="bg-card/40 backdrop-blur-md border border-primary/10 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-4 pt-5">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-full">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{t("players") || "NGƯỜI CHƠI"}</p>
                <p className="text-3xl font-extrabold font-mono tracking-tighter text-white">{stats.summary?.totalPlayers || 0}</p>
                <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider pt-2">
                   <Badge variant="outline" className="text-emerald-400 bg-emerald-500/10 border-emerald-500/20">{stats.summary?.activePlayers || 0} {t("active") || "tiếp"}</Badge>
                   <Badge variant="outline" className="text-red-400 bg-red-500/10 border-red-500/20">{stats.summary?.eliminatedPlayers || 0} {t("eliminated") || "loại"}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Điểm Trung Bình */}
        <Card className="bg-card/40 backdrop-blur-md border border-primary/10 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-4 pt-5">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-full">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{t("avg_score") || "ĐIỂM TRUNG BÌNH"}</p>
                <p className="text-3xl font-extrabold font-mono tracking-tighter text-white">{stats.summary?.avgScore || 0}</p>
                <div className="text-[11px] text-muted-foreground pt-2">
                   <span className="font-semibold text-white/70">{stats.summary?.totalScoreAll || 0}</span> {t("total_points") || "tổng điểm"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Điểm Cao Nhất */}
        <Card className="bg-card/40 backdrop-blur-md border border-primary/10 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-4 pt-5">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-full">
                <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest">{t("highest_score") || "ĐIỂM CAO NHẤT"}</p>
                <p className="text-3xl font-extrabold font-mono tracking-tighter text-white">{stats.summary?.highestScore || 0}</p>
                <div className="text-[11px] text-muted-foreground pt-2">
                   {stats.summary?.highestScorePlayer || "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Khu Vực */}
        <Card className="bg-card/40 backdrop-blur-md border border-primary/10 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-4 pt-5">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-full">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">{t("region") || "KHU VỰC"}</p>
                <p className="text-3xl font-extrabold font-mono tracking-tighter text-white">{stats.summary?.totalRegions || 0}</p>
                <div className="text-[11px] text-muted-foreground pt-2">
                   <span className="font-semibold text-white/70">{getSubRegionConfig(stats.summary?.bestRegionName)?.name || stats.summary?.bestRegionName || "N/A"}</span> {t("leading") || "dẫn đầu"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.topUnits.length === 0 && stats.topTraits.length === 0 ? (
        <Card className="bg-card/40 border border-white/5 shadow-md mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PieChartIcon className="h-10 w-10 opacity-30 mb-4" />
            <p>{t("matches_need_to_be_played_in_this_tourna_desc")}</p>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* MIDDLE CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Placement Density */}
        <Card className="bg-card/40 backdrop-blur-md border border-white/5 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm text-blue-300 mb-1 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" /> Hiệu suất thứ hạng (Top Users)
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Mật độ đạt được các thứ hạng của những người chơi xuất sắc nhất</p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.playerPerformance || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                   <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => Math.floor(val).toString()} />
                   <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255,255,255,0.1)' }} />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                   <Bar dataKey="Top 1" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="Top 2" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="Top 3" stackId="a" fill="#b45309" radius={[0, 0, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="Top 4" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="Bot 4" stackId="a" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* EV Trajectory Chart */}
        <Card className="bg-card/40 backdrop-blur-md border border-white/5 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm text-emerald-300 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Điểm số kỳ vọng (EV Chart)
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Tiến trình tích lũy điểm số của các người chơi xuất sắc nhất qua từng ván</p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.playerTrajectories || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                   <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => Math.floor(val).toString()} />
                   <RechartsTooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255,255,255,0.1)' }} />
                   <Legend iconType="plainline" wrapperStyle={{ fontSize: '10px' }} />
                   <Line type="monotone" name={stats.playerPerformance?.[0]?.name || "Player 1"} dataKey="p0" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: '#eab308' }} activeDot={{ r: 4 }} />
                   <Line type="monotone" name={stats.playerPerformance?.[1]?.name || "Player 2"} dataKey="p1" stroke="#94a3b8" strokeWidth={2} dot={{ r: 2, fill: '#94a3b8' }} activeDot={{ r: 4 }} />
                   <Line type="monotone" name={stats.playerPerformance?.[2]?.name || "Player 3"} dataKey="p2" stroke="#b45309" strokeWidth={2} dot={{ r: 2, fill: '#b45309' }} activeDot={{ r: 4 }} />
                   <Line type="monotone" name={stats.playerPerformance?.[3]?.name || "Player 4"} dataKey="p3" stroke="#10b981" strokeWidth={2} dot={{ r: 2, fill: '#10b981' }} activeDot={{ r: 4 }} />
                   <Line type="monotone" name={stats.playerPerformance?.[4]?.name || "Player 5"} dataKey="p4" stroke="#475569" strokeWidth={2} dot={{ r: 2, fill: '#475569' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REGION PERFORMANCE (FULL WIDTH) */}
      {stats.regionStats && stats.regionStats.length > 0 && (
        <Card className="bg-card/40 backdrop-blur-md border border-white/5 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm text-purple-300 mb-1 flex items-center gap-2">
              <Sword className="w-4 h-4" /> Hiệu suất khu vực
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Điểm trung bình và tỷ lệ đi tiếp theo khu vực</p>
            <div className="space-y-4">
              {stats.regionStats.slice(0, 3).map((r: any, idx: number) => {
                const config = getSubRegionConfig(r.region);
                return (
                <div key={idx} className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 text-xs">
                        {config?.flag || "🌐"}
                      </div>
                      <span className="font-bold text-white">{config?.name || r.region}</span>
                      <span className="text-muted-foreground">{r.players} {t("players")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{r.avgScore} {t("avg_pts")}</span>
                      <Badge variant="outline" className="text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-[10px]">{r.advanced}/{r.players} {t("adv") || "tiếp"}</Badge>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (r.avgScore / (stats.summary?.highestScore || 10)) * 100)}%` }} />
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOTTOM WIDGETS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-md border border-white/5 shadow-sm lg:col-span-2 overflow-hidden relative group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-50" />
          <CardHeader className="bg-black/20 pb-4 border-b border-primary/10">
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-primary" />{t("most_played_units")}
            </CardTitle>
        </CardHeader>
        <CardContent className="h-[340px] w-full pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topUnits} layout="vertical" margin={{ top: 0, right: 30, left: 70, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(val) => `${val}`} />
              <YAxis type="category" dataKey="name" width={110} tick={<CustomUnitTick />} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                formatter={(value: any, name: any, props: any) => [`${value} picks (${props.payload.winrate}% Win Rate)`, 'Usage']}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
                {stats.topUnits.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${0.6 + (0.4 * (stats.topUnits.length - index) / stats.topUnits.length)})`} className="transition-all duration-300 hover:opacity-80" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-xl border-emerald-500/20 shadow-xl overflow-hidden relative group transition-all duration-500 hover:shadow-emerald-500/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/30 via-emerald-500 to-emerald-500/30 opacity-50" />
        <CardHeader className="bg-muted/10 pb-4 border-b border-emerald-500/10">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sword className="h-5 w-5 text-emerald-400" />{t("popular_traits")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px] w-full p-4 flex flex-col">
          <div className="flex-1 flex gap-2 relative h-full min-h-0">
            <div className="w-[50%] relative h-full flex justify-center items-center">
              <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full" />
              <ResponsiveContainer width="100%" height="90%">
                <RechartsPieChart>
                  <Pie
                    data={stats.topTraits.map((t: any) => ({ ...t, formattedName: t.formattedName || t.name.replace(/TFT16_|TFT14_|TFT13_|Set16_|Set14_|Set13_/gi, '').replace(/_/g, ' ') }))}
                    cx="50%" 
                    cy="50%" 
                    innerRadius={30} 
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="formattedName"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={2}
                    labelLine={false}
                    label={renderCustomizedTraitLabel}
                  >
                    {stats.topTraits.map((entry: any, index: number) => {
                      const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];
                      return (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="transition-all duration-300 hover:opacity-80" style={{ outline: 'none' }} />
                      );
                    })}
                  </Pie>
                  <RechartsTooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 100, fontSize: '13px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    formatter={(value: any, name: any) => [`${value} matches`, name]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-[50%] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {stats.topTraits.slice(0, 8).map((t: any, index: number) => {
                 const tName = t.formattedName || t.name.replace(/TFT16_|TFT14_|TFT13_|Set16_|Set14_|Set13_/gi, '').replace(/_/g, ' ');
                 const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];
                 const color = COLORS[index % COLORS.length];
                 return (
                   <div key={index} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-lg p-1.5">
                     <div className="h-7 w-7 rounded-md bg-black/50 flex items-center justify-center shrink-0" style={{ border: `1px solid ${color}40`, boxShadow: `0 0 10px ${color}20` }}>
                       <img 
                         src={getTraitImgUrl(t.name, t)}
                         className="h-4 w-4 object-contain brightness-0 invert opacity-90"
                         onError={(e) => { e.currentTarget.style.display = 'none'; }}
                         alt={tName}
                       />
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="text-xs font-semibold truncate text-white">{tName}</p>
                       <p className="text-[10px] text-muted-foreground">{t.count} matches</p>
                     </div>
                     <div className="font-mono text-xs font-bold shrink-0" style={{ color }}>
                       #{index + 1}
                     </div>
                   </div>
                 )
              })}
            </div>
          </div>
          {stats.avgDuration && (
            <div className="mt-4 pt-4 border-t border-emerald-500/10 shrink-0">
              <div className="flex justify-between items-center text-sm bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                <span className="text-emerald-500/80 font-medium">{t("avg_match_duration")}</span>
                <span className="font-mono font-bold text-emerald-400 text-lg">{stats.avgDuration} <span className="text-xs text-muted-foreground font-sans font-normal">{t("min")}</span></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </>
      )}
    </div>
  );
}
