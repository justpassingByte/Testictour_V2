"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, PlayCircle, Trophy } from "lucide-react"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyOverviewTabProps {
  lobby: MiniTourLobby
}

export function LobbyOverviewTab({ lobby }: LobbyOverviewTabProps) {
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
            <CardTitle className="text-lg">Lobby Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Matches:</span>
              <span className="font-medium">{lobby.totalMatches.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Rating:</span>
              <span className="font-medium">{lobby.averageRating}/5.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{new Date(lobby.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Game Mode:</span>
              <span className="font-medium">{lobby.gameMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Skill Level:</span>
              <span className="font-medium">{lobby.skillLevel}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Prize Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lobby.prizeDistribution && Object.entries(lobby.prizeDistribution)
              .sort(([placeA], [placeB]) => parseInt(placeA) - parseInt(placeB))
              .map(([place, amount]) => (
                <div key={place} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Trophy className={`h-4 w-4 mr-2 ${parseInt(place) === 1 ? 'text-yellow-500' : parseInt(place) === 2 ? 'text-gray-400' : 'text-amber-700'}`} />
                    <span>{place === '1' ? '1st' : place === '2' ? '2nd' : `${place}rd`} Place</span>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lobby Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {lobby.settings?.autoStart !== undefined && (
              <div className="flex items-center space-x-2">
                <PlayCircle className={`h-4 w-4 ${lobby.settings.autoStart ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-sm">
                  Auto Start: {lobby.settings.autoStart ? "Enabled" : "Disabled"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 