"use client";

import { Trophy, Medal, Star, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerStats {
  tournamentsPlayed: number;
  tournamentsWon: number;
  completedTournaments: number;
  matchesPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
  tournamentStats: Array<{
    tournamentId: string;
    tournamentName: string;
    status: string;
    matches: number;
    eliminated: boolean;
    scoreTotal: number;
  }>;
}

interface PlayerMatchDisplay {
  id: string;
  tournamentId: string;
  tournamentName: string;
  roundNumber: number;
  matchId: string;
  placement: number;
  points: number;
  date: string;
}

interface PlayerStatisticsDisplayProps {
  stats: PlayerStats;
  playerMatches: PlayerMatchDisplay[];
}

export function PlayerStatisticsDisplay({ stats, playerMatches }: PlayerStatisticsDisplayProps) {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold">Player Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Trophy className="mr-2 h-4 w-4 text-primary" />
                Tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tournamentsPlayed}</div>
              <p className="text-xs text-muted-foreground">{stats.tournamentsWon} tournaments won</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="mr-2 h-4 w-4 text-primary" />
                Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.matchesPlayed}</div>
              <p className="text-xs text-muted-foreground">Across all tournaments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Medal className="mr-2 h-4 w-4 text-primary" />
                Avg. Placement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averagePlacement}</div>
              <p className="text-xs text-muted-foreground">{stats.topFourRate}% top 4 rate</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Detailed statistics across all tournaments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Top 4 Rate</div>
                  <div className="text-sm text-muted-foreground">{stats.topFourRate}%</div>
                </div>
                <div className="h-2 w-full rounded-full bg-transparent">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${stats.topFourRate}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">1st Place Rate</div>
                  <div className="text-sm text-muted-foreground">{stats.firstPlaceRate}%</div>
                </div>
                <div className="h-2 w-full rounded-full bg-transparent">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${stats.firstPlaceRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Average Points per Match</div>
                  <div className="flex items-center">
                    <Star className="mr-2 h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {playerMatches.length > 0
                        ? (
                            playerMatches.reduce((sum, match) => sum + match.points, 0) /
                            playerMatches.length
                          ).toFixed(1)
                        : "0"} pts
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Best Placement</div>
                  <div className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                    <span className="font-medium">
                      {playerMatches.some(m => m.placement === 1)
                        ? `1st Place (${playerMatches.filter(m => m.placement === 1).length} times)`
                        : playerMatches.length > 0
                        ? `${Math.min(...playerMatches.map(m => m.placement))}th Place`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
} 