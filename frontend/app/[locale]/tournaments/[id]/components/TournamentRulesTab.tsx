"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableIcon, Trophy, Info, ShieldCheck, BookOpen, ChevronRight, BarChart2, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { ITournament } from "@/app/types/tournament"
import { getPhaseRuleContent, PHASE_RULE_COLOR_MAP } from "./rules/rules-shared"

interface TournamentRulesTabProps {
  tournament: ITournament
}

export const TournamentRulesTab = ({ tournament }: TournamentRulesTabProps) => {
  const t = useTranslations("common")
  const phases = tournament?.phases || []

  return (
    <div className="space-y-6">
      {/* Per-phase quick links — avoid dumping all tiebreak rules here */}
      {phases.length > 0 && (
        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10 overflow-hidden">
          <CardHeader className="pb-4 border-b border-white/5 bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t("rules_by_phase")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{t("rules_by_phase_desc")}</p>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {phases.map((phase) => {
              const ruleContent = getPhaseRuleContent(t, t.raw.bind(t), phase.type)
              const colorClass = PHASE_RULE_COLOR_MAP[ruleContent.type] || "text-primary"
              const isLive = phase.status === "in_progress" || phase.status === "PLAYING"

              return (
                <Link
                  key={phase.id}
                  href={`/tournaments/${tournament.id}/phases/${phase.phaseNumber}/rules`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/15 border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {t("stage_n", { number: phase.phaseNumber })}: {phase.name}
                      </span>
                      <Badge variant="outline" className={`${colorClass} text-[10px] uppercase`}>
                        {ruleContent.label}
                      </Badge>
                      {isLive && (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[9px] animate-pulse">
                          {t("live")}
                        </Badge>
                      )}
                    </div>
                    {ruleContent.desc && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ruleContent.desc}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Tournament-wide general rules */}
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10 overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/5 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("additional_tournament_rules")}
              </CardTitle>
              <p className="text-xs text-muted-foreground italic">{t("rules_tiebreak_subtitle")}</p>
            </div>
            <Trophy className="h-10 w-10 text-primary/20" />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                {t("lobby_assignment_rules")}
              </h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-cyan-400" /> Random Assignment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("random_assignment_desc", { fallback: "Players are completely randomly reassigned to new lobbies before each match." })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-cyan-400" /> Swiss / Seeded Assignment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("seeded_assignment_desc", { fallback: "Players with the same amount of points are placed in the same lobbies." })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <TableIcon className="h-4 w-4 text-cyan-400" /> Snake Assignment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("snake_assignment_desc", { fallback: "Players are distributed using a zigzag draft order based on points." })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" /> No Shuffle (Fixed Lobbies)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("no_shuffle_assignment_desc", { fallback: "Players stay in the same lobby for the entire BoX series." })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t("general_rules")}
              </h4>
              <ul className="space-y-2">
                {[1, 2, 3, 4].map((num) => (
                  <li key={num} className="flex gap-3 text-xs text-muted-foreground items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {t(`rule_${num}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
