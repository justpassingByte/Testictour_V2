"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, Users, Gamepad2, Activity, Crown, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/app/lib/apiConfig"

interface AnalyticsData {
  months: string[]
  partnerGrowth: number[]
  lobbyGrowth: number[]
  matchActivity: number[]
  topPartners: {
    id: string; username: string; email: string; plan: string;
    totalLobbies: number; activeLobbies: number; revenue: number;
  }[]
  subscriptionBreakdown: {
    FREE: { count: number; revenue: number }
    PRO: { count: number; revenue: number }
    ENTERPRISE: { count: number; revenue: number }
  }
}

// Identical MiniBar to admin dashboard overview page
function MiniBar({ data, months, color }: { data: number[]; months: string[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group h-full">
          <span className="text-xs flex-shrink-0 font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>{v}</span>
          <div
            className="w-full rounded-t transition-all hover:opacity-90 cursor-default"
            style={{ height: `${Math.max((v / max) * 100, 3)}%`, backgroundColor: color, opacity: 0.65 }}
          />
          <span className="text-xs flex-shrink-0 text-muted-foreground">{months[i]}</span>
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="bg-card/60 border-white/10">
      <CardContent className="p-5">
        <Skeleton className="h-3 w-24 mb-4" />
        <Skeleton className="h-36 w-full" />
      </CardContent>
    </Card>
  )
}

export default function AdminAnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/admin/analytics')
      .then(res => setAnalytics(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">Growth trends and performance metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Charts — identical layout to admin dashboard overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        {loading ? (
          [...Array(3)].map((_, i) => <ChartSkeleton key={i} />)
        ) : analytics ? (
          <>
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-blue-400" />
                  <p className="text-sm font-medium">Partner Growth</p>
                </div>
                <MiniBar data={analytics.partnerGrowth} months={analytics.months} color="#3b82f6" />
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="h-4 w-4 text-orange-400" />
                  <p className="text-sm font-medium">Lobby Activity</p>
                </div>
                <MiniBar data={analytics.lobbyGrowth} months={analytics.months} color="#f97316" />
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-medium">Match Activity</p>
                </div>
                <MiniBar data={analytics.matchActivity} months={analytics.months} color="#10b981" />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">Failed to load analytics.</div>
        )}
      </div>

      {/* Subscription Breakdown */}
      {analytics?.subscriptionBreakdown && (
        <div className="grid gap-4 md:grid-cols-3">
          {(["FREE", "PRO", "ENTERPRISE"] as const).map((plan) => {
            const data = analytics.subscriptionBreakdown[plan]
            const colors: Record<string, string> = {
              FREE: "slate", PRO: "yellow", ENTERPRISE: "purple",
            }
            const c = colors[plan]
            return (
              <Card key={plan} className={`bg-${c}-500/5 border-${c}-500/20`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`bg-${c}-500/10 text-${c}-400 border-${c}-500/20 text-xs`}>{plan}</Badge>
                    <span className="text-2xl font-bold">{data.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Revenue: <span className="text-foreground font-medium">${data.revenue.toLocaleString()}</span></p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Top Partners Table — identical to admin dashboard */}
      <Card className="bg-card/60 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-yellow-400" />
              Top Partners
            </CardTitle>
            <CardDescription className="text-xs">Ranked by lobby count</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : analytics?.topPartners?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Lobbies</TableHead>
                  <TableHead className="text-center">Live</TableHead>
                  <TableHead className="text-right">Revenue/mo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topPartners.slice(0, 8).map((p) => (
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
            <p className="text-center py-8 text-sm text-muted-foreground">No partner data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
