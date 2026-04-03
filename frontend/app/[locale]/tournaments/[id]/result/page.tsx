"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, Trophy, Medal, Star, Download, Search, ArrowUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"

// Mock tournament data
const tournament = {
  id: 1,
  name: "TFT Championship Series",
  status: "finished",
  totalRounds: 4,
  totalPlayers: 64,
  prizePool: "$15,000",
}

// Mock final results data
const finalResults = [
  {
    id: 1,
    rank: 1,
    player: "Player1",
    region: "AP",
    totalPoints: 89,
    averagePlacement: 2.1,
    firstPlaces: 8,
    topFourRate: 85,
    prize: "$5,000",
  },
  {
    id: 2,
    rank: 2,
    player: "Player2",
    region: "NA",
    totalPoints: 84,
    averagePlacement: 2.3,
    firstPlaces: 6,
    topFourRate: 82,
    prize: "$2,500",
  },
  {
    id: 3,
    rank: 3,
    player: "Player3",
    region: "KR",
    totalPoints: 81,
    averagePlacement: 2.5,
    firstPlaces: 5,
    topFourRate: 78,
    prize: "$1,500",
  },
  {
    id: 4,
    rank: 4,
    player: "Player4",
    region: "EUW",
    totalPoints: 78,
    averagePlacement: 2.7,
    firstPlaces: 4,
    topFourRate: 75,
    prize: "$1,000",
  },
  {
    id: 5,
    rank: 5,
    player: "Player5",
    region: "AP",
    totalPoints: 75,
    averagePlacement: 2.9,
    firstPlaces: 3,
    topFourRate: 72,
    prize: "$500",
  },
  {
    id: 6,
    rank: 6,
    player: "Player6",
    region: "NA",
    totalPoints: 72,
    averagePlacement: 3.1,
    firstPlaces: 2,
    topFourRate: 68,
    prize: "$500",
  },
  {
    id: 7,
    rank: 7,
    player: "Player7",
    region: "EUW",
    totalPoints: 69,
    averagePlacement: 3.3,
    firstPlaces: 2,
    topFourRate: 65,
    prize: "$250",
  },
  {
    id: 8,
    rank: 8,
    player: "Player8",
    region: "KR",
    totalPoints: 66,
    averagePlacement: 3.5,
    firstPlaces: 1,
    topFourRate: 62,
    prize: "$250",
  },
]

// Mock round-by-round data
const roundResults = [
  {
    round: 1,
    matches: [
      { match: 1, lobby: "Lobby 1", winner: "Player1", avgPlacement: 2.3 },
      { match: 2, lobby: "Lobby 1", winner: "Player2", avgPlacement: 2.1 },
      { match: 3, lobby: "Lobby 1", winner: "Player3", avgPlacement: 2.5 },
    ],
  },
  {
    round: 2,
    matches: [
      { match: 1, lobby: "Lobby 1", winner: "Player1", avgPlacement: 2.0 },
      { match: 2, lobby: "Lobby 1", winner: "Player4", avgPlacement: 2.8 },
      { match: 3, lobby: "Lobby 1", winner: "Player2", avgPlacement: 2.2 },
    ],
  },
  {
    round: 3,
    matches: [
      { match: 1, lobby: "Lobby 1", winner: "Player3", avgPlacement: 1.9 },
      { match: 2, lobby: "Lobby 1", winner: "Player1", avgPlacement: 2.1 },
    ],
  },
  {
    round: 4,
    matches: [{ match: 1, lobby: "Finals", winner: "Player1", avgPlacement: 1.8 }],
  },
]

