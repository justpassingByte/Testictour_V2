"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ArrowUpDown, Download, Trophy } from "lucide-react"
import { PlayerRoundStats, IRound, ITournament } from "@/app/types/tournament"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ResultsTabProps {
  round: IRound
  tournament: ITournament
  allPlayers: PlayerRoundStats[]
  numMatches: number
}

export function ResultsTab({ round, tournament, allPlayers, numMatches }: ResultsTabProps) {
  const t = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLobby, setSelectedLobby] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("total")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Show all columns up to numMatches (which is controlled by the parent limitMatch or max completed match)
  // This ensures that 'in-progress' matches safely show a TBD placeholder column instead of disappearing
  const actualMatchColumns = [...Array(numMatches).keys()];

  const currentPhase = tournament.phases.find(p => p.id === round.phaseId)
  // Keep track of checkmate type but don't use it to change display mode
  const isCheckmate = currentPhase?.type === 'checkmate';

  const filteredPlayers = allPlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLobby = selectedLobby === "all" || player.lobbyName === selectedLobby
    const matchesStatus = selectedStatus === "all" || player.status === selectedStatus
    return matchesSearch && matchesLobby && matchesStatus
  })

  /**
   * Swiss tiebreak comparator (used when total points are equal):
   * 1. Total points (primary — handled by caller)
   * 2. Sum of placements lower = better (e.g. 1+2+3=6 beats 3+4+5=12)
   * 3. Count of 1st-place finishes (more = better)
   * 4. Best single-match placement (lower = better)
   */
  const swissTiebreak = (a: PlayerRoundStats, b: PlayerRoundStats): number => {
    // TB1: Sum of placements (ascending — lower total placement = better average)
    const sumA = a.placements.reduce((s, p) => s + p, 0);
    const sumB = b.placements.reduce((s, p) => s + p, 0);
    if (sumA !== sumB) return sumA - sumB;

    // TB2: Count of 1st-place finishes (descending)
    const wins = (p: PlayerRoundStats) => p.placements.filter(pl => pl === 1).length;
    const winDiff = wins(b) - wins(a);
    if (winDiff !== 0) return winDiff;

    // TB3: Best single placement (ascending)
    const bestA = a.placements.length > 0 ? Math.min(...a.placements) : Infinity;
    const bestB = b.placements.length > 0 ? Math.min(...b.placements) : Infinity;
    if (bestA !== bestB) return bestA - bestB;

    // TB4: Most recent placement (ascending)
    const recentA = a.placements.length > 0 ? a.placements[a.placements.length - 1] : Infinity;
    const recentB = b.placements.length > 0 ? b.placements[b.placements.length - 1] : Infinity;
    return recentA - recentB;
  };

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'total') {
      const multiplier = sortOrder === 'desc' ? 1 : -1;
      const scoreDiff = b.total - a.total;
      if (scoreDiff !== 0) return scoreDiff * multiplier;
      // Scores equal → apply Swiss tiebreak (direction preserved by multiplier)
      return swissTiebreak(a, b) * multiplier;
    }

    // Fallback for other columns
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
      setSortOrder("desc")
    }
  }

  return (
    <div className="space-y-4">
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
          <Select value={selectedLobby} onValueChange={setSelectedLobby}>
            <SelectTrigger className="w-[120px]" aria-label="Filter by Lobby">
              <SelectValue placeholder={t("lobby")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_lobbies")}</SelectItem>
              {round.lobbies?.map((lobby) => (
                <SelectItem key={lobby.id} value={lobby.name}>
                  {lobby.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[120px]" aria-label="Filter by Status">
              <SelectValue placeholder={t("status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_status")}</SelectItem>
              <SelectItem value="advanced">{t("advanced")}</SelectItem>
              <SelectItem value="eliminated">{t("eliminated")}</SelectItem>
              <SelectItem value="pending">{t("awaiting")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="Download Filtered Results">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <Card className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("player")}</TableHead>
                <TableHead className="text-center">{t("lobby")}</TableHead>
                <TableHead className="text-center">{t("region")}</TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" onClick={() => handleSort("total")} className="h-auto p-0">
                    {t("total_points")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                {/* Only render match columns that have actual score data */}
                {actualMatchColumns.map(i => (
                  <TableHead key={i} className="text-center">
                    {isCheckmate && i === 0 ? (
                      <div className="flex items-center justify-center">
                        {t("match")} {i + 1}
                        {isCheckmate && <Trophy className="ml-1 h-3 w-3 text-yellow-500" />}
                      </div>
                    ) : (
                      <span>{t("match")} {i + 1}</span>
                    )}
                  </TableHead>
                ))}
                <TableHead className="text-center">{t("status")}</TableHead>
                <TableHead className="text-right">{t("action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => {
                const rank = index + 1
                const isTournamentCompleted = tournament.status === 'COMPLETED'
                const prizeStructure = tournament.prizeStructure as number[] | null
                const hasPrize = isTournamentCompleted && prizeStructure && rank <= prizeStructure.length && (prizeStructure[rank - 1] || 0) > 0
                const displayStatus = hasPrize ? "rewarded" : (isTournamentCompleted && player.status === "advanced" ? "completed" : player.status)

                return (
                <TableRow key={player.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/players/${player.id}`} className="hover:text-primary font-medium">
                      {player.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{player.lobbyName}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{player.region}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold">{player.total}</TableCell>
                  {/* Only render match columns that have actual score data */}
                  {actualMatchColumns.map(i => (
                    <TableCell key={i} className="text-center">
                      {player.placements[i] !== undefined ? (
                        <div className="flex flex-col items-center">
                            <span
                              className={`
                                  inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1
                                  ${player.placements[i] === 1 ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-500" : ""}
                                  ${player.placements[i] === 2 ? "bg-gray-400/20 text-gray-700 dark:text-gray-300" : ""}
                                  ${player.placements[i] === 3 ? "bg-amber-500/20 text-amber-700 dark:text-amber-500" : ""}
                                  ${player.placements[i] > 3 ? "bg-secondary text-secondary-foreground" : ""}
                                `}
                            >
                              {player.placements[i]}
                            </span>
                            <span className="text-xs font-medium">{player.points[i]} pts</span>
                            {isCheckmate && player.placements[i] === 1 && i === player.placements.length - 1 && (
                              <Badge variant="outline" className="mt-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 text-xs">
                              {t("winner")}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground opacity-50 bg-transparent uppercase text-[10px]">TBD</Badge>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`
                              ${displayStatus === "advanced" ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}
                              ${displayStatus === "eliminated" ? "bg-red-500/20 text-red-700 dark:text-red-400" : ""}
                              ${displayStatus === "rewarded" ? "bg-purple-500/20 text-purple-700 dark:text-purple-400" : ""}
                              ${displayStatus === "completed" ? "bg-blue-500/20 text-blue-700 dark:text-blue-400" : ""}
                              ${displayStatus === "pending" ? "bg-slate-500/20 text-slate-700 dark:text-slate-400" : ""}
                            `}
                      >
                        {displayStatus === "pending" ? t("awaiting") : displayStatus === "completed" ? t("finished") : t(displayStatus as any)}
                      </Badge>
                      {hasPrize && prizeStructure && (
                        <span className="text-xs font-bold text-amber-400">
                          🏆 ${((prizeStructure[rank - 1] / 100) * (tournament.budget || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/players/${player.id}`}>
                      <Button variant="ghost" size="sm">
                        {t("view_profile")}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}