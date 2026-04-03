"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ArrowUpRight, Crown, Users } from "lucide-react"
import api from "@/app/lib/apiConfig"

interface AdminStats {
    totalRevenue: number
    monthlyRevenue: number
}

interface AnalyticsData {
    subscriptionBreakdown: {
        FREE: { count: number; revenue: number }
        PRO: { count: number; revenue: number }
        ENTERPRISE: { count: number; revenue: number }
    }
}

export default function AdminRevenueTab({ stats }: { stats: AdminStats | null }) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

    useEffect(() => {
        api.get('/admin/analytics').then(res => setAnalytics(res.data.data)).catch(console.error)
    }, [])

    if (!stats || !analytics) return <div className="text-center py-8 text-muted-foreground">Loading...</div>

    const totalSubsCount = analytics.subscriptionBreakdown.FREE.count +
        analytics.subscriptionBreakdown.PRO.count +
        analytics.subscriptionBreakdown.ENTERPRISE.count

    const mrr = analytics.subscriptionBreakdown.PRO.revenue + analytics.subscriptionBreakdown.ENTERPRISE.revenue

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">Monthly Recurring Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">${mrr.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">From active subscriptions</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-400">Total All-Time Revenue</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-400">${stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total platform earnings</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-purple-400">Average Revenue Per User</CardTitle>
                        <Users className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-400">
                            ${totalSubsCount > 0 ? (mrr / totalSubsCount).toFixed(2) : 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Across all {totalSubsCount} partners</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-card/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <Users className="h-5 w-5 text-slate-400" />
                            Free Partners
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-200">{analytics.subscriptionBreakdown.FREE.count}</div>
                        <p className="text-sm text-slate-400 mt-2">Basic features</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                            <span className="text-slate-400">Monthly Revenue</span>
                            <span className="font-medium">$0</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-yellow-400" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <Crown className="h-5 w-5 text-yellow-400" />
                            Pro Partners
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-yellow-400">{analytics.subscriptionBreakdown.PRO.count}</div>
                        <p className="text-sm text-yellow-400/60 mt-2">Advanced features</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                            <span className="text-slate-400">Monthly Revenue</span>
                            <span className="font-medium text-emerald-400">${analytics.subscriptionBreakdown.PRO.revenue.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-purple-500" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <Crown className="h-5 w-5 text-purple-500" />
                            Enterprise Partners
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-purple-500">{analytics.subscriptionBreakdown.ENTERPRISE.count}</div>
                        <p className="text-sm text-purple-400/60 mt-2">Full access & unlimited</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                            <span className="text-slate-400">Monthly Revenue</span>
                            <span className="font-medium text-emerald-400">${analytics.subscriptionBreakdown.ENTERPRISE.revenue.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
