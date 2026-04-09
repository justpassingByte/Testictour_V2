"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Trophy, Medal, Star, Clock, Calendar, BarChart3, Users, Target, TrendingUp, Gift, Timer, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IPlayerProfile } from "@/app/types/user"
import { useTranslations } from "next-intl"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  WAITING:            { label: 'status_waiting',   color: 'text-muted-foreground' },
  READY_CHECK:        { label: 'ready_check',       color: 'text-yellow-400' },
  GRACE_PERIOD:       { label: 'idle',              color: 'text-orange-400' },
  STARTING:           { label: 'active',            color: 'text-green-400' },
  PLAYING:            { label: 'in_progress',       color: 'text-primary' },
  FINISHED:           { label: 'finished',          color: 'text-green-600' },
  PAUSED:             { label: 'idle',              color: 'text-orange-400' },
  ADMIN_INTERVENTION: { label: 'error',             color: 'text-red-400' },
};

function useCountdown(phaseStartedAt: string | undefined, durationSeconds: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!phaseStartedAt || !durationSeconds) return;
    const tick = () => {
      const endsAt = new Date(phaseStartedAt).getTime() + durationSeconds * 1000;
      setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt, durationSeconds]);
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  return { display: `${m}:${s}`, remaining };
}

interface IncomingMatch {
  lobbyId: string;
  lobbyName: string;
  tournamentId?: string;
  roundNumber: number;
  phaseName: string;
  state: string;
  phaseStartedAt: string;
  phaseDuration: number;
}

function IncomingMatchCard({ match }: { match: IncomingMatch }) {
  const t = useTranslations("common")
  const { display } = useCountdown(match.phaseStartedAt, match.phaseDuration);
  const sc = STATE_LABELS[match.state] || { label: match.state, color: 'text-muted-foreground' };
  const isActive = !['WAITING', 'FINISHED'].includes(match.state);
  const labelKey = sc.label as any;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isActive ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-muted/10'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{match.lobbyName}</p>
        <p className="text-xs text-muted-foreground">
          {t("rounds")} {match.roundNumber} · {match.phaseName}
        </p>
        <p className={`text-xs font-medium mt-0.5 ${sc.color} ${isActive ? 'animate-pulse' : ''}`}>
          {t(labelKey)}
        </p>
      </div>
      {isActive && match.phaseDuration > 0 && (
        <div className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums shrink-0">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          {display}
        </div>
      )}
      <Button asChild size="sm" variant={isActive ? 'default' : 'outline'} className="shrink-0">
        <Link href={match.tournamentId
          ? `/tournaments/${match.tournamentId}/lobbies/${match.lobbyId}`
          : `/minitour/lobbies/${match.lobbyId}`}>
          {match.state === 'PLAYING' ? <><Play className="h-3 w-3 mr-1" />{t("active_match")}</> : t("go_to_lobby")}
        </Link>
      </Button>
    </div>
  );
}

