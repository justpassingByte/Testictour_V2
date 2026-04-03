"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { Table } from "lucide-react"

interface TournamentFormatCardProps {
  tournament: ITournament;
}

export function TournamentFormatCard({ tournament }: TournamentFormatCardProps) {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Table className="mr-2 h-5 w-5 text-primary" />
          Tournament Format
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
     
        <div className="flex justify-between">
          <div className="text-muted-foreground">Registration Fee:</div>
          <div className="font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
              (tournament.entryFee || 0)
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <div className="text-muted-foreground">Prize Pool:</div>
          <div className="font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
              (tournament.entryFee || 0) *
              (tournament.registered || 0) *
              (1 - (tournament.hostFeePercent || 0))
            )}
          </div>
        </div>
        <div className="grid gap-1">
          <div className="text-muted-foreground">Elimination Rules:</div>
          <div className="font-medium">
            {tournament.phases.map((phase) => {
              console.log('Debug advancementCondition:', phase.advancementCondition);
              let ruleString = phase.type.charAt(0).toUpperCase() + phase.type.slice(1).replace(/_/g, ' ');

              if (phase.advancementCondition) {
                // Check if it's IAdvancementConditionTopN or IAdvancementConditionPlacement (both have 'type' and 'value')
                if ('type' in phase.advancementCondition && typeof phase.advancementCondition.type === 'string') {
                  if (phase.advancementCondition.type === 'top_n_scores') {
                    ruleString += ` (Top ${phase.advancementCondition.value} Score)`;
                  } else if (phase.advancementCondition.type === 'placement') {
                    ruleString += ` (Top ${phase.advancementCondition.value} Placement)`;
                  }
                }
                // Check if it's IAdvancementConditionCheckmate (has 'winCondition' and 'pointsToActivate')
                else if ('winCondition' in phase.advancementCondition && 'pointsToActivate' in phase.advancementCondition) {
                  ruleString += ` (Points to Activate: ${phase.advancementCondition.pointsToActivate})`;
                }
              }
              return ruleString;
            }).filter(Boolean).join(', ')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 