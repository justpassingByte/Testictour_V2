"use client"

import Link from "next/link"
import { PlayerRoundStats, IRound, LobbyState } from "@/app/types/tournament"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useUserStore } from "@/app/stores/userStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, ExternalLink } from "lucide-react"

interface LobbiesTabProps {
  round: IRound
  allPlayers: PlayerRoundStats[]
  numMatches: number
  tournamentId: string
}

// State badge colors
function LobbyStateBadge({ state }: { state?: LobbyState }) {
  if (!state) return <Badge variant="outline">Pending</Badge>

  const config: Record<LobbyState, { label: string; class: string; pulse?: boolean }> = {
    WAITING:            { label: 'Waiting',       class: 'text-muted-foreground border-muted' },
    READY_CHECK:        { label: 'Ready Check',   class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', pulse: true },
    GRACE_PERIOD:       { label: 'Grace Period',  class: 'bg-orange-500/20 text-orange-400 border-orange-500/40', pulse: true },
    STARTING:           { label: 'Starting!',     class: 'bg-green-500/20 text-green-400 border-green-500/40', pulse: true },
    PLAYING:            { label: 'In Progress',   class: 'bg-primary/20 text-primary border-primary/40', pulse: true },
    FINISHED:           { label: 'Finished',      class: 'bg-green-700/20 text-green-600 border-green-700/30' },
    PAUSED:             { label: 'Paused',        class: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    ADMIN_INTERVENTION: { label: 'Admin Review',  class: 'bg-red-500/20 text-red-400 border-red-500/40', pulse: true },
  }

  const { label, class: cls, pulse } = config[state]
  return (
    <Badge variant="outline" className={`${cls} ${pulse ? 'animate-pulse' : ''}`}>
      {label}
    </Badge>
  )
}

export function LobbiesTab({ round, allPlayers, tournamentId }: LobbiesTabProps) {
  const { currentUser } = useUserStore()

  return (
    <div className="space-y-4">
      {round.lobbies
        ?.slice()
        .sort((a, b) => {
          if (a.fetchedResult && !b.fetchedResult) return -1;
          if (!a.fetchedResult && b.fetchedResult) return 1;
          const numA = parseInt(a.name.replace(/[^0-9]/g, '')) || 0;
          const numB = parseInt(b.name.replace(/[^0-9]/g, '')) || 0;
          return numA - numB;
        })
        .map((lobby, index) => {
          const lobbyPlayers = allPlayers.filter((p) => p.lobbyName === lobby.name)
          const matchesInLobby = lobby.matches?.length || 0
          const isMyLobby = currentUser && lobbyPlayers.some(p => p.name === currentUser.riotGameName)
          const isLive = lobby.state && !['FINISHED', 'WAITING', undefined].includes(lobby.state)

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
                  {lobbyPlayers.filter((p) => p.status === "advanced").length} players advanced •{" "}
                  {lobbyPlayers.filter((p) => p.status === "eliminated").length} players eliminated •{" "}
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
                                  ${player.status === "advanced" ? "bg-green-500/20 text-green-500" : ""}
                                  ${player.status === "eliminated" ? "bg-red-500/20 text-red-500" : ""}
                                `}
                            >
                              {player.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {/* View Lobby button — show for all non-WAITING lobbies */}
                {lobby.state !== 'WAITING' && (
                  <div className="mt-4 flex justify-end">
                    <Button asChild variant={isLive ? "default" : "outline"} size="sm" className={`gap-1.5 ${isLive ? 'btn-zodiac px-6' : ''}`}>
                      <Link href={`/tournaments/${tournamentId}/lobbies/${lobby.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        {isLive ? 'Join Lobby Live' : 'View Results'}
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
