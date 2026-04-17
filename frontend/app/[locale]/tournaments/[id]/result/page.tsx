"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { ChevronRight, Trophy, Medal, Star, Download, Search, ArrowUpDown, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { SyncStatus } from "@/components/sync-status"
import { useTranslations } from "next-intl"
import api from "@/app/lib/apiConfig"
import { TournamentService } from "@/app/services/TournamentService"

interface FinalResult {
  rank: number
  userId: string
  player: string
  region: string
  totalPoints: number
  averagePlacement: number
  firstPlaces: number
  topFourRate: number
  prize?: string
}

interface RoundResult {
  round: number
  matches: { match: number; lobby: string; winner: string; avgPlacement: number }[]
}

interface TournamentInfo {
  id: string
  name: string
  status: string
  totalRounds: number
  totalPlayers: number
  prizePool: string | number
}

export default function TournamentResultsPage({ params }: { params: { id: string } }) {
  const t = useTranslations("common")

  const [tournament, setTournament] = useState<TournamentInfo | null>(null)
  const [finalResults, setFinalResults] = useState<FinalResult[]>([])
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [leaderboardTotal, setLeaderboardTotal] = useState(0)
  const LEADERBOARD_LIMIT = 50
  // Track whether initial data has been loaded to avoid skeleton flash on manual sync
  const hasLoadedRef = useRef(false)

  const fetchData = useCallback(async () => {
    try {
      // Only show full-screen skeleton on very first load
      if (!hasLoadedRef.current) setLoading(true)
      const tourRes = await api.get(`/tournaments/${params.id}`)

      const tour = tourRes.data?.data || tourRes.data
      const tourDetails = tour.tournament || tour
      setTournament({
        id: tourDetails.id,
        name: tourDetails.name,
        status: tourDetails.status,
        totalRounds: tourDetails.phases?.reduce((acc: number, p: any) => acc + (p.rounds?.length || 0), 0) || 0,
        totalPlayers: tourDetails.registered || tourDetails.participants?.length || 0,
        prizePool: tourDetails.prizePool || tourDetails.entryFee * (tourDetails.registered || 0) || "N/A",
      })

      // Use paginated leaderboard instead of fetching ALL participants
      const leaderboardRes = await TournamentService.paginatedLeaderboard(params.id, 1, LEADERBOARD_LIMIT)
      setLeaderboardTotal(leaderboardRes.total)
      setLeaderboardPage(1)
      
      const sorted = leaderboardRes.data || []
      setFinalResults(sorted.map((p: any, i: number) => ({
        rank: i + 1,
        userId: p.userId || p.id,
        player: p.user?.riotGameName || p.user?.username || p.inGameName || "Unknown",
        region: p.region || p.user?.region || "N/A",
        totalPoints: p.scoreTotal || 0,
        averagePlacement: p.stats?.averagePlacement || 0,
        firstPlaces: p.stats?.firstPlaces || 0,
        topFourRate: p.stats?.topFourRate ? p.stats.topFourRate * 100 : 0,
        prize: undefined,
      })))

      // Build round-by-round from phases
      if (tourDetails.phases?.length) {
        const rr: RoundResult[] = []
        for (const phase of tourDetails.phases) {
          for (const round of phase.rounds || []) {
            const matchRows: { match: number; lobby: string; winner: string; avgPlacement: number }[] = []
            for (const lobby of round.lobbies || []) {
              for (const match of lobby.matches || []) {
                const winner = match.results?.find((r: any) => r.placement === 1)
                const avgPlacement = match.results?.length
                  ? (match.results.reduce((s: number, r: any) => s + r.placement, 0) / match.results.length).toFixed(2)
                  : "N/A"
                matchRows.push({
                  match: matchRows.length + 1,
                  lobby: lobby.name || `Lobby ${lobby.id?.slice(-4)}`,
                  winner: winner?.user?.riotGameName || winner?.user?.username || "N/A",
                  avgPlacement: typeof avgPlacement === "string" ? parseFloat(avgPlacement) : avgPlacement,
                })
              }
            }
            if (matchRows.length) rr.push({ round: round.roundNumber || rr.length + 1, matches: matchRows })
          }
        }
        setRoundResults(rr)
      }
    } catch (err) {
      console.error("Failed to load tournament results:", err)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [params.id])

  // Load more leaderboard entries
  const loadMoreResults = useCallback(async () => {
    try {
      const nextPage = leaderboardPage + 1
      const res = await TournamentService.paginatedLeaderboard(params.id, nextPage, LEADERBOARD_LIMIT)
      const offset = (nextPage - 1) * LEADERBOARD_LIMIT
      const newResults = (res.data || []).map((p: any, i: number) => ({
        rank: offset + i + 1,
        userId: p.userId || p.id,
        player: p.user?.riotGameName || p.user?.username || p.inGameName || "Unknown",
        region: p.region || p.user?.region || "N/A",
        totalPoints: p.scoreTotal || 0,
        averagePlacement: p.stats?.averagePlacement || 0,
        firstPlaces: p.stats?.firstPlaces || 0,
        topFourRate: p.stats?.topFourRate ? p.stats.topFourRate * 100 : 0,
        prize: undefined,
      }))
      setFinalResults(prev => [...prev, ...newResults])
      setLeaderboardPage(nextPage)
    } catch (err) {
      console.error("Failed to load more results:", err)
    }
  }, [params.id, leaderboardPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredResults = finalResults.filter(r => {
    const matchesSearch = r.player.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRegion = selectedRegion === "all" || r.region === selectedRegion
    return matchesSearch && matchesRegion
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a] as number | string
    const bValue = b[sortBy as keyof typeof b] as number | string
    const multiplier = sortOrder === "asc" ? 1 : -1
    if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * multiplier
    return String(aValue).localeCompare(String(bValue)) * multiplier
  })

  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(column); setSortOrder("asc") }
  }

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const prizeDisplay = typeof tournament?.prizePool === "number"
    ? `$${tournament.prizePool.toLocaleString()}`
    : String(tournament?.prizePool || "N/A")

  return (
    <div className="container py-8">
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/">{t("home")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tournaments">{t("tournaments")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/tournaments/${params.id}`}>{tournament?.name || params.id}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{t("results")}</span>
        </div>
        <SyncStatus
          status={tournament?.status === 'in_progress' ? 'live' : 'idle'}
          onSync={fetchData}
        />
      </div>

      <div className="mt-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">{tournament?.name} - {t("final_standings")}</h1>
          <p className="text-muted-foreground">{t("performance_metrics")}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{finalResults[0]?.player || "—"}</p>
                  <p className="text-xs text-muted-foreground">{t("champion")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Medal className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{tournament?.totalPlayers ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("total_players")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{tournament?.totalRounds ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("total_rounds")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{prizeDisplay}</p>
                  <p className="text-xs text-muted-foreground">{t("prize_pool")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="final-standings" className="w-full">
          <TabsList>
            <TabsTrigger value="final-standings">{t("final_standings")}</TabsTrigger>
            {roundResults.length > 0 && (
              <TabsTrigger value="round-results">{t("round_by_round")}</TabsTrigger>
            )}
            <TabsTrigger value="statistics">{t("statistics")}</TabsTrigger>
          </TabsList>

          <TabsContent value="final-standings" className="space-y-4">
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
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
              <CardContent className="pt-6">
                {finalResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No results recorded yet for this tournament.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">
                          <Button variant="ghost" onClick={() => handleSort("rank")} className="h-auto p-0">
                            {t("rank")} <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort("player")} className="h-auto p-0">
                            {t("player")} <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">{t("region")}</TableHead>
                        <TableHead className="text-center">
                          <Button variant="ghost" onClick={() => handleSort("totalPoints")} className="h-auto p-0">
                            {t("total_points")} <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">
                          <Button variant="ghost" onClick={() => handleSort("averagePlacement")} className="h-auto p-0">
                            {t("avg_placement")} <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((result) => (
                        <TableRow key={result.userId} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {result.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 mr-1" />}
                              {result.rank === 2 && <Medal className="h-4 w-4 text-gray-400 mr-1" />}
                              {result.rank === 3 && <Medal className="h-4 w-4 text-amber-700 mr-1" />}
                              #{result.rank}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/players/${result.userId}`} className="hover:text-primary font-medium">
                              {result.player}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {result.region !== "N/A" && <Badge variant="outline">{result.region}</Badge>}
                          </TableCell>
                          <TableCell className="text-center font-bold">{result.totalPoints}</TableCell>
                          <TableCell className="text-center">
                            {result.averagePlacement > 0 ? result.averagePlacement.toFixed(2) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {finalResults.length < leaderboardTotal && (
                  <div className="flex justify-center py-4 border-t border-white/10">
                    <Button 
                      variant="outline" 
                      onClick={loadMoreResults}
                      className="rounded-full px-8"
                    >
                      {t("load_more_participants")} ({finalResults.length}/{leaderboardTotal})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {roundResults.length > 0 && (
            <TabsContent value="round-results" className="space-y-4">
              {roundResults.map((round) => (
                <Card key={round.round} className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                  <CardHeader>
                    <CardTitle>{t("rounds")} {round.round}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("match")}</TableHead>
                          <TableHead>{t("lobby")}</TableHead>
                          <TableHead>{t("winner")}</TableHead>
                          <TableHead className="text-center">{t("avg_placement")}</TableHead>
                          <TableHead className="text-right">{t("action")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {round.matches.map((match) => (
                          <TableRow key={`${round.round}-${match.match}`}>
                            <TableCell>{t("match")} {match.match}</TableCell>
                            <TableCell>{match.lobby}</TableCell>
                            <TableCell className="font-medium">{match.winner}</TableCell>
                            <TableCell className="text-center">{match.avgPlacement}</TableCell>
                            <TableCell className="text-right">
                              <Link href={`/tournaments/${params.id}/rounds/${round.round}`}>
                                <Button variant="ghost" size="sm">{t("view")}</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle>{t("regional_distribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {finalResults.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-4">
                      {["AP", "NA", "EUW", "KR"].map((region) => {
                        const count = finalResults.filter(r => r.region === region).length
                        const percentage = finalResults.length > 0 ? (count / finalResults.length) * 100 : 0
                        return (
                          <div key={region} className="space-y-2">
                            <div className="flex justify-between">
                              <span>{region}</span>
                              <span>{count} {t("players")} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle>{t("performance_metrics")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {finalResults.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No matches played yet</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>{t("avg_points")}:</span>
                        <span className="font-medium">
                          {(finalResults.reduce((sum, r) => sum + r.totalPoints, 0) / finalResults.length).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("participants")}:</span>
                        <span className="font-medium">{finalResults.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("rounds")}:</span>
                        <span className="font-medium">{tournament?.totalRounds ?? 0}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
