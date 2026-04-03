"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlayerTournamentDisplay {
  id: string;
  name: string;
  status: string;
  currentRound: number;
  eliminated: boolean;
}

interface PlayerUpcomingMatchesCardProps {
  playerTournaments: PlayerTournamentDisplay[];
}

export function PlayerUpcomingMatchesCard({ playerTournaments }: PlayerUpcomingMatchesCardProps) {
  const upcomingTournaments = playerTournaments.filter(
    (t) => t.status === "in_progress" && !t.eliminated
  );

  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle>Upcoming Matches</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingTournaments.length > 0 ? (
          <div className="space-y-4">
            {upcomingTournaments.map((tournament) => (
              <Card key={tournament.id} className="group transition-all hover:border-primary border border-gray-700/50 bg-card/60 dark:bg-card/40 backdrop-blur-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
                <CardContent className="p-3">
                  <div className="font-medium">{tournament.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Round {tournament.currentRound} - Next Match
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>Lobby:</span>
                      <span className="font-medium">TBD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span className="font-medium">Upcoming</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Button variant="outline" className="w-full">
                        View Tournament
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No upcoming matches scheduled
          </div>
        )}
      </CardContent>
    </Card>
  );
} 