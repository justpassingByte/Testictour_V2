"use client"

import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Trophy, Medal, Users, Crown, Loader2 } from "lucide-react"
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

  // Fetch real players from public leaderboard endpoint
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
    // Debounce search
    const timer = setTimeout(fetchData, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Sort players locally by selected column
  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === "totalPoints") return (b.totalPoints || 0) - (a.totalPoints || 0)
    if (sortBy === "lobbiesPlayed") return (b.lobbiesPlayed || 0) - (a.lobbiesPlayed || 0)
    if (sortBy === "topFourRate") return (b.topFourRate || 0) - (a.topFourRate || 0)
    if (sortBy === "tournamentsWon") return (b.tournamentsWon || 0) - (a.tournamentsWon || 0)
    if (sortBy === "username") return (a.username || "").localeCompare(b.username || "")
    return 0
  })

  // Top 3 for podium
  const topPlayers = sortedPlayers.slice(0, 3)

  if (isLoading && players.length === 0) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('loading_tournaments', { defaultValue: 'Loading...' })}</p>
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
            <span className="gradient-text">{t('global_leaderboard', { defaultValue: 'Global Leaderboard' })}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('leaderboard_merged_description', {
              defaultValue: 'Rankings, player profiles, and regional statistics — all in one place.'
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm py-1">
            {total} {t('players', { defaultValue: 'Players' })}
          </Badge>
          <SyncStatus status="live" />
        </div>
      </div>

      {/* Main Tabs: Rankings / Players */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="rankings" className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4" />
            {t('rankings_tab', { defaultValue: 'Rankings' })}
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            {t('players_tab', { defaultValue: 'Players' })}
          </TabsTrigger>
        </TabsList>

        {/* ===================== RANKINGS TAB ===================== */}
        <TabsContent value="rankings" className="space-y-8 mt-6">
          {/* Top 3 Podium */}
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
                    {/* Rank badge */}
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
                          <div className="text-2xl font-black text-primary mt-1">{(player.totalPoints || 0).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">pts</span></div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{player.tournamentsWon || 0} {t('tournaments_won', { defaultValue: 'Won' })}</span>
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

          {/* Filters */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search_players', { defaultValue: 'Search players...' })}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Main Leaderboard Table */}
          <Card className="bg-card/95 dark:bg-card/40 backdrop-blur-lg border shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle>{t('player_rankings', { defaultValue: 'Player Rankings' })}</CardTitle>
              <CardDescription>
                {t('updated_rankings', { defaultValue: 'Rankings updated after each tournament' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">{t('rank', { defaultValue: 'Rank' })}</TableHead>
                    <TableHead>{t('player', { defaultValue: 'Player' })}</TableHead>
                    <TableHead>{t('summoner_name', { defaultValue: 'Summoner' })}</TableHead>
                    <TableHead className="text-center">{t('region', { defaultValue: 'Region' })}</TableHead>
                    <TableHead className="text-right">{t('points', { defaultValue: 'Points' })}</TableHead>
                    <TableHead className="text-center">{t('tournaments_won', { defaultValue: 'Won' })}</TableHead>
                    <TableHead className="text-center">{t('top_four_rate', { defaultValue: 'Top 4 Rate' })}</TableHead>
                    <TableHead className="text-center">{t('avg_placement', { defaultValue: 'Avg Place' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {isLoading ? t('loading_tournaments', { defaultValue: 'Loading...' }) : searchQuery ? t('no_tournaments_match_criteria', { defaultValue: 'No players match your search' }) : 'No players found'}
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
                        <TableCell className="text-right font-bold text-primary">{(player.totalPoints || 0).toLocaleString()}</TableCell>
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

        {/* ===================== PLAYERS DIRECTORY TAB ===================== */}
        <TabsContent value="players" className="space-y-8 mt-6">
          {/* Featured Players */}
          {topPlayers.length > 0 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">{t('featured_players', { defaultValue: 'Featured Players' })}</h2>
                <p className="text-muted-foreground">{t('featured_players_description', { defaultValue: 'Top performing players' })}</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {topPlayers.map((player, index) => (
                  <Card
                    key={player.id}
                    className={`
                      overflow-hidden transition-all duration-500 hover:scale-[1.02]
                      ${index === 0 ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-card dark:to-transparent shadow-md" : ""}
                      ${index === 1 ? "border-gray-400/50 bg-gradient-to-br from-gray-400/10 to-card dark:to-transparent shadow-md" : ""}
                      ${index === 2 ? "border-amber-700/50 bg-gradient-to-br from-amber-700/10 to-card dark:to-transparent shadow-md" : ""}
                      card-hover-effect
                    `}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="text-lg">{player.username?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className={`
                            absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md
                            ${index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600" : ""}
                            ${index === 1 ? "bg-gradient-to-br from-gray-300 to-slate-500" : ""}
                            ${index === 2 ? "bg-gradient-to-br from-amber-600 to-orange-800" : ""}
                          `}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold truncate">{player.username}</h3>
                          {player.riotGameName && (
                            <p className="text-sm text-muted-foreground">{player.riotGameName}#{player.riotGameTag}</p>
                          )}
                          {player.rank && player.rank !== 'Unknown' && (
                            <Badge variant="secondary" className="mt-1 text-xs">{player.rank}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{t('total_points', { defaultValue: 'Total Points' })}:</span>
                          <span className="font-bold text-primary">{(player.totalPoints || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{t('tournaments_won', { defaultValue: 'Won' })}:</span>
                          <span className="font-medium">{player.tournamentsWon || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{t('top_four_rate', { defaultValue: 'Top 4 Rate' })}:</span>
                          <span className="font-medium">{player.topFourRate || 0}%</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Link href={`/players/${player.id}`}>
                          <Button className="w-full">
                            {t('view_profile', { defaultValue: 'View Profile' })}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Player Directory Table */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{t('player_directory', { defaultValue: 'Player Directory' })}</h2>
              <p className="text-muted-foreground">{t('player_directory_description', { defaultValue: 'Browse all registered players' })}</p>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('search_players', { defaultValue: 'Search players...' })}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('sort_by', { defaultValue: 'Sort by' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalPoints">{t('total_points', { defaultValue: 'Total Points' })}</SelectItem>
                  <SelectItem value="tournamentsWon">{t('tournaments_won', { defaultValue: 'Won' })}</SelectItem>
                  <SelectItem value="topFourRate">{t('top_four_rate', { defaultValue: 'Top 4 Rate' })}</SelectItem>
                  <SelectItem value="lobbiesPlayed">{t('match_history', { defaultValue: 'Games' })}</SelectItem>
                  <SelectItem value="username">{t('player', { defaultValue: 'Name' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-card/95 dark:bg-card/40 backdrop-blur-lg border shadow-sm">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('player', { defaultValue: 'Player' })}</TableHead>
                      <TableHead>{t('summoner_name', { defaultValue: 'Summoner' })}</TableHead>
                      <TableHead className="text-center">{t('region', { defaultValue: 'Region' })}</TableHead>
                      <TableHead className="text-center">{t('total_points', { defaultValue: 'Points' })}</TableHead>
                      <TableHead className="text-center">{t('tournaments_won', { defaultValue: 'Won' })}</TableHead>
                      <TableHead className="text-center">{t('top_four_rate', { defaultValue: 'Top 4 %' })}</TableHead>
                      <TableHead className="text-right">{t('action', { defaultValue: 'Action' })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {isLoading ? 'Loading...' : 'No players found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedPlayers.map((player) => (
                        <TableRow key={player.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{player.username?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                              <div className="font-medium">{player.username}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {player.riotGameName ? `${player.riotGameName}#${player.riotGameTag}` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {player.region ? <Badge variant="outline" className="text-xs">{player.region}</Badge> : '-'}
                          </TableCell>
                          <TableCell className="text-center font-bold text-primary">{(player.totalPoints || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-center">{player.tournamentsWon || 0}</TableCell>
                          <TableCell className="text-center">{player.topFourRate || 0}%</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/players/${player.id}`}>
                              <Button variant="ghost" size="sm">
                                {t('view_profile', { defaultValue: 'View Profile' })}
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}