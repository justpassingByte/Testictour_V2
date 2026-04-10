import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { IPhase } from "@/app/types/tournament"
import { Users, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TournamentRoundsTabProps {
  tournamentId: string;
  phases: IPhase[];
}

export function TournamentRoundsTab({ tournamentId, phases }: TournamentRoundsTabProps) {
  return (
    <div className="space-y-4">
      {phases && phases.length > 0 ? (
        phases.map((phase) => (
          <div key={phase.id} className="space-y-4">
            <h3 className="text-xl font-bold mt-6 mb-4">Phase {phase.phaseNumber}: {phase.name}</h3>
            {phase.rounds && phase.rounds.length > 0 ? (
              phase.rounds
                .slice()
                .sort((a, b) => {
                  const statusOrder: Record<string, number> = {
                    completed: 1,
                    in_progress: 2,
                    pending: 3,
                  }
                  const statusA = a.status?.toLowerCase() || '';
                  const statusB = b.status?.toLowerCase() || '';
                  return (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
                })
                .map((round, index) => {
                  const normalizedStatus = round.status?.toLowerCase() || '';
                  return (
                  <Card
                    key={round.id}
                    className={`
                    overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up 
                    bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20
                    ${normalizedStatus === "in_progress" ? "ring-2 ring-primary" : ""}
                  `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader
                      className={`
                      flex flex-row items-center justify-between p-4
                      ${normalizedStatus === "completed" ? "bg-muted/50" : ""}
                    `}
                    >
                      <CardTitle className="text-lg">Round {round.roundNumber}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`
                        ${normalizedStatus === "in_progress" ? "bg-primary/20 text-primary animate-pulse-subtle" : ""}
                        ${normalizedStatus === "pending" ? "bg-yellow-500/20 text-yellow-500" : ""}
                        ${normalizedStatus === "completed" ? "bg-green-500/20 text-green-500" : ""}
                        capitalize
                      `}
                      >
                        {normalizedStatus === "in_progress"
                          ? "On Going"
                          : normalizedStatus === "pending"
                            ? "Upcoming"
                            : normalizedStatus === "completed"
                              ? "Finished"
                              : round.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
                          {/* Schedule Column */}
                          <div className="flex flex-col space-y-1.5">
                            <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-bold">Schedule</div>
                            <div className="font-medium text-sm flex flex-col">
                              <span className="text-foreground">{new Date(round.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                              {round.endTime && <span className="text-muted-foreground">to {new Date(round.endTime).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit'})}</span>}
                            </div>
                          </div>

                          {/* Lobbies Column */}
                          <div className="flex flex-col md:items-center md:justify-center md:border-x md:border-border/50 py-2 md:py-0">
                            <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1.5">Lobbies</div>
                            <div className="flex items-center text-primary">
                              <Users className="mr-2 h-5 w-5" />
                              <span className="font-bold text-2xl leading-none">{round.lobbies?.length || 0}</span>
                            </div>
                          </div>

                          {/* Matches Column */}
                          <div className="flex flex-col md:items-center md:justify-center">
                            <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1.5">Matches per Lobby</div>
                            <div className="flex items-center text-primary">
                              <Trophy className="mr-2 h-5 w-5" />
                              <span className="font-bold text-2xl leading-none">{phase.matchesPerRound || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 sm:px-5 sm:pb-5 bg-muted/10 border-t border-white/5 flex items-center justify-end">
                        <Link href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
                          <Button
                            variant={normalizedStatus === "pending" ? "secondary" : "default"}
                            className="btn-zodiac text-white font-semibold px-6 shadow-md shadow-primary/20"
                          >
                            {normalizedStatus === "completed" && "View Results"}
                            {normalizedStatus === "in_progress" && "View Live Scoreboard"}
                            {normalizedStatus === "pending" && "View Round Details"}
                            {!["completed", "in_progress", "pending"].includes(normalizedStatus) && "View Round"}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )})
            ) : (
              <p className="text-muted-foreground text-center">No rounds available for this phase.</p>
            )}
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-center">No phases available for this tournament.</p>
      )}
    </div>
  )
} 