import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IPhase } from "@/app/types/tournament"
import { Trophy, Users, ShieldAlert, ArrowUpCircle, LayoutGrid, BarChart3, BookOpen, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

interface TournamentPhasesTabProps {
  phases: IPhase[];
  tournamentId: string;
}

export function TournamentPhasesTab({ phases, tournamentId }: TournamentPhasesTabProps) {
  const getGroupsLabel = (count: number) => {
    if (!count) return '';
    const letters = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
    return letters.join(', ');
  };

  const t = useTranslations("common")

  if (!phases || phases.length === 0) {
    return <p className="text-muted-foreground text-center">{t("no_structural_phases")}</p>
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => {
        let formatType: string = phase.type;
        switch(phase.type?.toLowerCase()) {
          case 'group_stage': formatType = t('phase_group_stage'); break;
          case 'knockout': formatType = t('phase_knockout'); break;
          case 'points': formatType = t('phase_points'); break;
          case 'swiss': formatType = t('phase_swiss'); break;
          case 'checkmate': formatType = t('phase_checkmate'); break;
          case 'elimination': formatType = t('phase_elimination'); break;
        }

        let advancementText = t("based_on_standard_ruleset");
        const advCondition = phase.advancementCondition as any;
        if (advCondition) {
           if (advCondition.type === 'top_n_scores') advancementText = t("top_n_scorers_advance", { value: advCondition.value });
           else if (advCondition.type === 'placement') advancementText = t("top_n_placements_advance", { value: advCondition.value });
           else if (advCondition.winCondition === 'checkmate_win') advancementText = t("requires_points_for_checkmate", { points: advCondition.pointsToActivate });
        }

        const basePath = `/tournaments/${tournamentId}/phases/${phase.phaseNumber}`;
        const isLive = phase.status === 'in_progress' || phase.status === 'PLAYING';

        return (
          <Card 
            key={phase.id} 
            className="overflow-hidden bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="p-4 bg-muted/20 border-b border-white/5 flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                <div className="h-8 w-1 rounded-full bg-primary/70" />
                {t("stage_n", { number: phase.phaseNumber })}: {phase.name}
                {isLive && (
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/50 text-[10px] font-bold animate-pulse">
                    {t("live")}
                  </Badge>
                )}
              </CardTitle>
              <Badge variant="outline" className="uppercase text-xs font-semibold px-2 py-1 bg-primary/10 text-primary shrink-0">
                {formatType}
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
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
                  {phase.numberOfRounds !== undefined && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("structure")}</p>
                        <p className="font-medium text-foreground">
                          {phase.numberOfRounds} {t("groups")} {phase.numberOfRounds > 0 ? `(Bảng ${getGroupsLabel(phase.numberOfRounds)})` : ''}
                        </p>
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

              {/* APAC TFT-style phase navigation */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <Link href={`${basePath}/standings`}>
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-9 border-white/10 hover:border-primary/30 hover:bg-primary/5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {t("current_standings")}
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </Button>
                </Link>
                <Link href={`${basePath}/lobbies`}>
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-9 border-white/10 hover:border-primary/30 hover:bg-primary/5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {t("group_bracket_tab")}
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </Button>
                </Link>
                <Link href={`${basePath}/rules`}>
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-9 border-white/10 hover:border-primary/30 hover:bg-primary/5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t("rules")}
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
