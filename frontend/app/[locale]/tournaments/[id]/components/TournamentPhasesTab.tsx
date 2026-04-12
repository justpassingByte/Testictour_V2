import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IPhase } from "@/app/types/tournament"
import { Trophy, Users, ShieldAlert, ArrowUpCircle } from "lucide-react"
import { useTranslations } from "next-intl"

interface TournamentPhasesTabProps {
  phases: IPhase[];
}

export function TournamentPhasesTab({ phases }: TournamentPhasesTabProps) {
  const t = useTranslations("common")

  if (!phases || phases.length === 0) {
    return <p className="text-muted-foreground text-center">{t("no_structural_phases")}</p>
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => {
        // Human readable phase format
        let formatType: string = phase.type;
        switch(phase.type?.toLowerCase()) {
          case 'group_stage': formatType = t('phase_group_stage'); break;
          case 'knockout': formatType = t('phase_knockout'); break;
          case 'points': formatType = t('phase_points'); break;
          case 'swiss': formatType = t('phase_swiss'); break;
          case 'checkmate': formatType = t('phase_checkmate'); break;
          case 'elimination': formatType = t('phase_elimination'); break;
        }

        // Parse advancement format
        let advancementText = t("based_on_standard_ruleset");
        const advCondition = phase.advancementCondition as any;
        if (advCondition) {
           if (advCondition.type === 'top_n_scores') advancementText = t("top_n_scorers_advance", { value: advCondition.value });
           else if (advCondition.type === 'placement') advancementText = t("top_n_placements_advance", { value: advCondition.value });
           else if (advCondition.winCondition === 'checkmate_win') advancementText = t("requires_points_for_checkmate", { points: advCondition.pointsToActivate });
        }

        return (
          <Card 
            key={phase.id} 
            className="overflow-hidden bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="p-4 bg-muted/20 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-primary/70" />
                {t("stage_n", { number: phase.phaseNumber })}: {phase.name}
              </CardTitle>
              <Badge variant="outline" className="uppercase text-xs font-semibold px-2 py-1 bg-primary/10 text-primary">
                {formatType}
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("matches_per_player")}</p>
                      <p className="font-medium text-foreground">{phase.matchesPerRound || t('continuous')} {t("matches")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                      <ArrowUpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("advancement")}</p>
                      <p className="font-medium text-foreground">{advancementText}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {phase.numberOfGroups !== undefined && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("structure")}</p>
                        <p className="font-medium text-foreground">{phase.numberOfGroups} {t("groups")}</p>
                      </div>
                    </div>
                  )}

                  {phase.eliminationRule && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-rose-500/70">{t("elimination_rule")}</p>
                        <p className="font-medium text-foreground">{phase.eliminationRule}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
