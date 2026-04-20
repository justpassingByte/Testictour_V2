"use client"

import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Trophy, Medal, Crown, Loader2 } from "lucide-react"
import { useTranslations } from 'next-intl'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SyncStatus } from "@/components/sync-status"
import { PlayerService, LeaderboardPlayer } from "@/app/services/PlayerService"

export default function LeaderboardClient() {
  const t = useTranslations('common')
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("totalPoints")
  const [region, setRegion] = useState<string>("All")
  const [achievementSortBy, setAchievementSortBy] = useState<string>("tournamentsWon")
  const [mainTab, setMainTab] = useState("rankings")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await PlayerService.getLeaderboard(searchQuery || undefined, limit, (page - 1) * limit, region, sortBy)
        setPlayers(result.data)
        setTotal(result.total)
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
      } finally {
        setIsLoading(false)
      }
    }
    const timer = setTimeout(fetchData, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery, sortBy, region, page])

  const sortedPlayers = players
  const topPlayers = page === 1 ? sortedPlayers.slice(0, 3) : []

  // Achievement tab: local sort (independent of server sortBy)
  const achievementSortedPlayers = [...players].sort((a, b) => {
    if (achievementSortBy === "tournamentsWon") return (b.tournamentsWon || 0) - (a.tournamentsWon || 0)
    if (achievementSortBy === "topFourRate") return (b.topFourRate || 0) - (a.topFourRate || 0)
    if (achievementSortBy === "lobbiesPlayed") return (b.lobbiesPlayed || 0) - (a.lobbiesPlayed || 0)
    if (achievementSortBy === "totalPoints") return (b.totalPoints || 0) - (a.totalPoints || 0)
    return 0
  })

  // Compute achievement category leaders
  const topWinner = [...players].sort((a, b) => (b.tournamentsWon || 0) - (a.tournamentsWon || 0))[0]
  const topWinRate = [...players].sort((a, b) => (b.topFourRate || 0) - (a.topFourRate || 0))[0]
  const mostActive = [...players].sort((a, b) => (b.lobbiesPlayed || 0) - (a.lobbiesPlayed || 0))[0]
  const bestPlacement = [...players]
    .filter(p => p.averagePlacement != null && p.averagePlacement > 0)
    .sort((a, b) => (a.averagePlacement || 99) - (b.averagePlacement || 99))[0]

  const achievementCategories = [
    {
      title: "🏆 Tournament Champion",
      description: "Most tournaments won across all events",
      player: topWinner,
      value: topWinner ? `${topWinner.tournamentsWon || 0} wins` : "—",
      color: "from-yellow-500/20 to-amber-500/5 border-yellow-500/40",
      badge: "bg-gradient-to-br from-yellow-400 to-amber-600",
    },
    {
      title: "🎯 Top Win Rate",
      description: "Highest Top-4 finish rate",
      player: topWinRate,
      value: topWinRate ? `${topWinRate.topFourRate || 0}% Top-4` : "—",
      color: "from-sky-500/20 to-blue-500/5 border-sky-500/40",
      badge: "bg-gradient-to-br from-sky-400 to-blue-600",
    },
    {
      title: "⚡ Most Active",
      description: "Most lobbies & matches played",
      player: mostActive,
      value: mostActive ? `${mostActive.lobbiesPlayed || 0} lobbies` : "—",
      color: "from-purple-500/20 to-violet-500/5 border-purple-500/40",
      badge: "bg-gradient-to-br from-purple-400 to-violet-600",
    },
    {
      title: "📍 Best Placement",
      description: "Lowest average placement overall",
      player: bestPlacement,
      value: bestPlacement ? `Avg. ${bestPlacement.averagePlacement?.toFixed(2) || "—"}` : "—",
      color: "from-emerald-500/20 to-green-500/5 border-emerald-500/40",
      badge: "bg-gradient-to-br from-emerald-400 to-green-600",
    },
  ]

  if (isLoading && players.length === 0) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">{t('global_leaderboard')}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('leaderboard_merged_description')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm py-1">
            {total} {t('players')}
          </Badge>
          <SyncStatus status="live" />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="rankings" className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4" />
            {t('rankings_tab')}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2 text-sm">
            <Medal className="h-4 w-4" />
            Achievement Ranking
          </TabsTrigger>
        </TabsList>

        {/* ===================== RANKINGS TAB ===================== */}
        <TabsContent value="rankings" className="space-y-8 mt-6">
          {topPlayers.length > 0 && (
            <div className="flex flex-col md:flex-row justify-center items-end gap-6 h-auto md:h-80 py-10 w-full">
              {[topPlayers[1], topPlayers[0], topPlayers[2]].map((player, idx) => {
                if (!player) return null;
                const isFirst = idx === 1;
                const isSecond = idx === 0;
                return (
                  <Link href={`/players/${player.id}`} key={player.id} className={`w-full md:w-64 max-w-sm flex flex-col items-center group transition-transform duration-300 hover:-translate-y-2 ${isFirst ? 'order-first md:order-none z-10' : ''}`}>
                    <div className="relative mb-4">
                      <Avatar className={`ring-4 ring-offset-4 ring-offset-background shadow-2xl ${isFirst ? 'h-32 w-32 ring-yellow-400' : isSecond ? 'h-24 w-24 ring-gray-300' : 'h-20 w-20 ring-amber-700'}`}>
                        <AvatarFallback className="text-3xl font-black">{player.username?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      {isFirst && <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-10 w-10 text-yellow-400 drop-shadow-md animate-bounce" />}
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg ${isFirst ? "bg-gradient-to-br from-yellow-400 to-amber-600" : isSecond ? "bg-gradient-to-br from-gray-300 to-slate-500" : "bg-gradient-to-br from-amber-600 to-orange-800"}`}>
                        {isFirst ? 1 : isSecond ? 2 : 3}
                      </div>
                    </div>
                    <div className={`w-full rounded-t-xl rounded-b-md text-center p-4 bg-gradient-to-b ${isFirst ? 'from-yellow-500/20 to-transparent border border-yellow-500/30 md:h-48' : isSecond ? 'from-gray-400/20 to-transparent border border-gray-400/30 md:h-36' : 'from-amber-700/20 to-transparent border border-amber-700/30 md:h-28'}`}>
                      <h3 className={`font-bold truncate group-hover:text-primary transition-colors ${isFirst ? 'text-2xl mt-2' : 'text-xl'}`}>{player.username}</h3>
                      <div className="text-primary font-black mt-1">{(player.totalPoints || 0).toLocaleString()} <span className="text-xs font-medium text-muted-foreground">pts</span></div>
                      <div className="text-emerald-500 font-bold text-sm -mt-0.5">${(player.totalPrizeWon || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search_players')}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={region} onValueChange={(v) => { setRegion(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Regions</SelectItem>
                <SelectItem value="NA">NA</SelectItem>
                <SelectItem value="EUW">EUW</SelectItem>
                <SelectItem value="APAC">APAC</SelectItem>
                <SelectItem value="KR">KR</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1) }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalPoints">Total Points</SelectItem>
                <SelectItem value="totalPrizeWon">Total Prize Won</SelectItem>
                <SelectItem value="topFourRate">Top 4 Rate</SelectItem>
                <SelectItem value="tournamentsWon">Tournaments Won</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rankings Table */}
          <Card className="bg-card/95 dark:bg-card/40 backdrop-blur-lg border shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle>{t('player_rankings')}</CardTitle>
              <CardDescription>{t('updated_rankings')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">{t('rank')}</TableHead>
                    <TableHead>{t('player')}</TableHead>
                    <TableHead>{t('summoner_name')}</TableHead>
                    <TableHead className="text-center">{t('region')}</TableHead>
                    <TableHead className="text-right">{t('points')}</TableHead>
                    <TableHead className="text-right">Prize</TableHead>
                    <TableHead className="text-center">{t('tournaments_won')}</TableHead>
                    <TableHead className="text-center">{t('top_four_rate')}</TableHead>
                    <TableHead className="text-center">{t('avg_placement')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {isLoading ? t('loading') : searchQuery ? t('no_tournaments_match') : 'No players found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPlayers.map((player, idx) => (
                      <TableRow key={player.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-bold">
                          <span className={`
                            ${idx === 0 ? "text-yellow-500" : ""}
                            ${idx === 1 ? "text-gray-400" : ""}
                            ${idx === 2 ? "text-amber-700" : ""}
                          `}>
                            #{(page - 1) * limit + idx + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/players/${player.id}`} className="flex items-center group">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarFallback>{player.username?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium group-hover:text-primary transition-colors">{player.username}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {player.riotGameName ? `${player.riotGameName}#${player.riotGameTag}` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {player.region ? <Badge variant="outline" className="text-xs">{player.region}</Badge> : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {(player.totalPoints || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-emerald-500 font-medium">
                          ${(player.totalPrizeWon || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="flex items-center justify-center gap-1">
                            <Trophy className="h-3 w-3 text-yellow-500" />
                            {player.tournamentsWon || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{player.topFourRate || 0}%</TableCell>
                        <TableCell className="text-center">{player.averagePlacement?.toFixed(1) || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {total > limit && (
                <div className="flex justify-between items-center mt-4 px-2 py-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} players
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== ACHIEVEMENT RANKING TAB ===================== */}
        <TabsContent value="achievements" className="space-y-8 mt-6">
          {/* Section Header */}
          <div>
            <h2 className="text-2xl font-bold mb-1">Achievement Ranking</h2>
            <p className="text-muted-foreground">
              Top players in each special achievement category across all tournaments.
            </p>
          </div>

          {/* Achievement Category Cards */}
          <div className="grid gap-5 md:grid-cols-2">
            {achievementCategories.map((cat) => (
              <Card
                key={cat.title}
                className={`relative overflow-hidden bg-gradient-to-br ${cat.color} transition-all duration-300 hover:scale-[1.01] shadow-sm`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">{cat.title}</CardTitle>
                  <CardDescription className="text-xs">{cat.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {cat.player ? (
                    <Link href={`/players/${cat.player.id}`} className="flex items-center gap-4 group">
                      <div className="relative">
                        <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
                          <AvatarFallback className="text-base font-bold">
                            {cat.player.username?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md ${cat.badge}`}>
                          1
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate group-hover:text-primary transition-colors">
                          {cat.player.username}
                        </p>
                        {cat.player.riotGameName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {cat.player.riotGameName}#{cat.player.riotGameTag}
                          </p>
                        )}
                        <Badge className={`mt-1 text-xs text-white border-0 ${cat.badge}`}>
                          {cat.value}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0">
                        View →
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-muted-foreground text-sm py-2">No data available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full Achievement Board */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={achievementSortBy} onValueChange={setAchievementSortBy}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue placeholder="Sort by achievement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tournamentsWon">🏆 Tournaments Won</SelectItem>
                  <SelectItem value="topFourRate">🎯 Top-4 Win Rate</SelectItem>
                  <SelectItem value="lobbiesPlayed">⚡ Most Active</SelectItem>
                  <SelectItem value="totalPoints">💎 Total Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-card/95 dark:bg-card/40 backdrop-blur-lg border shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Full Achievement Board</CardTitle>
                <CardDescription>All players ranked by selected achievement metric</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>{t('player')}</TableHead>
                      <TableHead className="text-center">🏆 Won</TableHead>
                      <TableHead className="text-center">🎯 Top-4 Rate</TableHead>
                      <TableHead className="text-center">⚡ Lobbies</TableHead>
                      <TableHead className="text-center">📍 Avg. Place</TableHead>
                      <TableHead className="text-right">💎 Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achievementSortedPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {isLoading ? t('loading') : 'No players found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      achievementSortedPlayers.map((player, idx) => (
                        <TableRow key={player.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-bold">
                            <span className={`
                              ${idx === 0 ? "text-yellow-500" : ""}
                              ${idx === 1 ? "text-gray-400" : ""}
                              ${idx === 2 ? "text-amber-700" : ""}
                            `}>
                              #{idx + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Link href={`/players/${player.id}`} className="flex items-center group">
                              <Avatar className="h-8 w-8 mr-3">
                                <AvatarFallback className="text-xs">{player.username?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium group-hover:text-primary transition-colors">{player.username}</p>
                                {player.region && (
                                  <Badge variant="outline" className="text-[10px] mt-0.5">{player.region}</Badge>
                                )}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="flex items-center justify-center gap-1 font-medium">
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              {player.tournamentsWon || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={player.topFourRate && player.topFourRate >= 50 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {player.topFourRate || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{player.lobbiesPlayed || 0}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{player.averagePlacement?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{(player.totalPoints || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}