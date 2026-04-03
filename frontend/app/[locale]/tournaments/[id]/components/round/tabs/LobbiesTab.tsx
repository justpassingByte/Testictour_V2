"use client"

import Link from "next/link"
import { PlayerRoundStats, IRound } from "@/app/types/tournament"

import { Badge } from "@/components/ui/badge"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface LobbiesTabProps {
  round: IRound
  allPlayers: PlayerRoundStats[]
  numMatches: number
}

export function LobbiesTab({ round, allPlayers }: LobbiesTabProps) {
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
        return (
          <Card 
            key={lobby.id}
            className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{lobby.name}</CardTitle>
                <Badge variant={lobby.fetchedResult ? "default" : "outline"}>
                  {lobby.fetchedResult ? "Results Available" : "Pending Results"}
                </Badge>
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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 