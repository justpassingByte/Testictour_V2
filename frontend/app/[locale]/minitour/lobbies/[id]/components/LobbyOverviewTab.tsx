"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, PlayCircle, Trophy } from "lucide-react"
import { useTranslations } from "next-intl"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyOverviewTabProps {
  lobby: MiniTourLobby
}

export function LobbyOverviewTab({ lobby }: LobbyOverviewTabProps) {
  const t = useTranslations("common");
  const getThemeStyle = (theme: string | undefined) => {
    switch (theme) {
      case "premium":
        return "border-yellow-500/50 bg-yellow-500/5"
      case "dark":
        return "border-purple-500/50 bg-purple-500/5"
      case "colorful":
        return "border-pink-500/50 bg-pink-500/5"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("lobby_statistics")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("total_matches")}:</span>
              <span className="font-medium">{lobby.matches?.filter(m => m.fetchedAt)?.length || 0} / {(lobby.totalMatches === -1 || lobby.totalMatches === 0) ? t("infinity_bo1") : lobby.totalMatches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("average_rating")}:</span>
              <span className="font-medium">{lobby.averageRating}/5.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("created")}:</span>
              <span className="font-medium">{new Date(lobby.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("game_mode")}:</span>
              <span className="font-medium">{lobby.gameMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("skill_level")}:</span>
              <span className="font-medium">{lobby.skillLevel}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {t("prize_distribution")} {(lobby.totalMatches === -1 || lobby.totalMatches === 0) && <span className="text-sm font-normal text-muted-foreground ml-2">{t("per_match")}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lobby.prizeDistribution && Object.entries(lobby.prizeDistribution)
              .sort(([placeA], [placeB]) => parseInt(placeA) - parseInt(placeB))
              .map(([place, amount]) => (
                <div key={place} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Trophy className={`h-4 w-4 mr-2 ${parseInt(place) === 1 ? 'text-yellow-500' : parseInt(place) === 2 ? 'text-gray-400' : 'text-amber-700'}`} />
                    <span>{place === '1' ? t("first_place") : place === '2' ? t("second_place") : place === '3' ? t("third_place") : t("nth_place", { place })}</span>
                  </div>
                  <span className="font-bold">
                    <Coins className="inline h-4 w-4 mr-1" />
                    {amount as number}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {lobby.settings?.autoStart !== undefined && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("lobby_settings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <PlayCircle className={`h-4 w-4 ${lobby.settings.autoStart ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-sm">
                  {t("auto_start")}: {lobby.settings.autoStart ? t("enabled") : t("disabled")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 