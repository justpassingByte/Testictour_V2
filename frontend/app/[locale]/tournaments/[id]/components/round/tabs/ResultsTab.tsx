"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ArrowUpDown, Download, Trophy } from "lucide-react"
import { PlayerRoundStats, IRound, ITournament } from "@/app/types/tournament"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLobby, setSelectedLobby] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("total")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const currentPhase = tournament.phases.find(p => p.id === round.phaseId)
  // Keep track of checkmate type but don't use it to change display mode
  const isCheckmate = currentPhase?.type === 'checkmate';

  const filteredPlayers = allPlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLobby = selectedLobby === "all" || player.lobbyName === selectedLobby
    const matchesStatus = selectedStatus === "all" || player.status === selectedStatus
    return matchesSearch && matchesLobby && matchesStatus
  })

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'total') {
      const multiplier = sortOrder === 'desc' ? 1 : -1;
      const scoreDiff = b.total - a.total;
      if (scoreDiff !== 0) {
        return scoreDiff * multiplier;
      }
      // Scores are equal, use last placement as tie-breaker (lower is better)
      const placementDiff = a.lastPlacement - b.lastPlacement;
      return placementDiff * multiplier;
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
            placeholder="Search players..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedLobby} onValueChange={setSelectedLobby}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Lobby" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lobbies</SelectItem>
              {round.lobbies?.map((lobby) => (
                <SelectItem key={lobby.id} value={lobby.name}>
                  {lobby.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="eliminated">Eliminated</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Lobby</TableHead>
                <TableHead className="text-center">Region</TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" onClick={() => handleSort("total")} className="h-auto p-0">
                    Total Points
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                {/* Always display individual matches, regardless of phase type */}
                {[...Array(numMatches).keys()].map(i => (
                  <TableHead key={i} className="text-center">
                    {isCheckmate && i === 0 ? (
                      <div className="flex items-center justify-center">
                        Match {i + 1}
                        {isCheckmate && <Trophy className="ml-1 h-3 w-3 text-yellow-500" />}
                      </div>
                    ) : (
                      <span>Match {i + 1}</span>
                    )}
                  </TableHead>
                ))}
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => {
                const rank = index + 1
                const isRewarded = isCheckmate && rank <= 4
                const displayStatus = isRewarded ? "rewarded" : player.status

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
                  {/* Always display individual matches, regardless of phase type */}
                  {[...Array(numMatches).keys()].map(i => (
                    <TableCell key={i} className="text-center">
                      {player.placements[i] !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span
                            className={`
                                inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1
                                ${player.placements[i] === 1 ? "bg-yellow-500/20 text-yellow-500" : ""}
                                ${player.placements[i] === 2 ? "bg-gray-400/20 text-gray-400" : ""}
                                ${player.placements[i] === 3 ? "bg-amber-700/20 text-amber-700" : ""}
                                ${player.placements[i] > 3 ? "bg-secondary" : ""}
                              `}
                          >
                            {player.placements[i]}
                          </span>
                          <span className="text-xs font-medium">{player.points[i]} pts</span>
                          {isCheckmate && player.placements[i] === 1 && i === player.placements.length - 1 && (
                            <Badge variant="outline" className="mt-1 bg-yellow-500/20 text-yellow-500 text-xs">
                              Winner
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`
                            ${displayStatus === "advanced" ? "bg-green-500/20 text-green-500" : ""}
                            ${displayStatus === "eliminated" ? "bg-red-500/20 text-red-500" : ""}
                            ${displayStatus === "rewarded" ? "bg-purple-500/20 text-purple-500" : ""}
                          `}
                    >
                      {displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/players/${player.id}`}>
                      <Button variant="ghost" size="sm">
                        View Profile
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