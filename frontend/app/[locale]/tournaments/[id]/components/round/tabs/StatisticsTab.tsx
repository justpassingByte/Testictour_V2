"use client"

import { PlayerRoundStats } from "@/app/types/tournament"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Target, Globe, Trophy } from "lucide-react"
import { useTranslations } from "next-intl"

interface StatisticsTabProps {
  allPlayers: PlayerRoundStats[]
}

// Tiny bar-chart identical to the admin dashboard MiniBar style
function MiniBar({ data, labels, color, maxOverride }: { data: number[]; labels: string[]; color: string; maxOverride?: number }) {
  const max = maxOverride ?? Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end items-center gap-0.5 group h-full">
          <span className="text-[8px] font-medium opacity-0 flex-shrink-0 group-hover:opacity-100 transition-opacity" style={{ color }}>{v}</span>
          <div
            className="w-full rounded-t transition-all hover:opacity-90 cursor-default"
            style={{ height: `${Math.max((v / max) * 100, 3)}%`, backgroundColor: color, opacity: 0.65 }}
          />
          <span className="text-[8px] flex-shrink-0 text-muted-foreground truncate max-w-full">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function StatisticsTab({ allPlayers }: StatisticsTabProps) {
  const t = useTranslations("common")
  const playersAdvanced = allPlayers.filter((p) => p.status === "advanced").length
  const playersEliminated = allPlayers.filter((p) => p.status === "eliminated").length
  const totalPointsAwarded = allPlayers.reduce((sum, p) => sum + p.total, 0)
  const avgPoints = allPlayers.length > 0 ? totalPointsAwarded / allPlayers.length : 0

  const highestScorePlayer = allPlayers.length
    ? allPlayers.reduce((max, p) => (p.total > max.total ? p : max), allPlayers[0])
    : null

  // Placement distribution — count how many times each placement 1–8 occurred across all matches
  const placementCounts = Array.from({ length: 8 }, (_, i) => ({
    place: i + 1,
    count: allPlayers.reduce((sum, p) => sum + p.placements.filter(pl => pl === i + 1).length, 0),
  }))

  // Points breakdown per player (top 8) sorted desc
  const topByPoints = [...allPlayers]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Regional performance
  const regionSet = Array.from(new Set(allPlayers.map(p => p.region).filter(r => r && r !== "N/A")))
  const regionStats = regionSet.map(region => {
    const players = allPlayers.filter(p => p.region === region)
    const avg = players.length > 0 ? players.reduce((s, p) => s + p.total, 0) / players.length : 0
    const advanced = players.filter(p => p.status === "advanced").length
    return { region, avg, advanced, total: players.length }
  }).sort((a, b) => b.avg - a.avg)

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">{t("players")}</span>
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{allPlayers.length}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">{playersAdvanced} {t("adv")}</Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">{playersEliminated} {t("out")}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide">{t("avg_points")}</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{avgPoints.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{totalPointsAwarded} {t("pts_total")}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-yellow-600 dark:text-yellow-400 font-semibold uppercase tracking-wide">{t("top_score")}</span>
              <Trophy className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{highestScorePlayer?.total ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{highestScorePlayer?.name ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wide">{t("regions")}</span>
              <Globe className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-2xl font-bold">{regionSet.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{regionStats[0]?.region ?? "—"} {t("leads")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Placement Distribution Chart */}
        <Card className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              {t("placement_distribution")}
            </CardTitle>
            <CardDescription className="text-xs">{t("placement_distribution_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {placementCounts.every(p => p.count === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("no_match_data_yet")}</p>
            ) : (
              <MiniBar
                data={placementCounts.map(p => p.count)}
                labels={placementCounts.map(p => `#${p.place}`)}
                color="#3b82f6"
              />
            )}
          </CardContent>
        </Card>

        {/* Points Leaderboard Bar */}
        <Card className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              {t("points_breakdown")}
            </CardTitle>
            <CardDescription className="text-xs">{t("points_breakdown_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {topByPoints.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("no_points_data_yet")}</p>
            ) : (
              <MiniBar
                data={topByPoints.map(p => p.total)}
                labels={topByPoints.map(p => p.name.split(' ')[0])}
                color="#10b981"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regional Performance */}
      {regionStats.length > 0 && (
        <Card className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-violet-400" />
              {t("regional_performance")}
            </CardTitle>
            <CardDescription className="text-xs">{t("regional_performance_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regionStats.map((r) => {
                const maxAvg = Math.max(...regionStats.map(x => x.avg), 1)
                const advRate = r.total > 0 ? (r.advanced / r.total) * 100 : 0
                return (
                  <div key={r.region} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">{r.region}</Badge>
                        <span className="text-muted-foreground text-xs">{r.total} {t("players")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium">{r.avg.toFixed(1)} {t("avg_pts")}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 ${advRate >= 50 ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'}`}>
                          {r.advanced}/{r.total} {t("adv")}
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
    </div>
  )
}