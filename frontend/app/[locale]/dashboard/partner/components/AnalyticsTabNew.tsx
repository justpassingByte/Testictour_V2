"use client";

import { useMemo } from "react"
import {
  Users,
  DollarSign,
  Star,
  TrendingUp,
} from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns"

import { PartnerData, MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AnalyticsTabNewProps {
  partnerData: PartnerData | null
  lobbies: MiniTourLobby[]
}

export function AnalyticsTabNew({ partnerData, lobbies }: AnalyticsTabNewProps) {
  const t = useTranslations("common");

  // Consolidate metrics
  const metrics = partnerData?.metrics || {
    totalPlayers: partnerData?.totalPlayers || 0,
    totalRevenue: partnerData?.totalRevenue || 0,
    activeLobbies: partnerData?.activeLobbies || 0,
    totalLobbies: partnerData?.totalLobbies || 0,
    monthlyRevenue: partnerData?.monthlyRevenue || 0,
    balance: partnerData?.balance || 0,
    totalMatches: partnerData?.totalMatches || 0,
  }

  // Process Real Data from Lobbies
  const { chartData, totalPlayerGrowth, totalRevenueGrowth } = useMemo(() => {
    const today = new Date()
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(today, 5 - i)
      return {
        date,
        name: format(date, 'MMM'),
        monthStart: startOfMonth(date),
        monthEnd: endOfMonth(date)
      }
    })

    const data = last6Months.map(month => {
      let playersCount = 0
      let revenueCount = 0

      lobbies.forEach(lobby => {
        const lobbyDate = lobby.createdAt ? parseISO(lobby.createdAt) : new Date()

        // Check if lobby belongs to this month (for Revenue estimation based on creation)
        if (isWithinInterval(lobbyDate, { start: month.monthStart, end: month.monthEnd })) {
          // Calculate Revenue: Entry Fees * Players * Revenue Share
          const isPaid = lobby.entryFee > 0
          if (isPaid) {
            const share = lobby.partnerRevenueShare ? (lobby.partnerRevenueShare / 100) : 0
            // Use currentPlayers or maxPlayers or actual participants count
            // Using currentPlayers is safer for active lobbies
            revenueCount += (lobby.entryFee * lobby.currentPlayers * share)
          }
        }

        // Calculate Players (Participants joined in this month)
        if (lobby.participants && lobby.participants.length > 0) {
          lobby.participants.forEach(p => {
            const joinDate = p.joinedAt ? parseISO(p.joinedAt) : lobbyDate
            if (isWithinInterval(joinDate, { start: month.monthStart, end: month.monthEnd })) {
              playersCount++
            }
          })
        } else {
          // Fallback if no participants array but lobby created in this month
          if (isWithinInterval(lobbyDate, { start: month.monthStart, end: month.monthEnd })) {
            playersCount += lobby.currentPlayers
          }
        }
      })

      // Process new Tournaments
      if (partnerData && (partnerData as any).tournaments) {
         ((partnerData as any).tournaments).forEach((t: any) => {
            const tDate = t.createdAt ? parseISO(t.createdAt) : new Date()

            if (isWithinInterval(tDate, { start: month.monthStart, end: month.monthEnd })) {
                const isPaid = t.entryFee > 0
                if (isPaid) {
                   const share = t.hostFeePercent || ((partnerData as any).revenueShare / 100) || 0.1
                   revenueCount += (t.entryFee * (t._count?.participants || 0) * share)
                }
                playersCount += t._count?.participants || 0
            }
         })
      }

      return {
        name: month.name,
        players: playersCount,
        revenue: revenueCount
      }
    })

    const totalPlayerGrowth = data[5].players - data[0].players
    const totalRevenueGrowth = data[5].revenue - data[0].revenue

    return { chartData: data, totalPlayerGrowth, totalRevenueGrowth }
  }, [lobbies, partnerData])

  if (!partnerData) return <p>Could not load analytics.</p>

  return (
    <div className="space-y-6">
      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-500" />
              {t("new_players")}
            </CardTitle>
            <CardDescription>{t("new_players_joined_6m")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px' }}
                    formatter={(value: number) => [value, 'Players']}
                  />
                  <Bar
                    dataKey="players"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Players"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-muted-foreground">{t("trend_6m")}</span>
              <span className={`flex items-center font-medium ${totalPlayerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`mr-1 h-4 w-4 ${totalPlayerGrowth < 0 ? 'rotate-180' : ''}`} />
                {totalPlayerGrowth >= 0 ? '+' : ''}{totalPlayerGrowth} {t("players_count_suffix")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-green-500" />
              {t("estimated_revenue")}
            </CardTitle>
            <CardDescription>{t("estimated_revenue_6m")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-muted-foreground">{t("trend_6m")}</span>
              <span className={`flex items-center font-medium ${totalRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`mr-1 h-4 w-4 ${totalRevenueGrowth < 0 ? 'rotate-180' : ''}`} />
                {totalRevenueGrowth >= 0 ? '+' : ''}${totalRevenueGrowth.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-600" />
              {t("total_players")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{metrics.totalPlayers}</span>
                <span className="text-sm text-muted-foreground">{t("players_count_suffix")}</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600">{t("active_status")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-green-600" />
              {t("monthly_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">${(metrics?.monthlyRevenue || 0).toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">{t("usd_currency")}</span>
              </div>
              <div className="flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-600">{t("current_month")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5 text-yellow-600" />
              {t("partner_rating")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{4.5}</span>
                <span className="text-sm text-muted-foreground">/5.0</span>
              </div>
              <div className="flex items-center text-sm">
                <Star className="mr-1 h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-yellow-600">{t("excellent_performance")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Additional Insights */}
        <Card>
          <CardHeader>
            <CardTitle>{t("performance_insights")}</CardTitle>
            <CardDescription>{t("key_metrics_trends")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">{t("lobby_performance")}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("total_lobbies")}</span>
                    <span className="font-medium">{metrics?.totalLobbies || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("active_rate")}</span>
                    <span className="font-medium text-green-600">
                      {(metrics?.totalLobbies || 0) > 0 ? Math.round(((metrics?.activeLobbies || 0) / (metrics?.totalLobbies || 0)) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">{t("financial_summary")}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("total_revenue")}</span>
                    <span className="font-medium">${(metrics?.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("current_balance")}</span>
                    <span className="font-medium">${(metrics?.balance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("avg_monthly")}</span>
                    <span className="font-medium">${Math.round((metrics?.totalRevenue || 0) / 6).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-500" />
              {t("player_acquisition_sources")}
            </CardTitle>
            <CardDescription>{t("where_players_discovered")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[200px]">
            {partnerData?.referralStats && partnerData.referralStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={partnerData.referralStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    labelLine={false}
                  >
                    {partnerData.referralStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [value, props.payload.source]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.8)' }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value, entry: any) => <span className="text-sm text-muted-foreground">{entry.payload.source}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">{t("no_acquisition_data")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
