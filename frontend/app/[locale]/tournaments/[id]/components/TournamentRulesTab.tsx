"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableIcon, Trophy, SortAsc, Star, Swords, BarChart2, RefreshCw, Info, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { ITournament } from '@/app/types/tournament';

interface TournamentRulesTabProps {
  tournament: ITournament;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  swiss: <BarChart2 className="h-4 w-4" />,
  elimination: <Swords className="h-4 w-4" />,
  elimination_bo: <Swords className="h-4 w-4" />,
  checkmate: <Trophy className="h-4 w-4" />,
  points: <Star className="h-4 w-4" />,
  round_robin: <RefreshCw className="h-4 w-4" />,
};

const COLOR_MAP: Record<string, string> = {
  swiss: 'text-blue-400',
  elimination: 'text-red-400',
  elimination_bo: 'text-red-400',
  checkmate: 'text-yellow-400',
  points: 'text-green-400',
  round_robin: 'text-purple-400',
};

export const TournamentRulesTab = ({ tournament }: TournamentRulesTabProps) => {
  const t = useTranslations("common")
  const phases = tournament?.phases || [];

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10 overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/5 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("rules_tiebreak_title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground italic">
                {t("rules_tiebreak_subtitle")}
              </p>
            </div>
            <Trophy className="h-10 w-10 text-primary/20" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-8">
          {/* Active Phases Rules */}
          <div className="space-y-6">
            {phases.map((phase, phaseIdx) => {
              let type = (phase.type || '').toLowerCase();
              const isEliminationBO = type === 'elimination' && phase.matchesPerRound && phase.matchesPerRound > 1;
              if (isEliminationBO) {
                type = 'elimination_bo';
              }

              const icon = ICON_MAP[type] || <Star className="h-4 w-4" />;
              const colorClass = COLOR_MAP[type] || 'text-primary';
              
              // Get translation data using flat keys
              const label = t(`rules_tiebreak_${type}_label`);
              const desc = t(`rules_tiebreak_${type}_desc`);
              const items = t.raw(`rules_tiebreak_${type}_items`);
              
              const finalItems = Array.isArray(items) ? items : [];

              return (
                <div key={phase.id || phaseIdx} className="relative group">
                  {/* Phase Side Indicator */}
                  <div className={`absolute -left-6 top-0 bottom-0 w-1 rounded-full bg-current opacity-20 ${colorClass}`} />
                  
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-current/10 ${colorClass}`}>
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">
                            {t("rules_phase_info", { number: phaseIdx + 1 })}
                          </h4>
                          <Badge variant="outline" className={`${colorClass} border-current/30 bg-current/5 text-[10px] uppercase font-bold tracking-wider`}>
                            {label}
                          </Badge>
                          {phase.matchesPerRound && phase.matchesPerRound > 1 && (
                            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              {t("matches_n_per_round", { count: phase.matchesPerRound })}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {desc}
                        </p>
                      </div>
                    </div>

                    {/* Tiebreaks Grid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
                          <SortAsc className="h-3 w-3" />
                          {t("rules_tiebreak_priority")}
                        </p>
                      </div>
                      {finalItems.map((item: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-white/5 hover:border-white/10 transition-colors">
                          <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${colorClass} bg-current/10`}>
                            {i + 1}
                          </span>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-foreground/90">{item.label}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* General Additional Rules */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                {t("lobby_assignment_rules")}
              </h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm font-semibold">{t("random_assignment")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("random_assignment_desc")}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm font-semibold">{t("seeded_assignment")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("seeded_assignment_desc")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t("additional_tournament_rules")}
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
  );
};