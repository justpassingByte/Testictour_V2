"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SortAsc, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { IPhase } from "@/app/types/tournament"
import {
  PHASE_RULE_COLOR_MAP,
  getAdvancementText,
  getGroupsLabel,
  getPhaseRuleContent,
} from "../rules/rules-shared"
import { PHASE_RULE_ICON_MAP } from "../rules/rules-icons"

interface PhaseRulesViewProps {
  phase: IPhase
}

export function PhaseRulesView({ phase }: PhaseRulesViewProps) {
  const t = useTranslations("common")
  const ruleContent = getPhaseRuleContent(t, t.raw.bind(t), phase.type)
  const icon = PHASE_RULE_ICON_MAP[ruleContent.type] || PHASE_RULE_ICON_MAP.swiss
  const colorClass = PHASE_RULE_COLOR_MAP[ruleContent.type] || "text-primary"
  const advancementText = getAdvancementText(t, phase)

  const lobbyAssignmentLabel = (() => {
    const a = phase.lobbyAssignment
    if (!a || a === "none") return t("no_shuffle_assignment_desc").split(".")[0]
    if (a === "random") return "Random"
    if (a === "seeded" || a === "swiss") return "Swiss / Seeded"
    if (a === "snake") return "Snake"
    return a
  })()

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10 overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/5 bg-muted/20">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("rules_tiebreak_title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground italic mt-1">
            {t("phase_rules_subtitle", { name: phase.name, number: phase.phaseNumber })}
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-current/10 ${colorClass} shrink-0`}>{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-lg">{ruleContent.label}</h3>
                <Badge variant="outline" className={`${colorClass} border-current/30 bg-current/5 text-[10px] uppercase font-bold`}>
                  {t("stage_n", { number: phase.phaseNumber })}
                </Badge>
                {phase.matchesPerRound && phase.matchesPerRound > 1 && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    {t("matches_n_per_round", { count: phase.matchesPerRound })}
                  </Badge>
                )}
              </div>
              {ruleContent.desc && (
                <p className="text-sm text-muted-foreground mt-1">{ruleContent.desc}</p>
              )}
            </div>
          </div>

          {ruleContent.items.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
                  <SortAsc className="h-3 w-3" />
                  {t("rules_tiebreak_priority")}
                </p>
              </div>
              {ruleContent.items.map((item, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${colorClass} bg-current/10`}>
                    {i + 1}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground/90">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="text-base font-semibold">{t("phase_format_details")}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("matches_per_player")}</p>
            <p className="font-medium">{phase.matchesPerRound || t("continuous")} {t("matches")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("advancement")}</p>
            <p className="font-medium">{advancementText}</p>
          </div>
          {phase.numberOfRounds !== undefined && phase.numberOfRounds > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("structure")}</p>
              <p className="font-medium">
                {phase.numberOfRounds} {t("groups")} (Bảng {getGroupsLabel(phase.numberOfRounds)})
              </p>
            </div>
          )}
          {phase.eliminationRule && (
            <div>
              <p className="text-xs uppercase tracking-wider text-red-400/70 mb-1">{t("elimination_rule")}</p>
              <p className="font-medium">{phase.eliminationRule}</p>
            </div>
          )}
          {phase.lobbyAssignment && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("lobby_assignment")}</p>
              <p className="font-medium">{lobbyAssignmentLabel}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
