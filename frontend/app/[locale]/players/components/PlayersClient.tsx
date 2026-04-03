"use client"

import { useState } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SyncStatus } from "@/components/sync-status"

// Mock players data
const players = [
  {
    id: 1,
    name: "TFTMaster2024",
    summonerName: "TFTMaster2024",
    region: "AP",
    level: 312,
    rank: "Diamond 2",
    totalPoints: 2847,
    tournamentsPlayed: 12,
    tournamentsWon: 3,
    averagePlacement: 2.1,
    topFourRate: 89,
    winStreak: 8,
    lastActive: "2025-06-16",
    status: "active",
    recentTournaments: [
      { name: "TFT Championship Series", placement: 1, points: 89 },
      { name: "Weekend Warriors Cup", placement: 3, points: 67 },
      { name: "Global TFT Masters", placement: 2, points: 84 },
    ],
  },
  {
    id: 2,
    name: "ChampionPlayer",
    summonerName: "ChampionPlayer",
    region: "NA",
    level: 298,
    rank: "Master",
    totalPoints: 2756,
    tournamentsPlayed: 15,
    tournamentsWon: 2,
    averagePlacement: 2.3,
    topFourRate: 85,
    winStreak: 5,
    lastActive: "2025-06-15",
    status: "active",
    recentTournaments: [
      { name: "NA Championship", placement: 2, points: 78 },
      { name: "Summer Showdown", placement: 1, points: 92 },
      { name: "Regional Masters", placement: 4, points: 56 },
    ],
  },
  {
    id: 3,
    name: "ProGamer123",
    summonerName: "ProGamer123",
    region: "EUW",
    level: 345,
    rank: "Grandmaster",
    totalPoints: 2689,
    tournamentsPlayed: 10,
    tournamentsWon: 4,
    averagePlacement: 2.0,
    topFourRate: 92,
    winStreak: 12,
    lastActive: "2025-06-16",
    status: "active",
    recentTournaments: [
      { name: "European Cup", placement: 1, points: 95 },
      { name: "EUW Masters", placement: 1, points: 88 },
      { name: "Continental Series", placement: 2, points: 76 },
    ],
  },
  {
    id: 4,
    name: "KoreanLegend",
    summonerName: "KoreanLegend",
    region: "KR",
    level: 387,
    rank: "Challenger",
    totalPoints: 2634,
    tournamentsPlayed: 8,
    tournamentsWon: 2,
    averagePlacement: 1.9,
    topFourRate: 94,
    winStreak: 3,
    lastActive: "2025-06-14",
    status: "active",
    recentTournaments: [
      { name: "Korean Championship", placement: 1, points: 98 },
      { name: "Seoul Invitational", placement: 2, points: 82 },
      { name: "Asia Masters", placement: 1, points: 91 },
    ],
  },
  {
    id: 5,
    name: "EUWChampion",
    summonerName: "EUWChampion",
    region: "EUW",
    level: 276,
    rank: "Diamond 1",
    totalPoints: 2578,
    tournamentsPlayed: 11,
    tournamentsWon: 1,
    averagePlacement: 2.4,
    topFourRate: 82,
    winStreak: 2,
    lastActive: "2025-06-16",
    status: "active",
    recentTournaments: [
      { name: "European Open", placement: 3, points: 64 },
      { name: "Regional Cup", placement: 5, points: 48 },
      { name: "EUW Series", placement: 2, points: 73 },
    ],
  },
  {
    id: 6,
    name: "NAProdigy",
    summonerName: "NAProdigy",
    region: "NA",
    level: 234,
    rank: "Diamond 3",
    totalPoints: 2523,
    tournamentsPlayed: 9,
    tournamentsWon: 1,
    averagePlacement: 2.6,
    topFourRate: 78,
    winStreak: 1,
    lastActive: "2025-06-15",
    status: "active",
    recentTournaments: [
      { name: "NA Open", placement: 4, points: 52 },
      { name: "Rising Stars", placement: 1, points: 89 },
      { name: "Regional Qualifier", placement: 6, points: 42 },
    ],
  },
]

// Mock featured players
const featuredPlayers = players.slice(0, 3)

