"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchDetailsInline } from "./match-details-inline";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Coins, ChevronDown, ChevronRight, Trophy } from "lucide-react";

interface PlayerMatchDisplay {
  id: string;
  tournamentId: string;
  tournamentName: string;
  roundNumber: number;
  matchId: string;
  placement: number;
  points: number;
  prize?: number;
  date: string;
  userId: string;
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

interface PlayerMatchHistoryTableProps {
  matches: PlayerHistoryGroupDisplay[];
}

export function PlayerMatchHistoryTable({ matches }: PlayerMatchHistoryTableProps) {
  const t = useTranslations("common");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleViewDetails = (matchId: string, userId: string) => {
    if (expandedMatchId === matchId) {
       setExpandedMatchId(null);
    } else {
       setExpandedMatchId(matchId);
       setSelectedUserId(userId);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-4">{t("lobby_match_history")}</h2>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{t("tournament_lobby")}</TableHead>
                <TableHead className="text-center">{t("matches_played")}</TableHead>
                <TableHead className="text-center">{t("total_points")}</TableHead>
                <TableHead className="text-center">{t("prize")}</TableHead>
                <TableHead className="text-right">{t("last_played")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.length > 0 ? (
                matches.map((group) => (
                  <Fragment key={group.id}>
                    {/* Parent Row */}
                    <TableRow className={`cursor-pointer hover:bg-muted/50 ${expandedGroups[group.id] ? 'bg-muted/30' : ''}`} onClick={() => toggleGroup(group.id)}>
                      <TableCell>
                        {expandedGroups[group.id] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="hover:text-primary transition-colors">
                          {group.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                           {group.matchesCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">{group.totalPoints}</TableCell>
                      <TableCell className="text-center">
                        {group.prize > 0 ? (
                          <span className="flex items-center justify-center font-bold text-yellow-500">
                            <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                            {group.prize}
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{group.playedAt}</TableCell>
                    </TableRow>

                    {/* Expanded Child Rows */}
                    {expandedGroups[group.id] && (
                      <TableRow className="bg-muted/10">
                        <TableCell colSpan={6} className="p-0 border-b-0">
                           <div className="py-2 px-12 space-y-1">
                             <Table className="bg-background rounded-md border shadow-sm">
                               <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-xs">{t("match_number")}</TableHead>
                                    <TableHead className="h-8 text-xs text-center">{t("placement")}</TableHead>
                                    <TableHead className="h-8 text-xs text-center">{t("points")}</TableHead>
                                    <TableHead className="h-8 text-xs text-center">{t("prize")}</TableHead>
                                    <TableHead className="h-8 text-xs text-center">{t("action")}</TableHead>
                                  </TableRow>
                               </TableHeader>
                               <TableBody>
                                  {group.matches.map((match, idx) => (
                                    <Fragment key={match.id}>
                                      <TableRow className="border-0">
                                      <TableCell className="py-2 text-xs text-muted-foreground">
                                        {t("match")} {group.matches.length - idx}
                                      </TableCell>
                                      <TableCell className="py-2 text-center text-xs">
                                        <span
                                          className={`
                                            inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
                                            ${match.placement === 1 ? "bg-yellow-500 text-white shadow-sm" : ""}
                                            ${match.placement === 2 ? "bg-slate-300 text-slate-700 shadow-sm" : ""}
                                            ${match.placement === 3 ? "bg-amber-600 text-white shadow-sm" : ""}
                                            ${match.placement > 3 ? "text-muted-foreground" : ""}
                                          `}
                                        >
                                          {match.placement === 1 && <Trophy className="h-2.5 w-2.5 mr-0.5" />}
                                          {match.placement}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-2 text-center text-xs font-medium">+{match.points}</TableCell>
                                      <TableCell className="py-2 text-center text-xs font-medium text-yellow-500">
                                        {match.prize && match.prize > 0 ? (
                                          <span className="flex items-center justify-center">
                                            <Coins className="h-3 w-3 mr-1" />
                                            {match.prize}
                                          </span>
                                        ) : '-'}
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             handleViewDetails(match.matchId, match.userId);
                                          }}
                                        >
                                          {expandedMatchId === match.matchId ? t("hide_detail") : t("view_detail")}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                    
                                    {/* Inline Expanded Match Details */}
                                    {expandedMatchId === match.matchId && (
                                       <TableRow className="bg-background">
                                         <TableCell colSpan={5} className="p-0 border-x border-b border-primary/20">
                                            <MatchDetailsInline matchId={match.matchId} userId={match.userId} />
                                         </TableCell>
                                       </TableRow>
                                    )}
                                  </Fragment>
                                ))}
                               </TableBody>
                             </Table>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t("no_lobbies_tournaments_found")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 