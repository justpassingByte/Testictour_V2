"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { Table } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate"

interface TournamentFormatCardProps {
  tournament: ITournament;
}

export function TournamentFormatCard({ tournament }: TournamentFormatCardProps) {
  const t = useTranslations("common")
  const { formatVndText } = useCurrencyRate()
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Table className="mr-2 h-5 w-5 text-primary" />
          {t("tournament_format")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
     
        <div className="flex justify-between items-start">
          <div className="text-muted-foreground mt-0.5">{t("registration_fee")}:</div>
          <div className="text-right">
            <div className="font-medium">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(
                (tournament.entryFee || 0)
              )} <span className="text-[10px] ml-0.5 text-muted-foreground">USD</span>
            </div>
            <div className="text-[10px] text-muted-foreground opacity-70">{formatVndText(tournament.entryFee || 0)}</div>
          </div>
        </div>
        <div className="flex justify-between items-start">
          <div className="text-muted-foreground mt-0.5">{t("prize_pool")}:</div>
          <div className="text-right">
            <div className="font-medium">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(
                tournament.budget || 0
              )} <span className="text-[10px] ml-0.5 text-muted-foreground">USD</span>
            </div>
            <div className="text-[10px] text-muted-foreground opacity-70">{formatVndText(tournament.budget || 0)}</div>
          </div>
        </div>
        <div className="grid gap-1">
          <div className="text-muted-foreground">{t("elimination_rule_short")}:</div>
          <div className="font-medium">
            {tournament.phases.map((phase) => {
              let ruleString = phase.type.charAt(0).toUpperCase() + phase.type.slice(1).replace(/_/g, ' ');

              if (phase.advancementCondition && typeof phase.advancementCondition === 'object') {
                const condition = phase.advancementCondition as any;
                if (condition.type === 'top_n_scores') {
                  ruleString += ` (Top ${condition.value} Score)`;
                } else if (condition.type === 'placement') {
                  // Explicitly clarify "per lobby" for placement rules
                  ruleString += ` (${t("top_n_per_lobby", { value: condition.value })})`;
                } else if ('winCondition' in condition && 'pointsToActivate' in condition) {
                  ruleString += ` (Points to Activate: ${condition.pointsToActivate})`;
                }
              }

              // Add a hint about Swiss reshuffling
              if (phase.type === 'swiss') {
                return (
                  <div key={phase.id} className="flex flex-col">
                    <span>{ruleString}</span>
                    <span className="text-[10px] text-primary/80 italic font-normal">
                      * {t("swiss_reshuffle_note")}
                    </span>
                  </div>
                );
              }

              return <span key={phase.id}>{ruleString}</span>;
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 