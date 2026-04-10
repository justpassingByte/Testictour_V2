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
  const [mainTab, setMainTab] = useState("rankings")
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await PlayerService.getLeaderboard(searchQuery || undefined, 50, 0)
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
  }, [searchQuery])

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === "totalPoints") return (b.totalPoints || 0) - (a.totalPoints || 0)
    if (sortBy === "lobbiesPlayed") return (b.lobbiesPlayed || 0) - (a.lobbiesPlayed || 0)
    if (sortBy === "topFourRate") return (b.topFourRate || 0) - (a.topFourRate || 0)
    if (sortBy === "tournamentsWon") return (b.tournamentsWon || 0) - (a.tournamentsWon || 0)
    if (sortBy === "username") return (a.username || "").localeCompare(b.username || "")
    return 0
  })

  const topPlayers = sortedPlayers.slice(0, 3)

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
            <div className="grid gap-4 md:grid-cols-3">
              {topPlayers.map((player, index) => (
                <Link href={`/players/${player.id}`} key={player.id}>
                  <Card
                    className={`
                      relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02]
                      ${index === 0 ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-card dark:to-transparent shadow-md" : ""}
                      ${index === 1 ? "border-gray-400/50 bg-gradient-to-br from-gray-400/10 via-slate-400/5 to-card dark:to-transparent shadow-md" : ""}
                      ${index === 2 ? "border-amber-700/50 bg-gradient-to-br from-amber-700/10 via-orange-700/5 to-card dark:to-transparent shadow-md" : ""}
                      card-hover-effect
                    `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`
                      absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg
                      ${index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600" : ""}
                      ${index === 1 ? "bg-gradient-to-br from-gray-300 to-slate-500" : ""}
                      ${index === 2 ? "bg-gradient-to-br from-amber-600 to-orange-800" : ""}
                    `}>
                      {index === 0 && <Crown className="h-5 w-5" />}
                      {index === 1 && <Medal className="h-5 w-5" />}
                      {index === 2 && <Medal className="h-5 w-5" />}
                    </div>

                    <CardContent className="pt-6 pb-5">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16 ring-2 ring-offset-2 ring-offset-background ring-primary/30">
                          <AvatarFallback className="text-lg font-bold">{player.username?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-bold text-lg truncate">{player.username}</h3>
                            {player.region && (
                              <Badge variant="outline" className="text-xs shrink-0">{player.region}</Badge>
                            )}
                          </div>
                          {player.riotGameName && (
                            <p className="text-sm text-muted-foreground truncate">{player.riotGameName}#{player.riotGameTag}</p>
                          )}
                          <div className="text-2xl font-black text-primary mt-1">
                            {(player.totalPoints || 0).toLocaleString()}{" "}
                            <span className="text-sm font-medium text-muted-foreground">pts</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{player.tournamentsWon || 0} {t('tournaments_won')}</span>
                            <span>·</span>
                            <span>{player.topFourRate || 0}% Top 4</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search_players')}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                    <TableHead className="text-center">{t('tournaments_won')}</TableHead>
                    <TableHead className="text-center">{t('top_four_rate')}</TableHead>
                    <TableHead className="text-center">{t('avg_placement')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                            #{idx + 1}
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
              <Select value={sortBy} onValueChange={setSortBy}>
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
                    {sortedPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {isLoading ? t('loading') : 'No players found'}
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