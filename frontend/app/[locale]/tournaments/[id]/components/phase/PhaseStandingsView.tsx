"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Trophy, Loader2, Info } from "lucide-react"
import { IPhase } from "@/app/types/tournament"
import { RoundService } from "@/app/services/RoundService"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { mergePhaseScoreboards, placementBadgeClass } from "./standings-utils"
import { getPlayerInGameTag } from "./player-identity"

interface PhaseStandingsViewProps {
  tournamentId: string
  phase: IPhase
}

function StatCell({ value, highlight }: { value: number | string; highlight?: boolean }) {
  return (
    <TableCell className={`text-center tabular-nums text-sm ${highlight ? "font-bold text-primary" : "text-foreground/90"}`}>
      {value}
    </TableCell>
  )
}

export function PhaseStandingsView({ tournamentId, phase }: PhaseStandingsViewProps) {
  const t = useTranslations("common")
  const rounds = phase.rounds || []

  const { data: scoreboards, isLoading, error } = useQuery({
    queryKey: ["phase-standings", tournamentId, phase.id, rounds.map((r) => r.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        rounds.map((round) => RoundService.getScoreboard(round.id).catch(() => null))
      )
      return results.filter(Boolean)
    },
    enabled: rounds.length > 0,
    staleTime: 10000,
  })

  const mergedPlayers = useMemo(
    () => (scoreboards?.length ? mergePhaseScoreboards(scoreboards) : []),
    [scoreboards]
  )

  const numMatchCols = useMemo(() => {
    if (!scoreboards?.length) return 1
    const fromSummary = Math.max(...scoreboards.map((sb: any) => sb.summary?.numMatchColumns || 0))
    const fromPlayers = Math.max(...mergedPlayers.map((p) => p.placements.length), 0)
    return Math.max(fromSummary, fromPlayers, 1)
  }, [scoreboards, mergedPlayers])

  if (rounds.length === 0) {
    return (
      <Card className="bg-card/60 border border-white/10">
        <CardContent className="p-10 text-center text-muted-foreground">
          {t("no_structural_phases")}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{t("loading")}</span>
      </div>
    )
  }

  if (error || mergedPlayers.length === 0) {
    return (
      <Card className="bg-card/60 border border-white/10">
        <CardContent className="p-10 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("no_results_yet")}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">{t("standings_update_after_matches")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-muted-foreground">
          <p className="font-semibold text-foreground">{t("standings_tiebreak_note_title")}</p>
          <p className="text-xs leading-relaxed">{t("standings_tiebreak_note_desc")}</p>
        </div>
      </div>

      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent bg-muted/20">
                  <TableHead className="w-12 text-center sticky left-0 bg-muted/20 z-10">#</TableHead>
                  <TableHead className="min-w-[120px] sticky left-12 bg-muted/20 z-10">{t("real_name")}</TableHead>
                  <TableHead className="min-w-[120px] hidden lg:table-cell">{t("discord_id")}</TableHead>
                  <TableHead className="min-w-[140px]">{t("ingame_tag")}</TableHead>
                  <TableHead className="text-center hidden md:table-cell">{t("groups")}</TableHead>
                  <TableHead className="text-center font-bold text-primary min-w-[72px]">{t("total")}</TableHead>
                  {Array.from({ length: numMatchCols }).map((_, i) => (
                    <TableHead key={i} className="text-center min-w-[64px] whitespace-nowrap">
                      {t("match")} {i + 1}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[52px] whitespace-nowrap" title={t("stat_top1_hint")}>
                    {t("stat_top1_short")}
                  </TableHead>
                  <TableHead className="text-center min-w-[52px] whitespace-nowrap" title={t("stat_top2_hint")}>
                    {t("stat_top2_short")}
                  </TableHead>
                  <TableHead className="text-center min-w-[52px] whitespace-nowrap" title={t("stat_top3_hint")}>
                    {t("stat_top3_short")}
                  </TableHead>
                  <TableHead className="text-center min-w-[56px] whitespace-nowrap" title={t("stat_top4_hint")}>
                    {t("stat_top4_short")}
                  </TableHead>
                  <TableHead className="text-center min-w-[64px] whitespace-nowrap" title={t("stat_sum_place_hint")}>
                    {t("stat_sum_place_short")}
                  </TableHead>
                  <TableHead className="text-center min-w-[52px] whitespace-nowrap" title={t("best_placement")}>
                    {t("stat_best_short")}
                  </TableHead>
                  <TableHead className="text-center min-w-[72px]">{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedPlayers.map((player, idx) => (
                  <TableRow
                    key={player.id}
                    className={`border-white/5 ${player.status === "eliminated" ? "opacity-55" : ""}`}
                  >
                    <TableCell className="text-center font-bold sticky left-0 bg-card/95 z-10">
                      {idx < 3 ? (
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                            ${idx === 0 ? "bg-amber-500/20 text-amber-400" : ""}
                            ${idx === 1 ? "bg-slate-400/20 text-slate-300" : ""}
                            ${idx === 2 ? "bg-orange-600/20 text-orange-400" : ""}
                          `}
                        >
                          {idx === 0 ? <Trophy className="h-3.5 w-3.5" /> : idx + 1}
                        </span>
                      ) : (
                        idx + 1
                      )}
                    </TableCell>
                    <TableCell
                      className={`font-medium sticky left-12 bg-card/95 z-10 min-w-[120px] ${player.status === "eliminated" ? "line-through" : ""}`}
                    >
                      <div className="truncate max-w-[140px]" title={player.username || player.name}>
                        {player.username || player.name || "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate lg:hidden">
                        {player.discordId || getPlayerInGameTag(player)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell min-w-[120px]">
                      {player.discordId ? (
                        <span className="font-mono text-xs text-[#5865F2] truncate block max-w-[140px]" title={player.discordId}>
                          {player.discordId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="font-medium truncate max-w-[160px]" title={getPlayerInGameTag(player)}>
                        {getPlayerInGameTag(player)}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate md:hidden">{player.lobbyName}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <div className="flex gap-1 flex-wrap justify-center">
                        {player.groups.map((g) => (
                          <Badge key={g} variant="outline" className="text-[10px] px-1.5">{g}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary text-base tabular-nums">
                      {player.total}
                    </TableCell>
                    {Array.from({ length: numMatchCols }).map((_, i) => (
                      <TableCell key={i} className="text-center p-1">
                        {player.placements[i] !== undefined ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${placementBadgeClass(player.placements[i])}`}
                            >
                              {player.placements[i]}
                            </span>
                            {player.points[i] !== undefined && (
                              <span className="text-[9px] text-muted-foreground tabular-nums">
                                {player.points[i]}pt
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                    ))}
                    <StatCell value={player.stats.top1} highlight={player.stats.top1 > 0} />
                    <StatCell value={player.stats.top2} />
                    <StatCell value={player.stats.top3} />
                    <StatCell value={player.stats.top4} highlight={player.stats.top4 > 0} />
                    <StatCell value={player.stats.sumPlacements || "—"} />
                    <StatCell value={player.stats.bestPlacement ?? "—"} />
                    <TableCell className="text-center">
                      {player.status === "advanced" && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {t("advanced")}
                        </Badge>
                      )}
                      {player.status === "eliminated" && (
                        <Badge variant="outline" className="text-red-400 border-red-500/30 text-[10px]">
                          {t("eliminated")}
                        </Badge>
                      )}
                      {player.status === "pending" && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">—</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
