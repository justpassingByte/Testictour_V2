"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyQuickStatsCardProps {
  lobby: MiniTourLobby
}

export function LobbyQuickStatsCard({ lobby }: LobbyQuickStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge
            className={
              lobby.status === "WAITING"
                ? "bg-gray-500/20 text-gray-500"
                : lobby.status === "IN_PROGRESS"
                  ? "bg-blue-500/20 text-blue-500"
                  : lobby.status === "COMPLETED"
                    ? "bg-green-500/20 text-green-500"
                    : "bg-red-500/20 text-red-500"
            }
          >
            {lobby.status}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Game Mode:</span>
          <span className="text-sm font-medium">{lobby.gameMode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Skill Level:</span>
          <span className="text-sm font-medium">{lobby.skillLevel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Total Matches:</span>
          <span className="text-sm font-medium">{lobby.totalMatches.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  )
} 