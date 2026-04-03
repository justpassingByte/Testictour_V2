"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Gamepad2, Activity } from "lucide-react"
import api from "@/app/lib/apiConfig"

interface AnalyticsData {
    months: string[]
    partnerGrowth: number[]
    lobbyGrowth: number[]
    matchActivity: number[]
}

export default function AdminAnalyticsTab() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

    useEffect(() => {
        api.get('/admin/analytics').then(res => setAnalytics(res.data.data)).catch(console.error)
    }, [])

    if (!analytics) return <div className="text-center py-8 text-muted-foreground">Loading...</div>

    return (
        <div className="space-y-6">
            <div className="grid gap-6">
                <Card className="bg-card/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-400" />
                            Partner Growth (6 Months)
                        </CardTitle>
                        <CardDescription>Number of new partners onboarded per month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-48 mt-4">
                            {analytics.partnerGrowth.map((val, i) => {
                                const max = Math.max(...analytics.partnerGrowth, 1)
                                const height = (val / max) * 100
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-sm font-medium text-blue-300">{val}</span>
                                        <div
                                            className="w-full max-w-[4rem] bg-blue-500/60 rounded-t-md transition-all hover:bg-blue-400/80"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                        <span className="text-xs text-muted-foreground">{analytics.months[i]}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gamepad2 className="h-5 w-5 text-orange-400" />
                            Lobby Creation Trend
                        </CardTitle>
                        <CardDescription>Number of new lobbies created per month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-48 mt-4">
                            {analytics.lobbyGrowth.map((val, i) => {
                                const max = Math.max(...analytics.lobbyGrowth, 1)
                                const height = (val / max) * 100
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-sm font-medium text-orange-300">{val}</span>
                                        <div
                                            className="w-full max-w-[4rem] bg-orange-500/60 rounded-t-md transition-all hover:bg-orange-400/80"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                        <span className="text-xs text-muted-foreground">{analytics.months[i]}</span>
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
                            Match Frequency
                        </CardTitle>
                        <CardDescription>Number of matches played per month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-48 mt-4">
                            {analytics.matchActivity.map((val, i) => {
                                const max = Math.max(...analytics.matchActivity, 1)
                                const height = (val / max) * 100
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-sm font-medium text-emerald-300">{val}</span>
                                        <div
                                            className="w-full max-w-[4rem] bg-emerald-500/60 rounded-t-md transition-all hover:bg-emerald-400/80"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                        <span className="text-xs text-muted-foreground">{analytics.months[i]}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
