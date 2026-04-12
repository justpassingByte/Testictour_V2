"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyQuickStatsCardProps {
  lobby: MiniTourLobby
}

export function LobbyQuickStatsCard({ lobby }: LobbyQuickStatsCardProps) {
  const t = useTranslations("common");
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("quick_stats")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">{t("status")}:</span>
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
            {t(`state_${lobby.status.toLowerCase()}`, { defaultValue: lobby.status })}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">{t("game_mode")}:</span>
          <span className="text-sm font-medium">{lobby.gameMode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">{t("skill_level")}:</span>
          <span className="text-sm font-medium">{lobby.skillLevel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">{t("total_matches")}:</span>
          <span className="text-sm font-medium">{(lobby.totalMatches === -1 || lobby.totalMatches === 0) ? t("infinity_bo1") : lobby.totalMatches}</span>
        </div>
      </CardContent>
    </Card>
  )
} 