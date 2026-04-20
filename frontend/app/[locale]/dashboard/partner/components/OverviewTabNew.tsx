"use client"

import Link from "next/link"
import {
  Wallet,
  Star,
  Trophy,
  Users,
  TrendingUp,
  Plus,
  History,
  DollarSign,
} from "lucide-react"

import { MiniTourLobby, PartnerData } from "@/app/stores/miniTourLobbyStore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect } from "react"
import { useTranslations } from "next-intl"

export function OverviewTabNew({ 
  partnerData, 
  lobbies, 
  tournaments = [], 
  ledger = null 
}: { 
  partnerData: PartnerData | null; 
  lobbies: MiniTourLobby[];
  tournaments?: any[];
  ledger?: any;
}) {
  if (!partnerData) return <p>Could not load overview.</p>

  const useLedger = !!ledger;
  const totalTournaments = tournaments.length;
  const t = useTranslations("common");

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5 text-primary" />
              {t("net_balance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">
                  {useLedger ? `$${ledger.totals.netPartnerBalance.toLocaleString()}` : `$${partnerData?.totalRevenue?.toLocaleString() || 0}`}
                </span>
              </div>
              <p className="text-sm text-green-500 font-medium tracking-tight">{t("available_to_withdraw")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-500/50 bg-violet-500/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-violet-500" />
              {t("platform_fee")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">
                  {useLedger ? `$${ledger.totals.totalPlatformFee.toLocaleString()}` : `$${partnerData?.monthlyRevenue?.toLocaleString() || 0}`}
                </span>
                <span className="text-sm text-muted-foreground">{t("all_time")}</span>
              </div>
              <div className={`flex items-center text-sm gap-1.5 ${(partnerData?.subscriptionPlan || 'STARTER') === 'STARTER' ? 'text-green-500' : 'text-red-500'}`}>
                <span>{(partnerData?.subscriptionPlan || 'STARTER') === 'STARTER' ? t("secured_in_escrow") : t("pending_settlement")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              {t("tournaments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{totalTournaments}</span>
                <span className="text-sm text-muted-foreground tracking-tight">/ {partnerData.totalLobbies} Lobbies</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  {tournaments.filter((t:any) => t.status === 'upcoming').length} Upcoming
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">
                  {tournaments.filter((t:any) => t.status === 'in_progress').length} Active
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                  {tournaments.filter((t:any) => t.status === 'completed').length} Done
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              {t("players_engaged")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                 <span className="text-3xl font-bold">
                   {tournaments.reduce((sum: number, t: any) => sum + (t._count?.participants || 0), 0) + (partnerData?.totalPlayers || 0)}
                 </span>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 h-4 w-4" />
                <span>{t("across_all_events")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tournaments */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">{t("recent_tournaments")}</CardTitle>
                <CardDescription className="text-slate-400">{t("your_latest_competitive_events")}</CardDescription>
              </div>
              <Link href="/dashboard/partner?tab=tournaments">
                <Button size="sm" variant="outline" className="text-slate-200 border-slate-700 hover:bg-slate-700">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tournaments.length > 0 ? (
                [...tournaments]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-700 p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-white truncate max-w-[200px]">{t.name}</h4>
                          <Badge
                            variant={t.status === 'upcoming' ? 'default' : 'secondary'}
                            className={`text-[10px] ${t.status === 'upcoming'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}
                          >
                            {t.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
                          <span className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {t._count?.participants || 0}/{t.maxParticipants}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="mr-1 h-3 w-3" />
                            {t.prizePool?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t("no_tournaments_yet")}</p>
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
                <CardTitle className="text-white">{t("recent_match_results")}</CardTitle>
                <CardDescription className="text-slate-400">{t("latest_completed_tournament_matches")}</CardDescription>
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
                      <p>{t("no_completed_matches_yet")}</p>
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
