"use client"

import React, { useState, useEffect } from "react"
import { useTournamentStore } from "@/app/stores/tournamentStore"
import { useUserStore } from "@/app/stores/userStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IRound, PlayerRoundStats, ITournament } from "@/app/types/tournament"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Star, ChevronDown, ChevronUp, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

import { ResultsTab } from "./tabs/ResultsTab"
import { LobbiesTab } from "./tabs/LobbiesTab"
import { useTranslations } from "next-intl"
import { MatchCompPanel, isGrimoireMatchData } from "@/components/match/MatchCompPanel"
import { GrimoireMatchData } from "@/app/types/riot"

interface RoundTabsProps {
  round: IRound
  tournament: ITournament
  allPlayers: PlayerRoundStats[]
  numMatches: number
}

export function RoundTabs({ round, tournament, allPlayers, numMatches }: RoundTabsProps) {
  const t = useTranslations("common")
  const { matchResults, fetchRoundDetails } = useTournamentStore()
  const { currentUser } = useUserStore()
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);
  const [matchesPage, setMatchesPage] = useState(1);
  const lobbiesPerPage = 4;

  // Use refs so the polling closure always reads the LATEST values without re-registering the effect
  const roundRef = React.useRef(round);
  const matchResultsRef = React.useRef(matchResults);
  const fetchRef = React.useRef(fetchRoundDetails);
  roundRef.current = round;
  matchResultsRef.current = matchResults;
  fetchRef.current = fetchRoundDetails;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let isMounted = true;

    const checkAndPoll = () => {
      if (!isMounted) return;

      const currentRound = roundRef.current;
      const currentResults = matchResultsRef.current;

      // Check if any lobby is still missing results
      let earliestStartTime = Number.MAX_SAFE_INTEGER;
      let hasPending = false;

      currentRound.lobbies?.forEach(l => {
        if (!l.fetchedResult) {
          hasPending = true;
        }
        l.matches?.forEach(m => {
          if (!currentResults[m.id] || currentResults[m.id].length === 0) {
            hasPending = true;
            const createdMs = new Date(m.createdAt || Date.now()).getTime();
            if (createdMs < earliestStartTime) earliestStartTime = createdMs;
          }
        });
      });

      if (!hasPending) {
        setPollingMessage(null);
        return; // All results loaded — stop polling
      }

      if (earliestStartTime === Number.MAX_SAFE_INTEGER) {
        earliestStartTime = Date.now();
      }

      const timeElapsedMs = Date.now() - earliestStartTime;
      const minutesElapsed = Math.floor(timeElapsedMs / (1000 * 60));
      const isDev = process.env.NODE_ENV === 'development';

      if (!isDev && minutesElapsed < 20) {
        const minLeft = 20 - minutesElapsed;
        setPollingMessage(t("waiting_for_results", { minutes: minLeft }));
        timeout = setTimeout(checkAndPoll, 60000);
      } else {
        setPollingMessage(t("syncing_results"));
        fetchRef.current(tournament.id, currentRound.id).then(() => {
          if (isMounted) timeout = setTimeout(checkAndPoll, isDev ? 5000 : 15000);
        }).catch(() => {
          if (isMounted) timeout = setTimeout(checkAndPoll, isDev ? 5000 : 15000);
        });
      }
    };

    checkAndPoll();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id, tournament.id]);

  const sortedMatchLobbies = round.lobbies
    ?.slice()
    .sort((a, b) => {
      if (a.fetchedResult && !b.fetchedResult) return -1;
      if (!a.fetchedResult && b.fetchedResult) return 1;
      const numA = parseInt(a.name.replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(b.name.replace(/[^0-9]/g, '')) || 0;
      return numA - numB;
    }) || [];

  const totalMatchesPages = Math.ceil(sortedMatchLobbies.length / lobbiesPerPage);
  const visibleMatchLobbies = sortedMatchLobbies.slice((matchesPage - 1) * lobbiesPerPage, matchesPage * lobbiesPerPage);

  return (
    <Tabs defaultValue="results" className="w-full">
      <TabsList>
        <TabsTrigger value="results">{t("round_results")}</TabsTrigger>
        <TabsTrigger value="matches">{t("match_details")}</TabsTrigger>
        <TabsTrigger value="lobbies">{t("lobby_breakdown")}</TabsTrigger>
      </TabsList>
      <TabsContent value="results">
        <ResultsTab round={round} tournament={tournament} allPlayers={allPlayers} numMatches={numMatches} />
      </TabsContent>
      <TabsContent value="matches" className="space-y-6">
        {/* Group matches by lobby for better organization */}
        {visibleMatchLobbies.map((lobby, lobbyIndex) => (
          <div key={lobby.id} className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Badge variant="outline" className="mr-2">{lobby.name}</Badge>
              <span className="text-muted-foreground text-sm">
                {lobby.matches?.length || 0} {(lobby.matches?.length || 0) === 1 ? t("match") : t("matches")}
              </span>
              <span className="ml-auto flex items-center gap-2">
                {pollingMessage && !lobby.fetchedResult && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-[10px] text-blue-400 font-medium whitespace-nowrap">{pollingMessage}</span>
                  </div>
                )}
                <Badge variant={lobby.fetchedResult ? "default" : "outline"}>
                  {lobby.fetchedResult ? t("results_available") : t("pending_results")}
                </Badge>
              </span>
            </h3>
            
            {lobby.matches?.map((match, matchIndex) => {
              // Support both Grimoire format (root-level participants) and legacy Riot format (info.participants)
              const isGrimoire = isGrimoireMatchData(match.matchData);
              const matchInfo = (match.matchData as any)?.info; // legacy only
              const hasAnyData = isGrimoire || !!matchInfo;

              if (!hasAnyData) return (
                <Card key={match.id} className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
                  <CardHeader>
                    <CardTitle>{t("match")} {matchIndex + 1}</CardTitle>
                    <CardDescription>{t("match_data_loading")}</CardDescription>
                  </CardHeader>
                </Card>
              );

              // Normalise participant list & timing for the header summary
              const riotParticipants: any[] = isGrimoire
                ? (match.matchData as GrimoireMatchData).participants
                : (matchInfo?.participants || []);

              const winnerData = riotParticipants.find((p: any) => p.placement === 1);
              // Grimoire uses gameName; legacy uses riotIdGameName
              const winnerRiotName = isGrimoire
                ? (winnerData as any)?.gameName
                : winnerData?.riotIdGameName;
              const winnerParticipant = tournament.participants?.find(p => p.user?.puuid === winnerData?.puuid);
              const winnerName = winnerParticipant?.user?.riotGameName || winnerRiotName || "Unknown";

              const gameCreationMs = isGrimoire
                ? (match.matchData as GrimoireMatchData).gameCreation   // already ms
                : (matchInfo?.gameStartTimestamp ?? matchInfo?.gameCreation ?? Date.now());
              const gameDurationSec = isGrimoire
                ? (match.matchData as GrimoireMatchData).gameDuration
                : (matchInfo?.gameDuration ?? 1800);

              const startTime = new Date(gameCreationMs);
              const endTime   = new Date(gameCreationMs + gameDurationSec * 1000);

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
                  className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${(lobbyIndex * 100) + (matchIndex * 50)}ms` }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{t("match")} {matchIndex + 1}</CardTitle>
                      <Badge variant={winnerData?.puuid ? "default" : "outline"}>
                        {match.status || 'Completed'}
                      </Badge>
                    </div>
                    <CardDescription className="flex flex-col space-y-1">
                      <div className="flex items-center text-xs">
                        <span className="font-medium mr-1">{t("start")}:</span> {format(startTime, "MMM d, yyyy h:mm a")}
                      </div>
                      <div className="flex items-center text-xs">
                        <span className="font-medium mr-1">{t("end")}:</span> {format(endTime, "MMM d, yyyy h:mm a")}
                      </div>
                      <div className="flex items-center text-xs">
                        <span className="font-medium mr-1">{t("duration")}:</span> {formatDuration(gameDurationSec)}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{t("winner")}</div>
                        <div className="flex items-center">
                          <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                          <span className="font-medium">{winnerName}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{t("players")}</div>
                        <div className="flex items-center">
                          <Medal className="mr-2 h-5 w-5 text-primary" />
                          <span className="font-medium">{riotParticipants.length}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{t("total_points")}</div>
                        <div className="flex items-center">
                          <Star className="mr-2 h-5 w-5 text-primary" />
                          <span className="font-medium">{totalPoints} pts</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Collapsible Player results — rich comp view if Grimoire data present */}
                    <Collapsible>
                      <div className="flex justify-center mb-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5">
                            {t("show_details")} <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="animate-in fade-in zoom-in-95 duration-200">
                        {isGrimoireMatchData(match.matchData) ? (
                          // Rich enriched view — traits, units, items, augments + tournament points
                          <MatchCompPanel
                            matchData={match.matchData as GrimoireMatchData}
                            resultMap={Object.fromEntries(
                              tournamentMatchResults
                                .map(r => {
                                  // r.participantId is normalized to userId
                                  const participant = tournament.participants?.find(p => p.userId === r.participantId);
                                  const key = participant?.user?.puuid || `placement_${r.placement}`;
                                  return [key, { placement: r.placement, points: r.points }];
                                })
                            )}
                            highlightPuuid={currentUser?.puuid || undefined}
                          />
                        ) : (
                          // Legacy simple table fallback
                          <div className="border rounded-md">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="py-2 px-4 text-left">{t("participants")}</th>
                                  <th className="py-2 px-4 text-center">{t("placement")}</th>
                                  <th className="py-2 px-4 text-center">{t("points")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tournamentMatchResults
                                  .sort((a, b) => a.placement - b.placement)
                                  .map((result) => {
                                    // After store normalization, result.participantId == userId
                                    const participant = tournament.participants?.find(p => p.userId === result.participantId);
                                    return (
                                      <tr key={result.participantId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="py-2 px-4">
                                          {participant?.user?.riotGameName || participant?.user?.username || "Unknown"}
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                          <span className={`
                                            inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                            ${result.placement === 1 ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-500" : ""}
                                            ${result.placement === 2 ? "bg-gray-400/20 text-gray-700 dark:text-gray-300" : ""}
                                            ${result.placement === 3 ? "bg-amber-500/20 text-amber-700 dark:text-amber-500" : ""}
                                            ${result.placement > 3 ? "bg-secondary text-secondary-foreground" : ""}
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
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
            
            {(!lobby.matches || lobby.matches.length === 0) && (
              <Card className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
                <CardContent className="py-4">
                  <p className="text-center text-muted-foreground">{t("no_matches_lobby")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
        
        {(!round.lobbies || round.lobbies.length === 0) && (
          <Card className="bg-card dark:bg-card/80 backdrop-blur-lg border border-white/20">
            <CardHeader>
              <CardTitle>{t("match_details")}</CardTitle>
              <CardDescription>{t("detailed_breakdown_matches")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{t("match_details_unavailable")}</p>
            </CardContent>
          </Card>
        )}

        {totalMatchesPages > 1 && (
          <div className="flex justify-center items-center gap-4 py-4 mt-6 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMatchesPage(p => Math.max(1, p - 1))}
              disabled={matchesPage === 1}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("prev")}
            </Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t("page_x_of_y", { x: matchesPage, y: totalMatchesPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMatchesPage(p => Math.min(totalMatchesPages, p + 1))}
              disabled={matchesPage === totalMatchesPages}
              className="flex items-center"
            >
              {t("next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </TabsContent>
      <TabsContent value="lobbies">
        <LobbiesTab round={round} allPlayers={allPlayers} numMatches={numMatches} tournamentId={tournament.id} />
      </TabsContent>
    </Tabs>
  )
}