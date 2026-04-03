"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star } from "lucide-react";

import { PlayerTournamentDisplay } from "@/app/stores/playerStore";

interface PlayerTournamentListProps {
  tournaments: PlayerTournamentDisplay[];
}

export function PlayerTournamentList({ tournaments }: PlayerTournamentListProps) {
  return (
    <div className="space-y-4">
      {tournaments.length === 0 ? (
        <p className="text-muted-foreground">No tournaments found for this player.</p>
      ) : (
        tournaments.map((tournament) => (
          <Card key={tournament.id} className="group transition-all hover:border-primary border border-gray-700/50 bg-card/60 dark:bg-card/40 backdrop-blur-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{tournament.name}</h3>
                <Badge
                  variant="outline"
                  className={`${
                    tournament.status === "ongoing" ? "bg-blue-500/20 text-blue-500" : "bg-gray-500/20 text-gray-500"
                  }`}
                >
                  {tournament.status === "ongoing" ? "Ongoing" : "Finished"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                Registered: {new Date(tournament.joinedAt).toISOString().split('T')[0]} • Round {tournament.currentRound} of {tournament.totalRounds}
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                <div>
                  <p className="text-muted-foreground">Current Placement</p>
                  <p className="font-semibold flex items-center">
                    <Trophy className="mr-1 h-5 w-5 text-blue-400" />
                    <span className="text-xl font-bold mr-1">#{tournament.placement}</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Points</p>
                  <p className="font-semibold flex items-center">
                    <Star className="mr-1 h-5 w-5 text-blue-400" />
                    <span className="text-xl font-bold mr-1">{tournament.points}</span> pts
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={`${
                      tournament.eliminated ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    {tournament.eliminated ? "Eliminated" : "Active"}
                  </Badge>
                </div>
              </div>
              <Link href={`/tournaments/${tournament.id}`}>
                <Button variant="outline" className="w-full flex items-center group-hover:bg-primary group-hover:text-white">
                  View Tournament <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
} 