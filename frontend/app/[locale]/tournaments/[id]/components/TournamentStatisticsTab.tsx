"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Sword, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie } from 'recharts';
import api from '@/app/lib/apiConfig';
import { useSocket } from '@/components/SocketProvider';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from "next-intl";

const getUnitImgUrl = (name: string, payload?: any) => {
  if (payload?.iconUrl) return payload.iconUrl;
  const cleanName = name.toLowerCase().replace(/['\s.]/g, '');
  return `https://raw.communitydragon.org/latest/game/assets/characters/${cleanName}/hud/${cleanName}_square.png`;
};

const getTraitImgUrl = (name: string, payload?: any) => {
  if (payload?.iconUrl) return payload.iconUrl;
  const cleanName = name.toLowerCase().replace(/['\s.]/g, '').replace('set14_', '14_').replace('set13_', '13_');
  return `https://raw.communitydragon.org/latest/game/assets/traits/trait_icon_${cleanName}.png`;
};

export function TournamentStatisticsTab({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("Common");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const socket = useSocket();

  const fetchStats = async () => {
    try {
      const res = await api.get(`/dev/tournament-statistics/${tournamentId}`);
      if (res.data?.success && res.data?.stats) {
        setStats(res.data.stats);
      } else {
        setStats(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto refresh stats when a match completes (via bracket_update or tournament_update event)
    if (socket) {
      socket.on('bracket_update', fetchStats);
      socket.on('tournament_update', fetchStats);
      
      return () => {
        socket.off('bracket_update', fetchStats);
        socket.off('tournament_update', fetchStats);
      }
    }
  }, [tournamentId, socket]);

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

  if (statsLoading) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border border-primary/10 shadow-2xl h-64 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-80" />
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">{t("loading_live_data")}</p>
      </Card>
    );
  }

  if (!stats || (stats.topUnits.length === 0 && stats.topTraits.length === 0)) {
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-xl border-primary/20 shadow-xl lg:col-span-2 overflow-hidden relative group transition-all duration-500 hover:shadow-primary/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-50" />
        <CardHeader className="bg-muted/10 pb-4 border-b border-primary/10">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />{t("most_played_units")}</CardTitle>
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
                    data={stats.topTraits.map((t: any) => ({ ...t, formattedName: t.formattedName || t.name.replace('Set14_', '').replace('Set13_', '').replace(/_/g, ' ') }))}
                    cx="50%" 
                    cy="50%" 
                    innerRadius={30} 
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="formattedName"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={2}
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
                 const tName = t.formattedName || t.name.replace('Set14_', '').replace('Set13_', '').replace(/_/g, ' ');
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
  );
}
