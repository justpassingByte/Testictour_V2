"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyPlayersTabProps {
  lobby: MiniTourLobby
}

export function LobbyPlayersTab({ lobby }: LobbyPlayersTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Current Players ({lobby.currentPlayers}/{lobby.maxPlayers})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Joined At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(lobby.participants || []).map((p) => (
              <TableRow key={p.userId}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={"/placeholder-user.jpg"} alt={p.user.username} />
                      <AvatarFallback className="text-xs">{p.user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Link href={`/players/${p.userId}`} className="hover:text-primary font-medium">
                      {p.user.username}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {new Date(p.joinedAt).toLocaleTimeString()} - {new Date(p.joinedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {(lobby.participants || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No players have joined this lobby yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 