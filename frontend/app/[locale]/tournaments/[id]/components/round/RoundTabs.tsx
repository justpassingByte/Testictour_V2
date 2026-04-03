"use client"

import { useTournamentStore } from "@/app/stores/tournamentStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IRound, PlayerRoundStats, ITournament } from "@/app/types/tournament"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Star } from "lucide-react"
import { format } from "date-fns"

import { ResultsTab } from "./tabs/ResultsTab"
import { LobbiesTab } from "./tabs/LobbiesTab"
import { StatisticsTab } from "./tabs/StatisticsTab"

interface RoundTabsProps {
  round: IRound
  tournament: ITournament
  allPlayers: PlayerRoundStats[]
  numMatches: number
}

export function RoundTabs({ round, tournament, allPlayers, numMatches }: RoundTabsProps) {
  const { matchResults } = useTournamentStore()

  return (
    <Tabs defaultValue="results" className="w-full">
      <TabsList>
        <TabsTrigger value="results">Round Results</TabsTrigger>
        <TabsTrigger value="matches">Match Details</TabsTrigger>
        <TabsTrigger value="lobbies">Lobby Breakdown</TabsTrigger>
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
      </TabsList>
      <TabsContent value="results">
        <ResultsTab round={round} tournament={tournament} allPlayers={allPlayers} numMatches={numMatches} />
      </TabsContent>
      <TabsContent value="matches" className="space-y-6">
        {/* Group matches by lobby for better organization */}
        {round.lobbies
          ?.slice() // Tạo một bản sao để không ảnh hưởng đến dữ liệu gốc
          .sort((a, b) => {
            // Ưu tiên lobbies có fetchedResult = true
            if (a.fetchedResult && !b.fetchedResult) return -1;
            if (!a.fetchedResult && b.fetchedResult) return 1;
            
            // Sau đó sắp xếp theo tên lobby (giả sử tên có dạng "Lobby X")
            const numA = parseInt(a.name.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.name.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
          })
          .map((lobby, lobbyIndex) => (
          <div key={lobby.id} className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Badge variant="outline" className="mr-2">{lobby.name}</Badge>
              <span className="text-muted-foreground text-sm">
                {lobby.matches?.length || 0} {(lobby.matches?.length || 0) === 1 ? 'match' : 'matches'}
              </span>
              <span className="ml-auto">
                <Badge variant={lobby.fetchedResult ? "default" : "outline"}>
                  {lobby.fetchedResult ? "Results Available" : "Pending Results"}
                </Badge>
              </span>
            </h3>
            
            {lobby.matches?.map((match, matchIndex) => {
              const matchInfo = match.matchData?.info;
              if (!matchInfo) return (
                <Card key={match.id} className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                  <CardHeader>
                    <CardTitle>Match {matchIndex + 1}</CardTitle>
                    <CardDescription>Match data is still loading...</CardDescription>
                  </CardHeader>
                </Card>
              );

              const riotParticipants = matchInfo.participants || [];
              const winnerData = riotParticipants.find((p) => p.placement === 1);
              const winnerParticipant = tournament.participants?.find(p => p.userId === winnerData?.puuid);
              const winnerName = winnerParticipant?.user?.riotGameName || "Unknown";

              const startTime = matchInfo.gameStartTimestamp 
                ? new Date(matchInfo.gameStartTimestamp)
                : new Date(matchInfo.gameCreation);
              
              const endTime = matchInfo.gameEndTimestamp
                ? new Date(matchInfo.gameEndTimestamp)
                : new Date(startTime.getTime() + matchInfo.gameDuration * 1000);
              
              const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

              const formatDuration = (seconds: number) => {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return `${minutes}m ${remainingSeconds}s`;
              };

              // Get match results for all participants in this match
              const tournamentMatchResults = matchResults[match.id] || [];
              const totalPoints = tournamentMatchResults.reduce((sum, r) => sum + r.points, 0);

              return (
                <Card 
                  key={match.id}
                  className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${(lobbyIndex * 100) + (matchIndex * 50)}ms` }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Match {matchIndex + 1}</CardTitle>
                      <Badge variant={winnerData?.puuid ? "default" : "outline"}>
                        {match.status || 'Completed'}
                      </Badge>
                    </div>
                    <CardDescription className="flex flex-col space-y-1">
                      <div className="flex items-center text-xs">
                        <span className="font-medium mr-1">Start:</span> {format(startTime, "MMM d, yyyy h:mm a")}
                      </div>
                      <div className="flex items-center text-xs">
                        <span className="font-medium mr-1">End:</span> {format(endTime, "MMM d, yyyy h:mm a")}
                      </div>
                      <div className="flex items-center text-xs">
                        <span className="font-medium mr-1">Duration:</span> {formatDuration(durationInSeconds)}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Winner</div>
                        <div className="flex items-center">
                          <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                          <span className="font-medium">{winnerName}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Players</div>
                        <div className="flex items-center">
                          <Medal className="mr-2 h-5 w-5 text-primary" />
                          <span className="font-medium">{riotParticipants.length}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Total Points</div>
                        <div className="flex items-center">
                          <Star className="mr-2 h-5 w-5 text-primary" />
                          <span className="font-medium">{totalPoints} pts</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Player results table */}
                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="py-2 px-4 text-left">Player</th>
                            <th className="py-2 px-4 text-center">Placement</th>
                            <th className="py-2 px-4 text-center">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tournamentMatchResults
                            .sort((a, b) => a.placement - b.placement)
                            .map((result) => {
                              const participant = tournament.participants?.find(p => p.userId === result.participantId);
                              return (
                                <tr key={result.participantId} className="border-b last:border-0">
                                  <td className="py-2 px-4">
                                    {participant?.user?.riotGameName || "Unknown"}
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <span className={`
                                      inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                      ${result.placement === 1 ? "bg-yellow-500/20 text-yellow-500" : ""}
                                      ${result.placement === 2 ? "bg-gray-400/20 text-gray-400" : ""}
                                      ${result.placement === 3 ? "bg-amber-700/20 text-amber-700" : ""}
                                      ${result.placement > 3 ? "bg-secondary" : ""}
                                    `}>
                                      {result.placement}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-center font-medium">
                                    {result.points} pts
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {(!lobby.matches || lobby.matches.length === 0) && (
              <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
                <CardContent className="py-4">
                  <p className="text-center text-muted-foreground">No matches found for this lobby</p>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
        
        {(!round.lobbies || round.lobbies.length === 0) && (
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
            <CardHeader>
              <CardTitle>Match Details</CardTitle>
              <CardDescription>Detailed breakdown of each match in the round.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Match details are not available or are still being processed.</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      <TabsContent value="lobbies">
        <LobbiesTab round={round} allPlayers={allPlayers} numMatches={numMatches} />
      </TabsContent>
      <TabsContent value="statistics">
        <StatisticsTab allPlayers={allPlayers} />
      </TabsContent>
    </Tabs>
  )
}