export default function TournamentResultsPage({ params }: { params: { id: string } }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Filter and sort results
  const filteredResults = finalResults.filter((result) => {
    const matchesSearch = result.player.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRegion = selectedRegion === "all" || result.region === selectedRegion
    return matchesSearch && matchesRegion
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]
    const multiplier = sortOrder === "asc" ? 1 : -1

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier
    }
    return String(aValue).localeCompare(String(bValue)) * multiplier
  })

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tournaments">Tournaments</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/tournaments/${params.id}`}>{tournament.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Results</span>
        </div>
        <SyncStatus status="idle" />
      </div>

      <div className="mt-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">{tournament.name} - Final Results</h1>
          <p className="text-muted-foreground">Complete tournament results and statistics</p>
        </div>

        {/* Tournament Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{finalResults[0]?.player}</p>
                  <p className="text-xs text-muted-foreground">Champion</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Medal className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{tournament.totalPlayers}</p>
                  <p className="text-xs text-muted-foreground">Total Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{tournament.totalRounds}</p>
                  <p className="text-xs text-muted-foreground">Total Rounds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{tournament.prizePool}</p>
                  <p className="text-xs text-muted-foreground">Prize Pool</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="final-standings" className="w-full">
          <TabsList>
            <TabsTrigger value="final-standings">Final Standings</TabsTrigger>
            <TabsTrigger value="round-results">Round by Round</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="final-standings" className="space-y-4">
            {/* Filters */}
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
              <div className="flex gap-2">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
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

            {/* Final Standings Table */}
            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">
                        <Button variant="ghost" onClick={() => handleSort("rank")} className="h-auto p-0">
                          Rank
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("player")} className="h-auto p-0">
                          Player
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">Region</TableHead>
                      <TableHead className="text-center">
                        <Button variant="ghost" onClick={() => handleSort("totalPoints")} className="h-auto p-0">
                          Total Points
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">
                        <Button variant="ghost" onClick={() => handleSort("averagePlacement")} className="h-auto p-0">
                          Avg. Placement
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">
                        <Button variant="ghost" onClick={() => handleSort("firstPlaces")} className="h-auto p-0">
                          1st Places
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">
                        <Button variant="ghost" onClick={() => handleSort("topFourRate")} className="h-auto p-0">
                          Top 4 Rate
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">Prize</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((result) => (
                      <TableRow key={result.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {result.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 mr-1" />}
                            {result.rank === 2 && <Medal className="h-4 w-4 text-gray-400 mr-1" />}
                            {result.rank === 3 && <Medal className="h-4 w-4 text-amber-700 mr-1" />}#{result.rank}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/players/${result.id}`} className="hover:text-primary font-medium">
                            {result.player}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{result.region}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{result.totalPoints}</TableCell>
                        <TableCell className="text-center">{result.averagePlacement}</TableCell>
                        <TableCell className="text-center">{result.firstPlaces}</TableCell>
                        <TableCell className="text-center">{result.topFourRate}%</TableCell>
                        <TableCell className="text-center font-medium text-primary">{result.prize}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="round-results" className="space-y-4">
            {roundResults.map((round) => (
              <Card key={round.round} className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle>Round {round.round}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Match</TableHead>
                        <TableHead>Lobby</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead className="text-center">Avg. Placement</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {round.matches.map((match) => (
                        <TableRow key={`${round.round}-${match.match}`}>
                          <TableCell>Match {match.match}</TableCell>
                          <TableCell>{match.lobby}</TableCell>
                          <TableCell className="font-medium">{match.winner}</TableCell>
                          <TableCell className="text-center">{match.avgPlacement}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/tournaments/${params.id}/rounds/${round.round}`}>
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
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

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle>Regional Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["AP", "NA", "EUW", "KR"].map((region) => {
                      const count = finalResults.filter((r) => r.region === region).length
                      const percentage = (count / finalResults.length) * 100
                      return (
                        <div key={region} className="space-y-2">
                          <div className="flex justify-between">
                            <span>{region}</span>
                            <span>
                              {count} players ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Average Points per Player:</span>
                      <span className="font-medium">
                        {(finalResults.reduce((sum, r) => sum + r.totalPoints, 0) / finalResults.length).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Placement:</span>
                      <span className="font-medium">
                        {(finalResults.reduce((sum, r) => sum + r.averagePlacement, 0) / finalResults.length).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total First Places:</span>
                      <span className="font-medium">{finalResults.reduce((sum, r) => sum + r.firstPlaces, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Top 4 Rate:</span>
                      <span className="font-medium">
                        {(finalResults.reduce((sum, r) => sum + r.topFourRate, 0) / finalResults.length).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
