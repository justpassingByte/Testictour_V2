"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Handshake, DollarSign, Users, Trophy, Gamepad2, TrendingUp,
  Activity, Crown, ArrowRight, RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"

// ── Types ───────────────────────────────────────────────────────────────────
interface AdminStats {
  totalUsers: number; totalPartners: number; totalPlayers: number;
  totalLobbies: number; totalTournaments: number; activeTournaments: number;
  totalMatches: number; totalRevenue: number; monthlyRevenue: number;
  subscriptionPlans: { FREE: number; PRO: number; ENTERPRISE: number };
  lobbyStatuses: { WAITING: number; IN_PROGRESS: number; COMPLETED: number };
}

interface AnalyticsData {
  months: string[];
  partnerGrowth: number[];
  lobbyGrowth: number[];
  matchActivity: number[];
  topPartners: {
    id: string; username: string; email: string; plan: string;
    totalLobbies: number; activeLobbies: number; revenue: number;
  }[];
  subscriptionBreakdown: {
    FREE: { count: number; revenue: number };
    PRO: { count: number; revenue: number };
    ENTERPRISE: { count: number; revenue: number };
  };
}

// ── Tiny bar chart (no deps) ─────────────────────────────────────────────
function MiniBar({ data, months, color }: { data: number[]; months: string[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div
            className="w-full rounded-t transition-opacity hover:opacity-90 cursor-default"
            style={{ height: `${Math.max((v / max) * 100, 3)}%`, backgroundColor: color, opacity: 0.65 }}
          />
          <span className="text-[8px] text-muted-foreground">{months[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ── Stat card skeleton ───────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <Card className="bg-card/60 border-white/10">
      <CardContent className="p-5">
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-8 w-14 mb-2" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const t = useTranslations("common")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Load stats immediately (fast endpoint)
  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [])

  // Load analytics lazily after stats — doesn't block initial paint
  useEffect(() => {
    const timer = setTimeout(() => {
      api.get('/admin/analytics')
        .then(res => setAnalytics(res.data.data))
        .catch(console.error)
        .finally(() => setAnalyticsLoading(false))
    }, 50) // tiny delay so stats renders first
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = () => {
    setStatsLoading(true)
    setAnalyticsLoading(true)
    setStats(null)
    setAnalytics(null)
    Promise.all([
      api.get('/admin/stats').then(r => setStats(r.data.data)).finally(() => setStatsLoading(false)),
      api.get('/admin/analytics').then(r => setAnalytics(r.data.data)).finally(() => setAnalyticsLoading(false)),
    ])
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("overview")}</h1>
          <p className="text-muted-foreground text-sm">{t("platform_health", { defaultValue: "Platform health at a glance." })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={statsLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* ── KPI Cards (show instantly) ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <StatSkeleton key={i} />)
        ) : stats ? (
          <>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-blue-400 font-semibold uppercase">{t("partners", { defaultValue: "Partners" })}</p>
                  <Handshake className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-3xl font-bold">{stats.totalPartners}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">{stats.subscriptionPlans.FREE} Free</Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{stats.subscriptionPlans.PRO} Pro</Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-500 border-purple-500/20">{stats.subscriptionPlans.ENTERPRISE} Ent</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-emerald-400 font-semibold uppercase">{t("revenue", { defaultValue: "Revenue" })}</p>
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-emerald-400">${stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">${stats.totalRevenue.toLocaleString()} all-time</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-orange-400 font-semibold uppercase">{t("lobbies", { defaultValue: "Lobbies" })}</p>
                  <Gamepad2 className="h-4 w-4 text-orange-400" />
                </div>
                <p className="text-3xl font-bold">{stats.totalLobbies}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{stats.lobbyStatuses.WAITING} {t("waiting", { defaultValue: "waiting" })}</Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">{stats.lobbyStatuses.IN_PROGRESS} {t("live", { defaultValue: "live" })}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-violet-400 font-semibold uppercase">{t("tournaments")}</p>
                  <Trophy className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-3xl font-bold">{stats.totalTournaments}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.activeTournaments} {t("active", { defaultValue: "active" })} · {stats.totalMatches} {t("matches", { defaultValue: "matches" })}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* ── Charts (lazy; show skeletons until analytics arrives) ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {analyticsLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <Skeleton className="h-3 w-24 mb-4" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : analytics ? (
          <>
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <p className="text-sm font-medium">{t("partner_growth", { defaultValue: "Partner Growth" })}</p>
                </div>
                <MiniBar data={analytics.partnerGrowth} months={analytics.months} color="#3b82f6" />
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="h-4 w-4 text-orange-400" />
                  <p className="text-sm font-medium">{t("lobby_activity", { defaultValue: "Lobby Activity" })}</p>
                </div>
                <MiniBar data={analytics.lobbyGrowth} months={analytics.months} color="#f97316" />
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-medium">{t("match_activity", { defaultValue: "Match Activity" })}</p>
                </div>
                <MiniBar data={analytics.matchActivity} months={analytics.months} color="#10b981" />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* ── Quick Links ── */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("manage_tournaments", { defaultValue: "Manage Tournaments"}), href: "/dashboard/admin/tournaments", icon: Trophy,    color: "violet" },
          { label: t("view_partners", { defaultValue: "View Partners" }),      href: "/dashboard/admin/partners",    icon: Handshake, color: "blue" },
          { label: t("player_management", { defaultValue: "Player Management" }),  href: "/dashboard/admin/players",     icon: Users,     color: "orange" },
          { label: t("revenue_details", { defaultValue: "Revenue Details" }),    href: "/dashboard/admin/revenue",     icon: DollarSign,color: "emerald" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="bg-card/60 border-white/10 hover:border-white/25 hover:bg-card/80 transition-all cursor-pointer group">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <link.icon className={`h-4 w-4 text-${link.color}-400`} />
                  <span className="font-medium text-sm">{link.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Top Partners Table ── */}
      <Card className="bg-card/60 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-yellow-400" /> {t("top_partners", { defaultValue: "Top Partners" })}
            </CardTitle>
            <CardDescription className="text-xs">{t("ranked_by_lobby_count", { defaultValue: "Ranked by lobby count" })}</CardDescription>
          </div>
          <Link href="/dashboard/admin/partners">
            <Button variant="ghost" size="sm" className="text-xs">
              {t("view_all", { defaultValue: "View All" })} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {analyticsLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : analytics?.topPartners?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("partner", { defaultValue: "Partner" })}</TableHead>
                  <TableHead>{t("plan", { defaultValue: "Plan" })}</TableHead>
                  <TableHead className="text-center">{t("lobbies", { defaultValue: "Lobbies" })}</TableHead>
                  <TableHead className="text-center">{t("live", { defaultValue: "Live" })}</TableHead>
                  <TableHead className="text-right">{t("monthly_revenue", { defaultValue: "Revenue/mo" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topPartners.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.username}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        p.plan === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        p.plan === 'PRO' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }>{p.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{p.totalLobbies}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                        {p.activeLobbies}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-400">
                      ${p.revenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-sm text-muted-foreground">{t("no_partner_data_yet", { defaultValue: "No partner data yet." })}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
