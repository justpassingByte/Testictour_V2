"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Clock, Users, Trophy, Zap, Play, Pause } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"

// Mock tournament data
const tournament = {
  id: 1,
  name: "TFT Championship Series",
  currentRound: 3,
  totalRounds: 4,
  currentMatch: 2,
  totalMatches: 3,
}

// Mock live data
const liveData = {
  timeRemaining: 1245, // seconds
  currentLobby: "Finals Lobby",
  spectatorCount: 2847,
  currentLeaders: [
    { id: 1, player: "Player1", points: 89, placement: 1, isLive: true },
    { id: 2, player: "Player2", points: 84, placement: 2, isLive: true },
    { id: 3, player: "Player3", points: 81, placement: 3, isLive: true },
    { id: 4, player: "Player4", points: 78, placement: 4, isLive: true },
  ],
  recentEvents: [
    { id: 1, time: "2 min ago", event: "Player1 achieved 1st place in Match 2", type: "achievement" },
    { id: 2, time: "5 min ago", event: "Match 2 started", type: "match" },
    { id: 3, time: "8 min ago", event: "Player3 eliminated from Match 1", type: "elimination" },
    { id: 4, time: "12 min ago", event: "Match 1 completed", type: "match" },
    { id: 5, time: "15 min ago", event: "Player2 achieved 2nd place in Match 1", type: "achievement" },
  ],
  matchProgress: 65, // percentage
}

export default function LiveScoreboardPage({ params }: { params: { id: string } }) {
  const [timeRemaining, setTimeRemaining] = useState(liveData.timeRemaining)
  const [isLive, setIsLive] = useState(true)

  // Countdown timer
  useEffect(() => {
    if (!isLive) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [isLive])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tournaments">Tournaments</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/tournaments/${params.id}`}>{tournament.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Live Scoreboard</span>
        </div>
        <SyncStatus status="live" />
      </div>

      <div className="mt-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold">{tournament.name} - Live Scoreboard</h1>
            <Badge className="bg-red-500/20 text-red-500 animate-pulse">LIVE</Badge>
          </div>
          <p className="text-muted-foreground">Real-time tournament updates and scores</p>
        </div>

        {/* Live Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold font-mono">{formatTime(timeRemaining)}</p>
                  <p className="text-xs text-muted-foreground">Time Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    Round {tournament.currentRound}/{tournament.totalRounds}
                  </p>
                  <p className="text-xs text-muted-foreground">Current Round</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{liveData.spectatorCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Spectators</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{liveData.currentLobby}</p>
                  <p className="text-xs text-muted-foreground">Current Lobby</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Match Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Play className="mr-2 h-5 w-5 text-primary" />
                Match Progress
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className={isLive ? "text-red-500" : "text-green-500"}
              >
                {isLive ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                {isLive ? "Pause" : "Resume"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Match {tournament.currentMatch} of {tournament.totalMatches}
                </span>
                <span>{liveData.matchProgress}% Complete</span>
              </div>
              <Progress value={liveData.matchProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList>
            <TabsTrigger value="leaderboard">Live Leaderboard</TabsTrigger>
            <TabsTrigger value="events">Recent Events</TabsTrigger>
            <TabsTrigger value="statistics">Live Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-primary" />
                  Current Leaders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Total Points</TableHead>
                      <TableHead className="text-center">Current Placement</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveData.currentLeaders.map((leader, index) => (
                      <TableRow
                        key={leader.id}
                        className={`${leader.isLive ? "bg-primary/5 border-primary/20" : ""} hover:bg-muted/50`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {index === 0 && <Trophy className="h-4 w-4 text-yellow-500 mr-1" />}#{index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Link href={`/players/${leader.id}`} className="hover:text-primary font-medium">
                              {leader.player}
                            </Link>
                            {leader.isLive && (
                              <Badge className="ml-2 bg-red-500/20 text-red-500 animate-pulse text-xs">LIVE</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{leader.points}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`
                            inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                            ${leader.placement === 1 ? "bg-yellow-500/20 text-yellow-500" : ""}
                            ${leader.placement === 2 ? "bg-gray-400/20 text-gray-400" : ""}
                            ${leader.placement === 3 ? "bg-amber-700/20 text-amber-700" : ""}
                            ${leader.placement > 3 ? "bg-secondary" : ""}
                          `}
                          >
                            {leader.placement}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {leader.isLive ? (
                            <Badge className="bg-green-500/20 text-green-500">Playing</Badge>
                          ) : (
                            <Badge variant="outline">Waiting</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-primary" />
                  Recent Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveData.recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`
                        flex items-start space-x-3 p-3 rounded-lg border
                        ${event.type === "achievement" ? "bg-green-500/5 border-green-500/20" : ""}
                        ${event.type === "elimination" ? "bg-red-500/5 border-red-500/20" : ""}
                        ${event.type === "match" ? "bg-blue-500/5 border-blue-500/20" : ""}
                      `}
                    >
                      <div
                        className={`
                          w-2 h-2 rounded-full mt-2 flex-shrink-0
                          ${event.type === "achievement" ? "bg-green-500" : ""}
                          ${event.type === "elimination" ? "bg-red-500" : ""}
                          ${event.type === "match" ? "bg-blue-500" : ""}
                        `}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.event}</p>
                        <p className="text-xs text-muted-foreground">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Average Game Duration:</span>
                      <span className="font-medium">28:45</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Eliminations:</span>
                      <span className="font-medium">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fastest Victory:</span>
                      <span className="font-medium">22:15</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Most Contested Unit:</span>
                      <span className="font-medium">Azir</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Player Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Highest Single Game Score:</span>
                      <span className="font-medium">8 pts (Player1)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Most Consistent Player:</span>
                      <span className="font-medium">Player2</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Win Streak:</span>
                      <span className="font-medium">3 games (Player1)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Placement:</span>
                      <span className="font-medium">4.2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
