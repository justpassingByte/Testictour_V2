import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IPhase } from "@/app/types/tournament"
import { Trophy, Users, ShieldAlert, ArrowUpCircle } from "lucide-react"

interface TournamentPhasesTabProps {
  phases: IPhase[];
}

export function TournamentPhasesTab({ phases }: TournamentPhasesTabProps) {
  if (!phases || phases.length === 0) {
    return <p className="text-muted-foreground text-center">No structural phases configured for this tournament yet.</p>
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => {
        // Human readable phase format
        let formatType: string = phase.type;
        switch(phase.type?.toLowerCase()) {
          case 'group_stage': formatType = 'Group Stage'; break;
          case 'knockout': formatType = 'Knockout'; break;
          case 'points': formatType = 'Points Accumulation'; break;
          case 'swiss': formatType = 'Swiss System'; break;
          case 'checkmate': formatType = 'Checkmate Format'; break;
          case 'elimination': formatType = 'Elimination'; break;
        }

        // Parse advancement format
        let advancementText = "Based on standard ruleset";
        const advCondition = phase.advancementCondition as any;
        if (advCondition) {
           if (advCondition.type === 'top_n_scores') advancementText = `Top ${advCondition.value} scorers advance`;
           else if (advCondition.type === 'placement') advancementText = `Top ${advCondition.value} placements advance`;
           else if (advCondition.winCondition === 'checkmate_win') advancementText = `Requires ${advCondition.pointsToActivate} points to activate checkmate`;
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
                Stage {phase.phaseNumber}: {phase.name}
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
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matches Per Player</p>
                      <p className="font-medium text-foreground">{phase.matchesPerRound || 'Continuous'} Matches</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                      <ArrowUpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advancement</p>
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
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Structure</p>
                        <p className="font-medium text-foreground">{phase.numberOfGroups} Groups</p>
                      </div>
                    </div>
                  )}

                  {phase.eliminationRule && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-rose-500/70">Elimination Rule</p>
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
