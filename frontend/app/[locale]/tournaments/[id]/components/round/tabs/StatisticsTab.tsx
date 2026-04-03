"use client"

import { PlayerRoundStats } from "@/app/types/tournament"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatisticsTabProps {
  allPlayers: PlayerRoundStats[]
}

export function StatisticsTab({ allPlayers }: StatisticsTabProps) {
  const playersAdvanced = allPlayers.filter((p) => p.status === "advanced").length
  const playersEliminated = allPlayers.filter((p) => p.status === "eliminated").length
  const totalPointsAwarded = allPlayers.reduce((sum, p) => sum + p.total, 0)

  const highestScorePlayer = allPlayers.reduce(
    (max, player) => (player.total > max.total ? player : max),
    allPlayers[0] || { total: 0, name: "N/A" }
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up">
        <CardHeader>
          <CardTitle>Round Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Average Points per Player:</span>
              <span className="font-medium">
                {(totalPointsAwarded / (playersAdvanced + playersEliminated) || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Highest Individual Score:</span>
              <span className="font-medium">
                {highestScorePlayer.total} pts ({highestScorePlayer.name})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average Match Duration:</span>
              <span className="font-medium">30:10 (mock)</span>
            </div>
            <div className="flex justify-between">
              <span>Most Popular Composition:</span>
              <span className="font-medium">Azir Reroll (mock)</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle>Regional Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["AP", "NA", "EUW", "KR", "OCE"].map((region) => {
              const regionPlayers = allPlayers.filter((p) => p.region === region)
              if (regionPlayers.length === 0) return null

              const avgPoints = (
                regionPlayers.reduce((sum, p) => sum + p.total, 0) / regionPlayers.length
              ).toFixed(1)
              const advancedCount = regionPlayers.filter((p) => p.status === "advanced").length

              return (
                <div key={region} className="space-y-2">
                  <div className="flex justify-between">
                    <span>{region}:</span>
                    <span className="font-medium">
                      {avgPoints} avg pts • {advancedCount} advanced
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(advancedCount / regionPlayers.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 