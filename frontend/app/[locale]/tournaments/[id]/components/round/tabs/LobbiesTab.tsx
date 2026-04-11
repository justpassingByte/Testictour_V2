"use client"

import { useState } from "react"
import Link from "next/link"
import { PlayerRoundStats, IRound, LobbyState } from "@/app/types/tournament"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useUserStore } from "@/app/stores/userStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"

interface LobbiesTabProps {
  round: IRound
  allPlayers: PlayerRoundStats[]
  numMatches: number
  tournamentId: string
}

// State badge colors — handles both LobbyState machine values and DB state strings
function LobbyStateBadge({ state }: { state?: string }) {
  if (!state) return <Badge variant="outline">Pending</Badge>

  const config: Record<string, { label: string; class: string; pulse?: boolean }> = {
    WAITING:            { label: 'Waiting',       class: 'text-muted-foreground border-muted' },
    READY_CHECK:        { label: 'Ready Check',   class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', pulse: true },
    GRACE_PERIOD:       { label: 'Grace Period',  class: 'bg-orange-500/20 text-orange-400 border-orange-500/40', pulse: true },
    STARTING:           { label: 'Starting!',     class: 'bg-green-500/20 text-green-400 border-green-500/40', pulse: true },
    PLAYING:            { label: 'In Progress',   class: 'bg-primary/20 text-primary border-primary/40', pulse: true },
    FINISHED:           { label: 'Finished',      class: 'bg-green-700/20 text-green-600 border-green-700/30' },
    PAUSED:             { label: 'Paused',        class: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    ADMIN_INTERVENTION: { label: 'Admin Review',  class: 'bg-red-500/20 text-red-400 border-red-500/40', pulse: true },
  }

  const entry = config[state] ?? { label: state, class: 'text-muted-foreground border-muted' }
  return (
    <Badge variant="outline" className={`${entry.class} ${entry.pulse ? 'animate-pulse' : ''}`}>
      {entry.label}
    </Badge>
  )
}

export function LobbiesTab({ round, allPlayers, tournamentId }: LobbiesTabProps) {
  const { currentUser } = useUserStore()
  const [currentPage, setCurrentPage] = useState(1);
  const lobbiesPerPage = 4;

  const sortedLobbies = round.lobbies
    ?.slice()
    .sort((a, b) => {
      if (a.fetchedResult && !b.fetchedResult) return -1;
      if (!a.fetchedResult && b.fetchedResult) return 1;
      const numA = parseInt(a.name.replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(b.name.replace(/[^0-9]/g, '')) || 0;
      return numA - numB;
    }) || [];

  const totalPages = Math.ceil(sortedLobbies.length / lobbiesPerPage);
  const visibleLobbies = sortedLobbies.slice((currentPage - 1) * lobbiesPerPage, currentPage * lobbiesPerPage);

  return (
    <div className="space-y-4">
      {visibleLobbies.map((lobby, index) => {
          const lobbyPlayers = allPlayers.filter((p) => p.lobbyName === lobby.name)
          const matchesInLobby = lobby.matches?.length || 0
          const isMyLobby = currentUser && lobbyPlayers.some(p => p.name === currentUser.riotGameName)
          const LIVE_STATES = ['READY_CHECK', 'GRACE_PERIOD', 'STARTING', 'PLAYING', 'PAUSED'];
          const DONE_STATES = ['FINISHED', 'ADMIN_INTERVENTION'];
          const isLive = lobby.state ? LIVE_STATES.includes(lobby.state) : false;
          const isDone = lobby.state ? DONE_STATES.includes(lobby.state) : false;

          return (
            <Card
              key={lobby.id}
              className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in-up
                ${isMyLobby
                  ? 'bg-primary/5 border-primary ring-2 ring-primary/50'
                  : 'bg-card shadow-sm border border-white/10 hover:shadow-primary/10'}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className={isMyLobby ? "text-primary" : ""}>{lobby.name}</CardTitle>
                    {isMyLobby && (
                      <Badge variant="default" className="bg-primary animate-pulse-subtle flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> My Lobby
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Live state badge — shows real-time status */}
                    <LobbyStateBadge state={lobby.state} />
                    {/* Results badge (legacy) */}
                    {lobby.fetchedResult && (
                      <Badge variant="default">Results Available</Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {lobbyPlayers.filter((p) => p.status === "advanced").length} advanced •{" "}
                  {lobbyPlayers.filter((p) => p.status === "eliminated").length} eliminated •{" "}
                  {lobbyPlayers.filter((p) => p.status === "pending").length > 0
                    ? `${lobbyPlayers.filter((p) => p.status === "pending").length} pending • `
                    : ''}
                  {matchesInLobby} {matchesInLobby === 1 ? "match" : "matches"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Region</TableHead>
                      <TableHead className="text-center">Total Points</TableHead>
                      <TableHead className="text-center">Avg. Placement</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lobbyPlayers
                      .sort((a, b) => b.total - a.total)
                      .map((player) => (
                        <TableRow key={player.id}>
                          <TableCell>
                            <Link href={`/players/${player.id}`} className="hover:text-primary font-medium">
                              {player.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{player.region}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">{player.total}</TableCell>
                          <TableCell className="text-center">
                            {player.placements.length > 0
                              ? (player.placements.reduce((a, b) => a + b, 0) / player.placements.length).toFixed(1)
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`
                                  ${
                                    player.status === "advanced" ? "bg-green-500/20 text-green-500" :
                                    player.status === "eliminated" ? "bg-red-500/20 text-red-500" :
                                    "bg-slate-500/20 text-slate-400"
                                  }
                                `}
                            >
                              {player.status === "pending" ? "Awaiting" : player.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {/* View Lobby button — show for all states so users can ready up */}
                {(isLive || isDone || lobby.fetchedResult || lobby.state === 'WAITING') && (
                  <div className="mt-4 flex justify-end">
                    <Button asChild variant={isLive ? "default" : "outline"} size="sm" className={`gap-1.5 ${isLive ? 'btn-zodiac px-6' : ''}`}>
                      <Link href={`/tournaments/${tournamentId}/lobbies/${lobby.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        {isLive ? 'Join Lobby Live' : (lobby.state === 'WAITING' ? 'Enter Lobby Area' : 'View Results')}
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4 mt-6 border-t border-white/5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
