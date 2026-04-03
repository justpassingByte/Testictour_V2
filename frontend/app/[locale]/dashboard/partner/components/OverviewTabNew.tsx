"use client"

import Link from "next/link"
import {
  Coins,
  Star,
  Trophy,
  Users,
  TrendingUp,
  Plus,
  History,
} from "lucide-react"

import { MiniTourLobby, PartnerData } from "@/app/stores/miniTourLobbyStore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect } from "react"

export function OverviewTabNew({ partnerData, lobbies }: { partnerData: PartnerData | null; lobbies: MiniTourLobby[] }) {
  if (!partnerData) return <p>Could not load overview.</p>

  useEffect(() => {
    // existing code here
  }, [partnerData]) // added partnerData to dependency array

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5 text-primary" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">${partnerData?.totalRevenue?.toLocaleString() || 0}</span>
                <span className="text-sm text-muted-foreground">total</span>
              </div>
              <Progress value={Math.min((partnerData?.totalRevenue || 0) / 100, 100)} className="h-2" />
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              Total Lobbies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{partnerData?.totalLobbies || 0}</span>
              </div>
              {partnerData?.lobbyStatuses ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    {partnerData.lobbyStatuses.WAITING} Waiting
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">
                    {partnerData.lobbyStatuses.IN_PROGRESS} Active
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                    {partnerData.lobbyStatuses.COMPLETED} Done
                  </Badge>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    {partnerData?.activeLobbies || 0} active
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    {(partnerData?.totalLobbies || 0) - (partnerData?.activeLobbies || 0)} completed
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              Referred Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{partnerData?.totalPlayers || 0}</span>
                <span className="text-sm text-muted-foreground">players</span>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 h-4 w-4" />
                <span>Active this month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Lobbies */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Recent Lobbies</CardTitle>
                <CardDescription className="text-slate-400">Your latest tournament lobbies</CardDescription>
              </div>
              <Link href="/dashboard/partner?tab=lobbies">
                <Button size="sm" variant="outline" className="text-slate-200 border-slate-700 hover:bg-slate-700">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lobbies.length > 0 ? (
                [...lobbies]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((lobby) => (
                    <div key={lobby.id} className="flex items-center justify-between rounded-lg border border-slate-700 p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-white">{lobby.name}</h4>
                          <Badge
                            variant={lobby.status === 'WAITING' ? 'default' : 'secondary'}
                            className={`text-[10px] ${lobby.status === 'WAITING'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}
                          >
                            {lobby.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
                          <span className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {lobby.currentPlayers}/{lobby.maxPlayers}
                          </span>
                          <span className="flex items-center">
                            <Coins className="mr-1 h-3 w-3" />
                            {lobby.prizePool.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{new Date(lobby.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No lobbies yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Match Results */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Recent Match Results</CardTitle>
                <CardDescription className="text-slate-400">Latest completed tournament matches</CardDescription>
              </div>
              <History className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const allMatches = lobbies.flatMap(l =>
                  (l.matches || []).map(m => ({ ...m, lobbyName: l.name, lobbyId: l.id }))
                ).filter(m => !!m.fetchedAt);

                const sortedMatches = allMatches.sort((a, b) =>
                  new Date(b.fetchedAt!).getTime() - new Date(a.fetchedAt!).getTime()
                ).slice(0, 5);

                if (sortedMatches.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No completed matches yet</p>
                    </div>
                  );
                }

                return sortedMatches.map(match => (
                  <div key={match.id} className="flex items-center justify-between rounded-lg border border-slate-700 p-4 hover:bg-slate-700/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-sm">Match {match.id.substring(0, 8)}</p>
                        <span className="text-[10px] text-slate-500">•</span>
                        <p className="text-xs text-slate-300">{match.lobbyName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {[...(match.miniTourMatchResults || [])]
                          .sort((a, b) => a.placement - b.placement)
                          .slice(0, 3)
                          .map((res, idx) => (
                            <div key={res.id} className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50 text-[10px]">
                              <span className={res.placement === 1 ? "text-yellow-500 font-bold" : "text-slate-400"}>
                                #{res.placement}
                              </span>
                              <span className="text-slate-300 truncate max-w-[60px]">
                                {res.user?.username || 'Player'}
                              </span>
                            </div>
                          ))}
                        {match.miniTourMatchResults?.length > 3 && (
                          <span className="text-[10px] text-slate-500">+{match.miniTourMatchResults.length - 3} more</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right px-2">
                      <div className="flex items-center justify-end text-emerald-400 text-xs font-bold mb-1">
                        <Trophy className="h-3 w-3 mr-1" />
                        <span>{match.miniTourMatchResults?.length} Participated</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{new Date(match.fetchedAt!).toLocaleDateString()}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
