"use client";

import { Trophy, Medal, Star, Users, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

interface PlayerHistoryGroupDisplay {
  id: string;
  name: string;
  matchesCount: number;
  totalPoints: number;
  prize: number;
  playedAt: string;
  matches: PlayerMatchDisplay[];
}

interface PlayerStatisticsDisplayProps {
  stats: PlayerStats;
  playerMatches: PlayerHistoryGroupDisplay[];
}

export function PlayerStatisticsDisplay({ stats, playerMatches }: PlayerStatisticsDisplayProps) {
  const [filter, setFilter] = useState("20");

  const allMatches = useMemo(() => {
    return playerMatches
      .flatMap(group => group.matches)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [playerMatches]);

  const flatMatches = useMemo(() => {
    if (filter === "all") return allMatches;
    return allMatches.slice(-parseInt(filter));
  }, [allMatches, filter]);
  
  const chartData = useMemo(() => {
    return flatMatches.map((m, i) => ({
      name: `Match ${i + 1}`,
      placement: m.placement,
      tournament: m.tournamentName,
      date: new Date(m.date).toLocaleDateString()
    }));
  }, [flatMatches]);

  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold">Player Statistics</CardTitle>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Last 10 Matches</SelectItem>
            <SelectItem value="20">Last 20 Matches</SelectItem>
            <SelectItem value="50">Last 50 Matches</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                <Trophy className="mr-2 h-4 w-4 text-primary" />
                Tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.tournamentsPlayed}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{stats.tournamentsWon} Won</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                <Users className="mr-2 h-4 w-4 text-primary" />
                Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{filter === "all" ? stats.matchesPlayed : flatMatches.length}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Selected timeframe</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                <Medal className="mr-2 h-4 w-4 text-primary" />
                Avg. Placement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.averagePlacement}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{stats.topFourRate}% top 4 rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Placement Trend Chart */}
        <Card className="border-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Placement Trend
            </CardTitle>
            <CardDescription>Match placement history over time</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={false}
                    />
                    <YAxis 
                      reversed 
                      domain={[1, 8]}
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={8}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                      formatter={(value: number) => [<Badge key="placement-badge" variant="outline" className="font-bold">#{value}</Badge>, "Placement"]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                           return `${payload[0].payload.tournament} - ${payload[0].payload.date}`;
                        }
                        return label;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="placement" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      activeDot={{ r: 8, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
                No match data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Detailed statistics based on selected matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Top 4 Rate</div>
                  <div className="text-sm text-primary font-bold">{stats.topFourRate}%</div>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000"
                    style={{ width: `${stats.topFourRate}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">1st Place Rate</div>
                  <div className="text-sm text-yellow-500 font-bold">{stats.firstPlaceRate}%</div>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500/60 to-yellow-500 transition-all duration-1000"
                    style={{ width: `${stats.firstPlaceRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Avg Points / Match</div>
                  <div className="flex items-center">
                    <Star className="mr-2 h-5 w-5 text-primary" />
                    <span className="text-xl font-bold">
                      {flatMatches.length > 0
                        ? (
                            flatMatches.reduce((sum, match) => sum + match.points, 0) /
                            flatMatches.length
                          ).toFixed(1)
                        : "0"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Best Placement</div>
                  <div className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                    <span className="text-xl font-bold">
                      {flatMatches.some(m => m.placement === 1)
                        ? `1st Place (${flatMatches.filter(m => m.placement === 1).length}x)`
                        : flatMatches.length > 0
                        ? `${Math.min(...flatMatches.map(m => m.placement))}th`
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