function IncomingMatchesPanel({ userId }: { userId: string }) {
  const t = useTranslations("common")
  const [matches, setMatches] = useState<IncomingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`${BACKEND_URL}/api/players/${userId}/incoming-matches`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setMatches(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-xs text-muted-foreground py-2">{t("loading_tournaments")}</div>;
  if (matches.length === 0) return <div className="text-xs text-muted-foreground py-2">{t("no_participants")}</div>;

  return (
    <div className="space-y-2">
      {matches.map(m => <IncomingMatchCard key={m.lobbyId} match={m} />)}
    </div>
  );
}

interface PlayerDashboardClientProps {
  user: IPlayerProfile;
}

export default function PlayerDashboardClient({ user: player }: PlayerDashboardClientProps) {
  const t = useTranslations("common")

  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">{t("home")}</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/players">{t("players")}</Link>
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
                    <Badge variant="outline">{player.region} {t("region")}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("summoner_name")}:</span>
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
              <TabsTrigger value="tournaments">{t("tournaments")}</TabsTrigger>
              <TabsTrigger value="matches">{t("match_history")}</TabsTrigger>
              <TabsTrigger value="statistics">{t("statistics")}</TabsTrigger>
              <TabsTrigger value="achievements">{t("achievements_tab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="tournaments" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">{t("my_tournaments")}</h2>
              {player.tournaments.length > 0 ? (
                <div className="space-y-4">
                  {player.tournaments.map((tournament) => (
                    <Card key={tournament.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between">
                          <div>
                            <CardTitle>{tournament.name}</CardTitle>
                            <CardDescription>
                              {t("registration")}: {tournament.registrationDate} · {t("rounds")} {tournament.currentRound} / {tournament.totalRounds}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${tournament.status === "ongoing" ? "bg-primary/20 text-primary" : ""} ${tournament.status === "upcoming" ? "bg-yellow-500/20 text-yellow-500" : ""} ${tournament.status === "finished" ? "bg-muted text-muted-foreground" : ""} capitalize`}
                          >
                            {tournament.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">{t("placement")}</span>
                            <span className="text-lg font-bold">{tournament.placement}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">{t("points")}</span>
                            <span className="text-lg font-bold">{tournament.points}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">{t("status")}</span>
                            <Badge variant="outline" className={`${tournament.eliminated ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"}`}>
                              {tournament.eliminated ? t("eliminated") : t("in_progress")}
                            </Badge>
                          </div>
                        </div>
                        <Button asChild className="mt-4 w-full">
                          <Link href={`/tournaments/${tournament.id}`}>{t("view_tournament")}</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{t("no_registered_tournaments_criteria")}</p>
              )}
            </TabsContent>

            <TabsContent value="matches" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">{t("match_history")}</h2>
              {player.matches.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tournaments")}</TableHead>
                        <TableHead>{t("rounds")}</TableHead>
                        <TableHead>{t("match")}</TableHead>
                        <TableHead>{t("lobby")}</TableHead>
                        <TableHead>{t("placement")}</TableHead>
                        <TableHead>{t("points")}</TableHead>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("time")}</TableHead>
                        <TableHead>{t("performance")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {player.matches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">
                            <Link href={`/tournaments/${match.tournamentId}`}>{match.tournamentName}</Link>
                          </TableCell>
                          <TableCell>{t("rounds")} {match.round}</TableCell>
                          <TableCell>{t("match")} {match.match}</TableCell>
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
                <p className="text-muted-foreground">{t("no_completed_tournaments_match_criteria")}</p>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">{t("statistics")}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("total_tournaments")}</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.tournamentsPlayed}</div>
                    <p className="text-xs text-muted-foreground">{player.stats.tournamentsWon} {t("tournaments_won")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("match_history")}</CardTitle>
                    <Medal className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.matchesPlayed}</div>
                    <p className="text-xs text-muted-foreground">{t("avg_placement")}: {player.stats.averageGameDuration}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("avg_placement")}</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.averagePlacement.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{t("placement")}: {player.stats.bestPlacement}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("top_four_rate")}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.topFourRate}%</div>
                    <p className="text-xs text-muted-foreground">{t("wins")}: {player.stats.firstPlaceRate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("total_points")}</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{player.stats.totalPoints}</div>
                    <p className="text-xs text-muted-foreground">{t("trend")}: {player.stats.winStreak}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("performance")}</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{player.stats.favoriteComposition}</div>
                    <p className="text-xs text-muted-foreground">{t("top_four_rate")}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="mt-4 space-y-4">
              <h2 className="text-xl font-semibold mb-4">{t("achievement_gallery")}</h2>
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
                          {t("unlocked")}: {achievement.date}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{t("no_players_region")}</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1 space-y-6">
          {/* Incoming Matches */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                {t("active_match")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IncomingMatchesPanel userId={player.id} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("recent_tournaments")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t("active")}: {new Date(player.lastActive).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t("date")}: {new Date(player.joinDate).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("quick_links")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Link href="/tournaments" className="flex items-center hover:text-primary">
                <Trophy className="mr-2 h-4 w-4" /> {t("browse_tournaments")}
              </Link>
              <Link href="/rewards" className="flex items-center hover:text-primary">
                <Gift className="mr-2 h-4 w-4" /> {t("claim_reward")}
              </Link>
              <Link href="#" className="flex items-center hover:text-primary">
                <Target className="mr-2 h-4 w-4" /> {t("quests_tab")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}