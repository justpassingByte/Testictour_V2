"use client"

import { Trophy, Medal, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface RoundSummaryProps {
  totalMatches: number
  pointsAwarded: number
  playersAdvanced: number
  playersEliminated: number
}

export function RoundSummary({
  totalMatches,
  pointsAwarded,
  playersAdvanced,
  playersEliminated,
}: RoundSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-primary mr-3" />
            <div>
              <p className="text-2xl font-bold">{totalMatches}</p>
              <p className="text-xs text-muted-foreground">Total Matches</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Medal className="h-8 w-8 text-primary mr-3" />
            <div>
              <p className="text-2xl font-bold">{pointsAwarded}</p>
              <p className="text-xs text-muted-foreground">Points Awarded</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{playersAdvanced}</p>
              <p className="text-xs text-muted-foreground">Players Advanced</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{playersEliminated}</p>
              <p className="text-xs text-muted-foreground">Players Eliminated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 