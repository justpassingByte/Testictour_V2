"use client"

import Link from "next/link"
import { ChevronRight, Trophy, Medal, Star, Clock, Calendar, BarChart3, Users, Target, TrendingUp, Gift } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IPlayerProfile } from "@/app/types/user"

interface PlayerDashboardClientProps {
  user: IPlayerProfile;
}

export default function PlayerDashboardClient({ user: player }: PlayerDashboardClientProps) {
  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/players">Players</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{player.username}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Player Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={`/placeholder.svg?height=80&width=80`} alt={player.username} />
                  <AvatarFallback className="text-2xl">{player.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h1 className="text-3xl font-bold">{player.username}</h1>
                    <Badge variant="outline" className="bg-primary/20 text-primary">
                      Level {player.level || 1}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Badge variant="outline">{player.region} Region</Badge>
                    {/* <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500">
                      {player.rank}
                    </Badge> */}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Summoner Name:</span>
                      <p className="font-medium">{player.riotGameName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PUUID:</span>
                      <p className="font-mono text-xs">{player.puuid || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="tournaments">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              <TabsTrigger value="matches">Match History</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="tournaments" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">Tournament Participation</h2>
              {player.tournaments.length > 0 ? (
                <div className="space-y-4">
                  {player.tournaments.map((tournament) => (
                    <Card key={tournament.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between">
                          <div>
                            <CardTitle>{tournament.name}</CardTitle>
                            <CardDescription>
                              Registered: {tournament.registrationDate} • Round {tournament.currentRound} of{" "}
                              {tournament.totalRounds}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="outline"
                            className={`
                            ${tournament.status === "ongoing" ? "bg-primary/20 text-primary" : ""}
                            ${tournament.status === "upcoming" ? "bg-yellow-500/20 text-yellow-500" : ""}
                            ${tournament.status === "finished" ? "bg-muted text-muted-foreground" : ""}
                            capitalize
                          `}
                          >
                            {tournament.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Placement</span>
                            <span className="text-lg font-bold">{tournament.placement}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Points</span>
                            <span className="text-lg font-bold">{tournament.points}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge
                              variant="outline"
                              className={`
                                ${tournament.eliminated ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"}
                                `}
                            >
                              {tournament.eliminated ? "Eliminated" : "In Progress"}
                            </Badge>
                          </div>
                        </div>
                        <Button asChild className="mt-4 w-full">
                          <Link href={`/tournaments/${tournament.id}`}>View Tournament Details</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tournaments joined yet.</p>
              )}
            </TabsContent>

            <TabsContent value="matches" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">Match History</h2>
              {player.matches.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tournament</TableHead>
                        <TableHead>Round</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Lobby</TableHead>
                        <TableHead>Placement</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Composition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {player.matches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">
                            <Link href={`/tournaments/${match.tournamentId}`}>{match.tournamentName}</Link>
                          </TableCell>
                          <TableCell>Round {match.round}</TableCell>
                          <TableCell>Match {match.match}</TableCell>
                          <TableCell>{match.lobby}</TableCell>
                          <TableCell>{match.placement}</TableCell>
                          <TableCell>{match.points}</TableCell>
                          <TableCell>{match.date}</TableCell>
                          <TableCell>{match.duration}</TableCell>
                          <TableCell>{match.composition}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                <p className="text-muted-foreground">No matches played yet.</p>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tournaments Played</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.tournamentsPlayed}</div>
                    <p className="text-xs text-muted-foreground">{player.stats.tournamentsWon} tournaments won</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Matches Played</CardTitle>
                    <Medal className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.matchesPlayed}</div>
                    <p className="text-xs text-muted-foreground">Average duration: {player.stats.averageGameDuration}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Placement</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.averagePlacement.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Best placement: {player.stats.bestPlacement}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top 4 Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.topFourRate}%</div>
                    <p className="text-xs text-muted-foreground">First place rate: {player.stats.firstPlaceRate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.totalPoints}</div>
                    <p className="text-xs text-muted-foreground">Win streak: {player.stats.winStreak}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Favorite Comp</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{player.stats.favoriteComposition}</div>
                    <p className="text-xs text-muted-foreground">Based on highest top 4 rate</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">Achievements</h2>
              {player.achievements.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {player.achievements.map((achievement) => (
                    <Card key={achievement.id}>
                      <CardHeader className="flex flex-row items-center space-x-4">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div>
                          <CardTitle>{achievement.name}</CardTitle>
                          <CardDescription>{achievement.description}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Unlocked: {achievement.date}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No achievements unlocked yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1 space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Last Active: {new Date(player.lastActive).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Joined: {new Date(player.joinDate).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Link href="/tournaments" className="flex items-center hover:text-primary">
                <Trophy className="mr-2 h-4 w-4" /> Browse Tournaments
              </Link>
              <Link href="/rewards" className="flex items-center hover:text-primary">
                <Gift className="mr-2 h-4 w-4" /> View Rewards
              </Link>
              <Link href="#" className="flex items-center hover:text-primary">
                <Target className="mr-2 h-4 w-4" /> My Challenges
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 