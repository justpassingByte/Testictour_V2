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
                  const statusOrder = {
                    completed: 1,
                    in_progress: 2,
                    pending: 3,
                  }
                  return statusOrder[a.status] - statusOrder[b.status]
                })
                .map((round, index) => (
                  <Card
                    key={round.id}
                    className={`
                    overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up 
                    bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20
                    ${round.status === "in_progress" ? "ring-2 ring-primary" : ""}
                  `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader
                      className={`
                      flex flex-row items-center justify-between p-4
                      ${round.status === "completed" ? "bg-muted/50" : ""}
                    `}
                    >
                      <CardTitle className="text-lg">Round {round.roundNumber}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`
                        ${round.status === "in_progress" ? "bg-primary/20 text-primary animate-pulse-subtle" : ""}
                        ${round.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : ""}
                        ${round.status === "completed" ? "bg-green-500/20 text-green-500" : ""}
                        capitalize
                      `}
                      >
                        {round.status === "in_progress"
                          ? "On Going"
                          : round.status === "pending"
                            ? "Upcoming"
                            : round.status === "completed"
                              ? "Finished"
                              : round.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="grid gap-2 p-4 text-sm">
                      <div className="flex justify-between">
                        <div className="text-muted-foreground">Time:</div>
                        <div className="font-medium">
                          {new Date(round.startTime).toLocaleString()} - {round.endTime ? new Date(round.endTime).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left Column: Lobbies */}
                        <div className="flex flex-col items-start">
                          <div className="text-muted-foreground text-sm mb-1">Lobbies</div>
                          <div className="flex items-center text-primary">
                            <Users className="mr-2 h-5 w-5" />
                            <span className="font-bold text-lg">{round.lobbies?.length || 0}</span>
                            <span className="ml-1 text-base text-muted-foreground">Lobbies</span>
                          </div>
                        </div>

                        {/* Right Column: Matches */}
                        <div className="flex flex-col items-start">
                          <div className="text-muted-foreground text-sm mb-1">Matches</div>
                          <div className="flex items-center text-primary">
                            <Trophy className="mr-2 h-5 w-5" />
                            <span className="font-bold text-lg">{phase.matchesPerRound || 'N/A'}</span>
                            <span className="ml-1 text-base text-muted-foreground">Matches per Lobby</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Link href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
                          <Button
                            variant={round.status === "pending" ? "secondary" : "default"}
                            className="w-full"
                          >
                            {round.status === "completed" && "View Results"}
                            {round.status === "in_progress" && "View Live Scoreboard"}
                            {round.status === "pending" && "View Round Details"}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
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