export default function PlayersClient() {
  const t = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedRank, setSelectedRank] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("totalPoints")

  // Filter players based on search, region, and rank
  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.summonerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRegion = selectedRegion === "all" || player.region === selectedRegion
    const matchesRank = selectedRank === "all" || player.rank.includes(selectedRank)

    return matchesSearch && matchesRegion && matchesRank
  })

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]

    if (typeof aValue === "number" && typeof bValue === "number") {
      return bValue - aValue // Descending order for numbers
    }
    return String(aValue).localeCompare(String(bValue))
  })

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{t("players")}</h1>
          <p className="text-muted-foreground">
            {t("players_description", { defaultValue: "Discover top TFT players, view their statistics, and track their tournament performance." })}
          </p>
        </div>
        <SyncStatus status="live" />
      </div>

      {/* Featured Players */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("featured_players")}</h2>
          <p className="text-muted-foreground">{t("featured_players_description", { defaultValue: "Top performing players in recent tournaments" })}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {featuredPlayers.map((player, index) => (
            <Card
              key={player.id}
              className={`
                ${index === 0 ? "border-yellow-500/50 bg-yellow-500/5" : ""}
                ${index === 1 ? "border-gray-400/50 bg-gray-400/5" : ""}
                ${index === 2 ? "border-amber-700/50 bg-amber-700/5" : ""}
                card-hover-effect
              `}
            >
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={`/placeholder.svg?height=64&width=64`} alt={player.name} />
                      <AvatarFallback className="text-lg">{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div
                      className={`
                        absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                        ${index === 0 ? "bg-yellow-500" : ""}
                        ${index === 1 ? "bg-gray-400" : ""}
                        ${index === 2 ? "bg-amber-700" : ""}
                      `}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold">{player.name}</h3>
                      <Badge variant="outline">{player.region}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{player.rank}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("total_points")}:</span>
                    <span className="font-bold text-primary">{player.totalPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("tournaments_won")}:</span>
                    <span className="font-medium">{player.tournamentsWon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("top_four_rate")}:</span>
                    <span className="font-medium">{player.topFourRate}%</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href={`/players/${player.id}`}>
                    <Button className="w-full">
                      {t("view_profile")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Player Directory */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("player_directory")}</h2>
          <p className="text-muted-foreground">{t("player_directory_description", { defaultValue: "Browse and search through all registered players" })}</p>
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
            <TabsTrigger value="active">{t("active_players")}</TabsTrigger>
            <TabsTrigger value="rising">{t("rising_stars")}</TabsTrigger>
            <TabsTrigger value="champions">{t("champions")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("player")}</TableHead>
                      <TableHead className="text-center">{t("region")}</TableHead>
                      <TableHead className="text-center">{t("rank")}</TableHead>
                      <TableHead className="text-center">{t("total_points")}</TableHead>
                      <TableHead className="text-center">{t("tournaments")}</TableHead>
                      <TableHead className="text-center">{t("wins")}</TableHead>
                      <TableHead className="text-center">{t("avg_placement")}</TableHead>
                      <TableHead className="text-center">{t("top_four_rate")}</TableHead>
                      <TableHead className="text-center">{t("status")}</TableHead>
                      <TableHead className="text-right">{t("action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlayers.map((player) => (
                      <TableRow key={player.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={player.name} />
                              <AvatarFallback className="text-xs">{player.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-sm text-muted-foreground">{player.summonerName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{player.region}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`
                              ${player.rank.includes("Challenger") ? "bg-purple-500/20 text-purple-500" : ""}
                              ${player.rank.includes("Grandmaster") ? "bg-red-500/20 text-red-500" : ""}
                              ${player.rank.includes("Master") ? "bg-blue-500/20 text-blue-500" : ""}
                              ${player.rank.includes("Diamond") ? "bg-cyan-500/20 text-cyan-500" : ""}
                            `}
                          >
                            {player.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{player.totalPoints.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{player.tournamentsPlayed}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                            {player.tournamentsWon}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{player.averagePlacement}</TableCell>
                        <TableCell className="text-center">{player.topFourRate}%</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`
                              ${player.status === "active" ? "bg-green-500/20 text-green-500" : ""}
                              ${player.status === "inactive" ? "bg-gray-500/20 text-gray-500" : ""}
                            `}
                          >
                            {t(player.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/players/${player.id}`}>
                            <Button variant="ghost" size="sm">
                              {t("view_profile")}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPlayers
                .filter((player) => player.status === "active")
                .map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="rising" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPlayers
                .filter((player) => player.winStreak >= 3)
                .map((player) => (
                  <PlayerCard key={player.id} player={player} showTrend />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="champions" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPlayers
                .filter((player) => player.tournamentsWon > 0)
                .map((player) => (
                  <PlayerCard key={player.id} player={player} showWins />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

function PlayerCard({
  player,
  showTrend = false,
  showWins = false,
}: {
  player: any
  showTrend?: boolean
  showWins?: boolean
}) {
  const t = useTranslations('common');
  
  return (
    <Card className="card-hover-effect">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`/placeholder.svg?height=48&width=48`} alt={player.name} />
            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">{player.name}</CardTitle>
              {showTrend && <TrendingUp className="h-4 w-4 text-green-500" />}
              {showWins && <Trophy className="h-4 w-4 text-yellow-500" />}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{player.region}</Badge>
              <Badge variant="outline" className="text-xs">
                {player.rank}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">{t("total_points")}</div>
            <div className="font-bold text-primary">{player.totalPoints.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("tournaments")}</div>
            <div className="font-medium">{player.tournamentsPlayed}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("wins")}</div>
            <div className="font-medium">{player.tournamentsWon}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("top_four_rate")}</div>
            <div className="font-medium">{player.topFourRate}%</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t("recent_tournaments")}</div>
          <div className="space-y-1">
            {player.recentTournaments.slice(0, 2).map((tournament: any, index: number) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{tournament.name}</span>
                <span className="font-medium">#{tournament.placement}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href={`/players/${player.id}`}>
          <Button variant="outline" className="w-full">
            {t("view_profile")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
} 