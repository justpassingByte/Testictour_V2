"use client"
import { useState, useEffect, useMemo } from "react"
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight, Filter, Calendar, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"

// ─── Types ───────────────────────────────────────────────────────────────────
interface RevenueStats {
  totalRevenue: number
  monthlyRevenue: number
  subscriptionPlans: { STARTER: number; PRO: number; ENTERPRISE: number }
}

interface AnalyticsData {
  months: string[]
  partnerGrowth: number[]
  lobbyGrowth: number[]
  matchActivity: number[]
  topPartners: {
    id: string; username: string; email: string; plan: string
    totalLobbies: number; activeLobbies: number; revenue: number
  }[]
  subscriptionBreakdown: {
    STARTER: { count: number; revenue: number }
    PRO: { count: number; revenue: number }
    ENTERPRISE: { count: number; revenue: number }
  }
}

// ─── Mini Bar Chart Component ──────────────────────────────────────────────
function BarChart({
  data, labels, color = "#8b5cf6", height = 120
}: { data: number[]; labels: string[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end justify-between xl:justify-center xl:gap-8 gap-2" style={{ height }}>
      {data.map((val, i) => (
        <div key={i} className="max-w-[48px] w-full flex flex-col items-center gap-1 group cursor-default">
          <div className="relative w-full">
            <div
              className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80"
              style={{
                height: Math.max((val / max) * (height - 28), 4),
                backgroundColor: color,
                opacity: 0.7,
              }}
            />
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {val.toLocaleString()}
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Donut Chart Component ─────────────────────────────────────────────────
function DonutChart({ segments, noDataText = "No data", partnersText = "partners" }: { segments: { label: string; value: number; color: string }[], noDataText?: string, partnersText?: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <div className="text-center text-muted-foreground text-sm">{noDataText}</div>

  let cumulative = 0
  const radius = 60, cx = 70, cy = 70, strokeWidth = 22
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex items-center gap-6">
      <svg width={140} height={140} className="shrink-0">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dash = pct * circumference
          const offset = cumulative * circumference
          cumulative += pct
          return (
            <circle
              key={i} cx={cx} cy={cy} r={radius} fill="none"
              stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={circumference * 0.25 - offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" fontSize={14} fontWeight="bold">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
          {partnersText}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-semibold ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = { STARTER: 0, PRO: 29, ENTERPRISE: 99 }
const PLAN_COLORS: Record<string, string> = {
  STARTER: "#64748b", PRO: "#eab308", ENTERPRISE: "#a855f7"
}
const MONTHS_FILTER = ["All", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function AdminRevenuePage() {
  const t = useTranslations("common")
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [userStats, setUserStats] = useState<{ totalUsers: number; totalPlayers: number; totalPartners: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState("All")
  const [planFilter, setPlanFilter] = useState("All")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sRes, aRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/analytics'),
      ])
      setStats(sRes.data.data)
      setAnalytics(aRes.data.data)
      setUserStats({
        totalUsers: sRes.data.data.totalUsers,
        totalPlayers: sRes.data.data.totalPlayers,
        totalPartners: sRes.data.data.totalPartners,
      })
    } catch (err) {
      console.error('Revenue data fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Filtered monthly revenue chart — simulate month filter
  const { chartData, chartLabels } = useMemo(() => {
    if (!analytics) return { chartData: [], chartLabels: [] }
    // Use matchActivity as a revenue proxy (scaled), filter by selected month
    let d = analytics.matchActivity.map((v, i) => Math.round(v * 29)) // simulate PRO revenue
    let l = analytics.months
    if (monthFilter !== "All") {
      const idx = l.findIndex(m => m.toLowerCase().startsWith(monthFilter.toLowerCase()))
      if (idx >= 0) { d = [d[idx]]; l = [l[idx]] }
    }
    return { chartData: d, chartLabels: l }
  }, [analytics, monthFilter])

  const breakdown = analytics?.subscriptionBreakdown
  const planRevenue = breakdown ? {
    STARTER: (breakdown.STARTER.count * PLAN_PRICES.STARTER),
    PRO: (breakdown.PRO.count * PLAN_PRICES.PRO),
    ENTERPRISE: (breakdown.ENTERPRISE.count * PLAN_PRICES.ENTERPRISE),
  } : { STARTER: 0, PRO: 0, ENTERPRISE: 0 }
  const totalMRR = Object.values(planRevenue).reduce((a, b) => a + b, 0)

  const donutSegments = breakdown ? [
    { label: "Enterprise", value: breakdown.ENTERPRISE.count, color: PLAN_COLORS.ENTERPRISE },
    { label: "Pro",        value: breakdown.PRO.count,        color: PLAN_COLORS.PRO },
    { label: "Starter",    value: breakdown.STARTER.count,    color: PLAN_COLORS.STARTER },
  ] : []

  // Filter top partners by plan
  const filteredPartners = useMemo(() => {
    if (!analytics) return []
    let list = analytics.topPartners
    if (planFilter !== "All") list = list.filter(p => p.plan === planFilter)
    return list
  }, [analytics, planFilter])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("revenue", { defaultValue: "Revenue" })}</h1>
          <p className="text-muted-foreground text-sm">{t("revenue_subtitle", { defaultValue: "Subscription analytics, MRR breakdown, and partner performance." })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t("refresh", { defaultValue: "Refresh" })}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("total_revenue", { defaultValue: "Total Revenue" }), value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
            sub: t("all_time", { defaultValue: "All-time" }), icon: DollarSign, color: "emerald", trend: "+18%"
          },
          {
            label: t("mrr", { defaultValue: "MRR" }), value: `$${totalMRR.toLocaleString()}`,
            sub: t("monthly_recurring", { defaultValue: "Monthly Recurring" }), icon: TrendingUp, color: "violet", trend: "+12%"
          },
          {
            label: t("paid_partners", { defaultValue: "Paid Partners" }), value: (breakdown ? breakdown.PRO.count + breakdown.ENTERPRISE.count : 0),
            sub: t("on_free_count", { count: breakdown?.STARTER.count || 0, defaultValue: `${breakdown?.STARTER.count || 0} on Starter` }), icon: Users, color: "blue", trend: "+5%"
          },
          {
            label: t("arpu", { defaultValue: "ARPU" }), value: `$${breakdown && (breakdown.PRO.count + breakdown.ENTERPRISE.count) > 0
              ? Math.round(totalMRR / (breakdown.PRO.count + breakdown.ENTERPRISE.count)) : 0}`,
            sub: t("avg_revenue_per_paid", { defaultValue: "Avg revenue per paid user" }), icon: CreditCard, color: "amber", trend: "+3%"
          },
        ].map((card) => (
          <Card key={card.label} className={`bg-gradient-to-br from-${card.color}-500/10 to-${card.color}-600/5 border-${card.color}-500/20`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[11px] text-${card.color}-400 font-semibold uppercase tracking-wide`}>{card.label}</p>
                <card.icon className={`h-4 w-4 text-${card.color}-400`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-muted-foreground">{card.sub}</p>
                <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />{card.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="bg-card/60 border-white/10 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm">{t("revenue_over_time", { defaultValue: "Revenue Over Time" })}</CardTitle>
              <CardDescription className="text-xs">{t("revenue_over_time_desc", { defaultValue: "Monthly subscription revenue trend" })}</CardDescription>
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <Calendar className="mr-1 h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_FILTER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 animate-pulse bg-white/5 rounded" />
            ) : (
              <BarChart data={chartData} labels={chartLabels} color="#8b5cf6" height={140} />
            )}
          </CardContent>
        </Card>

        {/* Subscription Donut */}
        <Card className="bg-card/60 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("plan_distribution", { defaultValue: "Plan Distribution" })}</CardTitle>
            <CardDescription className="text-xs">{t("plan_distribution_desc", { defaultValue: "Partners by subscription tier" })}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 animate-pulse bg-white/5 rounded" />
            ) : (
              <DonutChart segments={donutSegments} noDataText={t("no_data", { defaultValue: "No data" })} partnersText={t("partners", { defaultValue: "partners" })} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Growth Section */}
      <Card className="bg-card/60 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" /> {t("user_growth", { defaultValue: "User Growth" })}
          </CardTitle>
          <CardDescription className="text-xs">{t("user_growth_desc", { defaultValue: "Monthly new user and partner registrations" })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Stats */}
            <div className="space-y-3">
              {[
                { label: t("total_users", { defaultValue: "Total Users" }),   value: userStats?.totalUsers   ?? 0, color: "cyan" },
                { label: t("players", { defaultValue: "Players" }),       value: userStats?.totalPlayers  ?? 0, color: "blue" },
                { label: t("partners", { defaultValue: "Partners" }),      value: userStats?.totalPartners ?? 0, color: "violet" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full bg-${s.color}-400`} />
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="font-bold text-lg">{loading ? '—' : s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Partner growth chart */}
            <div className="lg:col-span-2">
              <p className="text-xs text-muted-foreground mb-2">{t("partner_registrations_time", { defaultValue: "Partner registrations over time" })}</p>
              {loading ? (
                <div className="h-24 animate-pulse bg-white/5 rounded" />
              ) : analytics ? (
                <BarChart data={analytics.partnerGrowth} labels={analytics.months} color="#06b6d4" height={100} />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Breakdown Table */}
      <Card className="bg-card/60 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("subscription_plan_breakdown", { defaultValue: "Subscription Plan Breakdown" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("plan", { defaultValue: "Plan" })}</TableHead>
                <TableHead className="text-center">{t("partners", { defaultValue: "Partners" })}</TableHead>
                <TableHead className="text-center">{t("price_mo", { defaultValue: "Price/mo" })}</TableHead>
                <TableHead className="text-center">{t("mrr", { defaultValue: "MRR" })}</TableHead>
                <TableHead className="text-right">{t("pct_of_revenue", { defaultValue: "% of Revenue" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(["ENTERPRISE", "PRO", "STARTER"] as const).map((plan) => {
                const count = breakdown?.[plan]?.count || 0
                const mrr = planRevenue[plan]
                const pct = totalMRR > 0 ? Math.round((mrr / totalMRR) * 100) : 0
                return (
                  <TableRow key={plan}>
                    <TableCell>
                      <Badge variant="outline" style={{ color: PLAN_COLORS[plan], borderColor: PLAN_COLORS[plan] + '40', backgroundColor: PLAN_COLORS[plan] + '15' }}>
                        {plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{count}</TableCell>
                    <TableCell className="text-center text-muted-foreground">${PLAN_PRICES[plan]}</TableCell>
                    <TableCell className="text-center font-medium text-emerald-400">${mrr.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PLAN_COLORS[plan] }} />
                        </div>
                        <span className="text-sm w-8 text-right">{pct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="border-t-2 border-white/20 font-bold">
                <TableCell>{t("total", { defaultValue: "Total" })}</TableCell>
                <TableCell className="text-center">{(breakdown?.STARTER.count || 0) + (breakdown?.PRO.count || 0) + (breakdown?.ENTERPRISE.count || 0)}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-center text-emerald-400">${totalMRR.toLocaleString()}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Partners Revenue Table */}
      <Card className="bg-card/60 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm">{t("top_partners_revenue", { defaultValue: "Top Partners by Revenue" })}</CardTitle>
            <CardDescription className="text-xs">{t("ranked_by_monthly_revenue", { defaultValue: "Ranked by monthly revenue contribution" })}</CardDescription>
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{t("all_plans", { defaultValue: "All Plans" })}</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-white/5 rounded" />)}
            </div>
          ) : filteredPartners.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{t("no_partners_found_for_filter", { defaultValue: "No partners found for this filter." })}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("partner", { defaultValue: "Partner" })}</TableHead>
                  <TableHead>{t("plan", { defaultValue: "Plan" })}</TableHead>
                  <TableHead className="text-center">{t("lobbies", { defaultValue: "Lobbies" })}</TableHead>
                  <TableHead className="text-right">{t("revenue_mo", { defaultValue: "Revenue/mo" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground text-sm font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.username}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ color: PLAN_COLORS[p.plan], borderColor: PLAN_COLORS[p.plan] + '40', backgroundColor: PLAN_COLORS[p.plan] + '15' }}>
                        {p.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{p.totalLobbies}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-400">
                      ${(p.revenue || PLAN_PRICES[p.plan] || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
