"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyPlayersTabProps {
  lobby: MiniTourLobby
}

export function LobbyPlayersTab({ lobby }: LobbyPlayersTabProps) {
  const t = useTranslations("common");
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {t("current_players")} ({lobby.currentPlayers}/{lobby.maxPlayers})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("player")}</TableHead>
              <TableHead className="text-center">{t("rank")}</TableHead>
              <TableHead className="text-center">{t("joined_at")}</TableHead>
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
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-semibold text-xs">
                    {(p.user as any).rank || "Unranked"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {new Date(p.joinedAt).toLocaleTimeString()} - {new Date(p.joinedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {(lobby.participants || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  {t("no_players_joined")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 