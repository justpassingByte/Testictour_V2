"use client"

import { useState } from "react"
import Link from "next/link"
import { PlayerRoundStats, IRound, LobbyState } from "@/app/types/tournament"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useUserStore } from "@/app/stores/userStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"

interface LobbiesTabProps {
  round: IRound
  allPlayers: PlayerRoundStats[]
  numMatches: number
  tournamentId: string
}

// State badge colors — handles both LobbyState machine values and DB state strings
function LobbyStateBadge({ state, t }: { state?: string, t: any }) {
  if (!state) return <Badge variant="outline">{t("pending")}</Badge>

  const config: Record<string, { label: string; class: string; pulse?: boolean }> = {
    WAITING: { label: t('waiting'), class: 'text-muted-foreground border-muted' },
    READY_CHECK: { label: t('ready_check'), class: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40', pulse: true },
    GRACE_PERIOD: { label: t('grace_period'), class: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40', pulse: true },
    STARTING: { label: t('starting'), class: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40', pulse: true },
    PLAYING: { label: t('in_progress'), class: 'bg-primary/20 text-primary border-primary/40', pulse: true },
    FINISHED: { label: t('finished'), class: 'bg-green-700/20 text-green-700 dark:text-green-500 border-green-700/30' },
    PAUSED: { label: t('paused'), class: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40' },
    ADMIN_INTERVENTION: { label: t('admin_review'), class: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40', pulse: true },
  }

  const entry = config[state] ?? { label: state, class: 'text-muted-foreground border-muted' }
  return (
    <Badge variant="outline" className={`${entry.class} ${entry.pulse ? 'animate-pulse' : ''}`}>
      {entry.label}
    </Badge>
  )
}

export function LobbiesTab({ round, allPlayers, tournamentId }: LobbiesTabProps) {
  const t = useTranslations("common");
  const { currentUser } = useUserStore()
  const [currentPage, setCurrentPage] = useState(1);
  const lobbiesPerPage = 4;

  const sortedLobbies = round.lobbies
    ?.slice()
    .sort((a, b) => {
      if (a.fetchedResult && !b.fetchedResult) return -1;
      if (!a.fetchedResult && b.fetchedResult) return 1;
      const numA = parseInt(a.name.replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(b.name.replace(/[^0-9]/g, '')) || 0;
      return numA - numB;
    }) || [];

  const totalPages = Math.ceil(sortedLobbies.length / lobbiesPerPage);
  const visibleLobbies = sortedLobbies.slice((currentPage - 1) * lobbiesPerPage, currentPage * lobbiesPerPage);

  return (
    <div className="space-y-4">
      {visibleLobbies.map((lobby, index) => {
        const lobbyPlayers = allPlayers.filter((p) => p.lobbyName === lobby.name)
        const matchesInLobby = lobby.matches?.length || 0
        const isMyLobby = currentUser && lobbyPlayers.some(p => p.name === currentUser.riotGameName)
        const LIVE_STATES = ['READY_CHECK', 'GRACE_PERIOD', 'STARTING', 'PLAYING', 'PAUSED'];
        const DONE_STATES = ['FINISHED', 'ADMIN_INTERVENTION'];
        const isLive = lobby.state ? LIVE_STATES.includes(lobby.state) : false;
        const isDone = lobby.state ? DONE_STATES.includes(lobby.state) : false;

        return (
          <Card
            key={lobby.id}
            className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in-up
                ${isMyLobby
                ? 'bg-primary/5 border-primary ring-2 ring-primary/50'
                : 'bg-card shadow-sm border border-white/10 hover:shadow-primary/10'}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className={isMyLobby ? "text-primary" : ""}>{lobby.name}</CardTitle>
                  {isMyLobby && (
                    <Badge variant="default" className="bg-primary animate-pulse-subtle flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {t("my_lobby")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Live state badge — shows real-time status */}
                  <LobbyStateBadge state={lobby.state} t={t} />
                  {/* Results badge (legacy) */}
                  {lobby.fetchedResult && (
                    <Badge variant="default">{t("results_available")}</Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {lobbyPlayers.filter((p) => p.status === "advanced").length} {t("advanced")} •{" "}
                {lobbyPlayers.filter((p) => p.status === "eliminated").length} {t("eliminated")} •{" "}
                {lobbyPlayers.filter((p) => p.status === "pending").length > 0
                  ? `${lobbyPlayers.filter((p) => p.status === "pending").length} ${t("pending")} • `
                  : ''}
                {matchesInLobby} {matchesInLobby === 1 ? t("match") : t("matches")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("player")}</TableHead>
                    <TableHead className="text-center">{t("region")}</TableHead>
                    <TableHead className="text-center">{t("total_points")}</TableHead>
                    <TableHead className="text-center">{t("avg_placement")}</TableHead>
                    <TableHead className="text-center">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lobbyPlayers
                    .sort((a, b) => b.total - a.total)
                    .map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Link href={`/players/${player.id}`} className="hover:text-primary font-medium">
                            {player.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{player.region}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{player.total}</TableCell>
                        <TableCell className="text-center">
                          {player.placements.length > 0
                            ? (player.placements.reduce((a, b) => a + b, 0) / player.placements.length).toFixed(1)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`
                                  ${player.status === "advanced" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                player.status === "eliminated" ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                                  "bg-slate-500/20 text-slate-700 dark:text-slate-400"
                              }
                                `}
                          >
                            {player.status === "pending" ? t("awaiting") : t(player.status as any)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {/* View Lobby button — show for all states so users can ready up */}
              {(isLive || isDone || lobby.fetchedResult || lobby.state === 'WAITING') && (
                <div className="mt-4 flex justify-end">
                  <Button asChild variant={isLive ? "default" : "outline"} size="sm" className={`gap-1.5 ${isLive ? 'btn-zodiac px-6' : ''}`}>
                    <Link href={`/tournaments/${tournamentId}/lobbies/${lobby.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isLive ? t("join_lobby_live") : (lobby.state === 'WAITING' ? t("enter_lobby_area") : t("view_all_results"))}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4 mt-6 border-t border-white/5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("prev")}
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("page_x_of_y", { x: currentPage, y: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}

