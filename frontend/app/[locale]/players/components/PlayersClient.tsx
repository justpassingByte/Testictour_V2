"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Filter, Trophy, TrendingUp, ArrowRight } from "lucide-react"
import { useTranslations } from 'next-intl'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { SyncStatus } from "@/components/sync-status"
import { PlayerService, LeaderboardPlayer } from "@/app/services/PlayerService"

function getRankColor(rank: string) {
  if (rank?.includes("Challenger")) return "bg-purple-500/20 text-purple-500"
  if (rank?.includes("Grandmaster")) return "bg-red-500/20 text-red-500"
  if (rank?.includes("Master")) return "bg-blue-500/20 text-blue-500"
  if (rank?.includes("Diamond")) return "bg-cyan-500/20 text-cyan-500"
  if (rank?.includes("Emerald")) return "bg-emerald-500/20 text-emerald-500"
  if (rank?.includes("Platinum")) return "bg-teal-500/20 text-teal-500"
  if (rank?.includes("Gold")) return "bg-yellow-500/20 text-yellow-500"
  return "bg-muted text-muted-foreground"
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

export default function PlayersClient() {
  const t = useTranslations('common')
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedRank, setSelectedRank] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("totalPoints")

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        const result = await PlayerService.getLeaderboard(undefined, 100)
        setPlayers(result.data || [])
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlayers()
  }, [])

  // Debounced search via API
  useEffect(() => {
    if (!searchQuery) return
    const timeout = setTimeout(async () => {
      try {
        const result = await PlayerService.getLeaderboard(searchQuery, 100)
        setPlayers(result.data || [])
      } catch (err) {
        console.error("Search failed:", err)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const filtered = players.filter(p => {
    const matchesRegion = selectedRegion === "all" || p.region === selectedRegion
    const matchesRank = selectedRank === "all" || (p.rank || "").includes(selectedRank)
    return matchesRegion && matchesRank
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "totalPoints") return (b.totalPoints ?? 0) - (a.totalPoints ?? 0)
    if (sortBy === "tournamentsWon") return (b.tournamentsWon ?? 0) - (a.tournamentsWon ?? 0)
    if (sortBy === "averagePlacement") return (a.averagePlacement ?? 9) - (b.averagePlacement ?? 9)
    if (sortBy === "topFourRate") return (b.topFourRate ?? 0) - (a.topFourRate ?? 0)
    return 0
  })

  const featured = sorted.slice(0, 3)

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{t("players")}</h1>
          <p className="text-muted-foreground">{t("players_description")}</p>
        </div>
        <SyncStatus status="live" />
      </div>

      {/* Featured Players */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("featured_players")}</h2>
          <p className="text-muted-foreground">{t("featured_players_description")}</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((player, index) => (
              <Card
                key={player.id}
                className={`card-hover-effect ${
                  index === 0 ? "border-yellow-500/50 bg-yellow-500/5" :
                  index === 1 ? "border-gray-400/50 bg-gray-400/5" :
                  "border-amber-700/50 bg-amber-700/5"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-lg">
                          {(player.riotGameName || player.username || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-700"
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-bold">{player.riotGameName || player.username}</h3>
                        {player.region && <Badge variant="outline">{player.region}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{player.rank || "Unranked"}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("total_points")}:</span>
                      <span className="font-bold text-primary">{(player.totalPoints ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("tournaments_won")}:</span>
                      <span className="font-medium">{player.tournamentsWon ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("top_four_rate")}:</span>
                      <span className="font-medium">{((player.topFourRate ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Link href={`/players/${player.id}`}>
                      <Button className="w-full">
                        {t("view_profile")} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Player Directory */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("player_directory")}</h2>
          <p className="text-muted-foreground">{t("player_directory_description")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search_players")}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("region")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_regions")}</SelectItem>
                <SelectItem value="AP">AP</SelectItem>
                <SelectItem value="NA">NA</SelectItem>
                <SelectItem value="EUW">EUW</SelectItem>
                <SelectItem value="KR">KR</SelectItem>
                <SelectItem value="OCE">OCE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedRank} onValueChange={setSelectedRank}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("rank")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_ranks")}</SelectItem>
                <SelectItem value="Challenger">Challenger</SelectItem>
                <SelectItem value="Grandmaster">Grandmaster</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="Diamond">Diamond</SelectItem>
                <SelectItem value="Emerald">Emerald</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("sort_by")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalPoints">{t("total_points")}</SelectItem>
                <SelectItem value="tournamentsWon">{t("tournaments_won")}</SelectItem>
                <SelectItem value="averagePlacement">{t("avg_placement")}</SelectItem>
                <SelectItem value="topFourRate">{t("top_four_rate")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">{t("all_players")}</TabsTrigger>
            <TabsTrigger value="champions">{t("champions")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? <LeaderboardSkeleton /> : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{t("player")}</TableHead>
                        <TableHead className="text-center">{t("region")}</TableHead>
                        <TableHead className="text-center">{t("rank")}</TableHead>
                        <TableHead className="text-center">{t("total_points")}</TableHead>
                        <TableHead className="text-center">{t("tournaments")}</TableHead>
                        <TableHead className="text-center">{t("wins")}</TableHead>
                        <TableHead className="text-center">{t("avg_placement")}</TableHead>
                        <TableHead className="text-center">{t("top_four_rate")}</TableHead>
                        <TableHead className="text-right">{t("action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((player, i) => (
                        <TableRow key={player.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {(player.riotGameName || player.username || "?").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{player.riotGameName || player.username}</div>
                                {player.riotGameTag && (
                                  <div className="text-xs text-muted-foreground">#{player.riotGameTag}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {player.region && <Badge variant="outline">{player.region}</Badge>}
                          </TableCell>
                          <TableCell className="text-center">
                            {player.rank && (
                              <Badge variant="outline" className={getRankColor(player.rank)}>{player.rank}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold">{(player.totalPoints ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-center">{player.tournamentsPlayed ?? 0}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                              {player.tournamentsWon ?? 0}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{(player.averagePlacement ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-center">{((player.topFourRate ?? 0) * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/players/${player.id}`}>
                              <Button variant="ghost" size="sm">{t("view_profile")}</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sorted.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No players found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="champions" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.filter(p => (p.tournamentsWon ?? 0) > 0).map(player => (
                <PlayerCard key={player.id} player={player} showWins />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

function PlayerCard({ player, showWins = false }: { player: LeaderboardPlayer; showWins?: boolean }) {
  const t = useTranslations('common')
  return (
    <Card className="card-hover-effect">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{(player.riotGameName || player.username || "?").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">{player.riotGameName || player.username}</CardTitle>
              {showWins && <Trophy className="h-4 w-4 text-yellow-500" />}
            </div>
            <div className="flex items-center space-x-2">
              {player.region && <Badge variant="outline">{player.region}</Badge>}
              {player.rank && <Badge variant="outline" className={`text-xs ${getRankColor(player.rank)}`}>{player.rank}</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">{t("total_points")}</div>
            <div className="font-bold text-primary">{(player.totalPoints ?? 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("tournaments")}</div>
            <div className="font-medium">{player.tournamentsPlayed ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("wins")}</div>
            <div className="font-medium">{player.tournamentsWon ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("top_four_rate")}</div>
            <div className="font-medium">{((player.topFourRate ?? 0) * 100).toFixed(1)}%</div>
          </div>
        </div>
        <Link href={`/players/${player.id}`}>
          <Button variant="outline" className="w-full">{t("view_profile")}</Button>
        </Link>
      </CardContent>
    </Card>
  )
}