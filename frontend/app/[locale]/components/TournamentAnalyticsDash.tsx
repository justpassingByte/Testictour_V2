"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Target, Globe, Trophy, Loader2, BarChart2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { TournamentStatisticsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentStatisticsTab"
import { ALL_SUB_REGIONS } from "@/app/config/regions"
import api from "@/app/lib/apiConfig"

interface TournamentAnalyticsDashProps {
  tournamentId: string;
}

export function TournamentAnalyticsDash({ tournamentId }: TournamentAnalyticsDashProps) {
  const t = useTranslations("common")
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/tournaments/${tournamentId}/participants?limit=2500`)
        setParticipants(res.data?.participants || res.data?.data || [])
      } catch (err) {
        console.error("Failed to load analytics participants", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tournamentId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Pre-process Data
  const sortedByPoints = [...participants].sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0))
  const top10ByPoints = sortedByPoints.slice(0, 10).map(p => ({
    name: p.user?.riotGameName || p.user?.username || p.inGameName || "Unknown",
    total: p.scoreTotal || 0,
    topFourRate: p.user?.topFourRate ? Math.round(p.user.topFourRate * 100) : 0,
    firstPlaces: p.user?.firstPlaceRate ? Math.round(p.user.firstPlaceRate * 100) : 0,
  }))

  const playersEliminated = participants.filter((p) => p.eliminated).length
  const playersAdvanced = participants.filter((p) => !p.eliminated).length
  const totalPointsAwarded = participants.reduce((sum, p) => sum + (p.scoreTotal || 0), 0)
  const avgPoints = participants.length > 0 ? totalPointsAwarded / participants.length : 0
  const highestScorePlayer = top10ByPoints[0]

  // Regional performance
  const getSubRegionConfig = (regionStr: string) => {
    return ALL_SUB_REGIONS.find(sr => sr.id.toUpperCase() === regionStr?.toUpperCase());
  };

  const regionSet = Array.from(new Set(participants.map(p => p.region || p.user?.region).filter(r => r && r !== "N/A")))
  const regionStats = regionSet.map(region => {
    const config = getSubRegionConfig(region as string);
    const regionPlayers = participants.filter(p => p.region === region || p.user?.region === region)
    const avg = regionPlayers.length > 0 ? regionPlayers.reduce((s, p) => s + (p.scoreTotal || 0), 0) / regionPlayers.length : 0
    const advanced = regionPlayers.filter(p => !p.eliminated).length
    return {
      id: region as string,
      name: config?.name || region,
      icon: config?.flag || "🌐",
      avg,
      advanced,
      total: regionPlayers.length
    }
  }).sort((a, b) => b.avg - a.avg)

  return (
    <div className="space-y-4">
      {/* 1. KPI Row */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide">{t("players")}</span>
              <Users className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{participants.length}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/20">{playersAdvanced} {t("adv") || "Adv"}</Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20">{playersEliminated} {t("out") || "Out"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wide">{t("avg_points")}</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{avgPoints.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{totalPointsAwarded} {t("pts_total")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-yellow-400 font-semibold uppercase tracking-wide">{t("top_score")}</span>
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{highestScorePlayer?.total ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{highestScorePlayer?.name ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-violet-400 font-semibold uppercase tracking-wide">{t("regions")}</span>
              <Globe className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <p className="text-2xl font-bold">{regionStats.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{regionStats[0]?.name ?? "—"} {t("leads") || "Leads"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 2. Top Players Win Rate Chart */}
        <Card className="bg-card/40 backdrop-blur-lg border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Top Players Win Rate (%)
            </CardTitle>
            <CardDescription className="text-xs">Top 4 frequency among leading players</CardDescription>
          </CardHeader>
          <CardContent>
            {top10ByPoints.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("no_match_data_yet")}</p>
            ) : (
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10ByPoints} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tickFormatter={(val) => val.split(' ')[0]} stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px' }}
                      formatter={(value: any) => [`${value}%`, 'Top 4 Rate']}
                      labelFormatter={(label) => `Player: ${label}`}
                    />
                    <Bar dataKey="topFourRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {top10ByPoints.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.8} className="transition-all duration-300 hover:fill-opacity-100" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Points Leaderboard Bar */}
        <Card className="bg-card/40 backdrop-blur-lg border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              {t("points_breakdown")}
            </CardTitle>
            <CardDescription className="text-xs">Highest total scores across the tournament</CardDescription>
          </CardHeader>
          <CardContent>
            {top10ByPoints.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("no_points_data_yet")}</p>
            ) : (
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10ByPoints} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tickFormatter={(val) => val.split(' ')[0]} stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis dataKey="total" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px' }}
                      formatter={(value: any) => [`${value} Points`, 'Total Score']}
                      labelFormatter={(label) => `Player: ${label}`}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {top10ByPoints.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill="#10b981" fillOpacity={0.8} className="transition-all duration-300 hover:fill-opacity-100" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Regional Performance */}
      {regionStats.length > 0 && (
        <Card className="bg-card/40 backdrop-blur-lg border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-violet-400" />
              {t("regional_performance") || "Regional Performance"}
            </CardTitle>
            <CardDescription className="text-xs">{t("regional_performance_desc") || "Average points and advancement rate by region"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-4">
              {regionStats.map((r) => {
                const maxAvg = Math.max(...regionStats.map(x => x.avg), 1)
                const advRate = r.total > 0 ? (r.advanced / r.total) * 100 : 0
                return (
                  <div key={r.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {r.icon} {r.name}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{r.total} {t("players")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium">{r.avg.toFixed(1)} {t("avg_pts")}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 ${advRate >= 50 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {r.advanced}/{r.total} {t("adv") || "Adv"}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500/60 rounded-full transition-all"
                        style={{ width: `${(r.avg / maxAvg) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Deep Match Analytics (Units & Traits - The Component that was originally here) */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Deep Match Analytics</h3>
        </div>
        <TournamentStatisticsTab tournamentId={tournamentId} />
      </div>
    </div>
  )
}
