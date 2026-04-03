"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, Users, Gamepad2, TrendingUp, DollarSign, Crown, Activity } from "lucide-react"
import api from "@/app/lib/apiConfig"

interface AdminStats {
    totalUsers: number
    totalPartners: number
    totalPlayers: number
    totalLobbies: number
    totalTournaments: number
    activeTournaments: number
    totalMatches: number
    totalRevenue: number
    monthlyRevenue: number
    subscriptionPlans: { FREE: number; PRO: number; ENTERPRISE: number }
    lobbyStatuses: { WAITING: number; IN_PROGRESS: number; COMPLETED: number }
}

interface AnalyticsData {
    months: string[]
    partnerGrowth: number[]
    lobbyGrowth: number[]
    matchActivity: number[]
    topPartners: {
        id: string; username: string; email: string; joinedAt: string
        totalLobbies: number; activeLobbies: number; plan: string; revenue: number
    }[]
    subscriptionBreakdown: {
        FREE: { count: number; revenue: number }
        PRO: { count: number; revenue: number }
        ENTERPRISE: { count: number; revenue: number }
    }
}

export default function AdminOverviewTab({ stats }: { stats: AdminStats | null }) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

    useEffect(() => {
        api.get('/admin/analytics').then(res => setAnalytics(res.data.data)).catch(console.error)
    }, [])

    if (!stats) return <div className="text-center py-8 text-muted-foreground">Loading...</div>

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-400">Total Partners</CardTitle>
                        <Users className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalPartners}</div>
                        <div className="flex gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                                {stats.subscriptionPlans.FREE} Free
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                {stats.subscriptionPlans.PRO} Pro
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-500 border-purple-500/20">
                                {stats.subscriptionPlans.ENTERPRISE} Ent
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">Monthly Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">${stats.monthlyRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">${stats.totalRevenue.toLocaleString()} total all-time</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-orange-400">Lobbies</CardTitle>
                        <Gamepad2 className="h-4 w-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalLobbies}</div>
                        <div className="flex gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                {stats.lobbyStatuses.WAITING} Waiting
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">
                                {stats.lobbyStatuses.IN_PROGRESS} Active
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-violet-400">Matches</CardTitle>
                        <Trophy className="h-4 w-4 text-violet-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalMatches}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.totalTournaments} tournaments · {stats.activeTournaments} active
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Trends - Simple Bar Charts */}
            {analytics && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-card/60 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-400" />
                                Partner Growth
                            </CardTitle>
                            <CardDescription>New partners per month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 h-32">
                                {analytics.partnerGrowth.map((val, i) => {
                                    const max = Math.max(...analytics.partnerGrowth, 1)
                                    const height = (val / max) * 100
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground">{val}</span>
                                            <div
                                                className="w-full bg-blue-500/60 rounded-t transition-all"
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                            />
                                            <span className="text-[9px] text-muted-foreground">{analytics.months[i]}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/60 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-emerald-400" />
                                Match Activity
                            </CardTitle>
                            <CardDescription>Matches played per month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 h-32">
                                {analytics.matchActivity.map((val, i) => {
                                    const max = Math.max(...analytics.matchActivity, 1)
                                    const height = (val / max) * 100
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground">{val}</span>
                                            <div
                                                className="w-full bg-emerald-500/60 rounded-t transition-all"
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                            />
                                            <span className="text-[9px] text-muted-foreground">{analytics.months[i]}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Top Partners Table */}
            {analytics && analytics.topPartners.length > 0 && (
                <Card className="bg-card/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-yellow-400" />
                            Top Partners
                        </CardTitle>
                        <CardDescription>Partners ranked by lobby count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Partner</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead className="text-center">Lobbies</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analytics.topPartners.map((partner) => (
                                    <TableRow key={partner.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{partner.username}</div>
                                                <div className="text-xs text-muted-foreground">{partner.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                partner.plan === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    partner.plan === 'PRO' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                            }>
                                                {partner.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-semibold">{partner.totalLobbies}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                                                {partner.activeLobbies}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-emerald-400">
                                            ${partner.revenue.toLocaleString()}/mo
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
