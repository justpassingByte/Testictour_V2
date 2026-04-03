"use client";

import { Trophy, Medal, Star, Clock, Calendar, BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerSummaryCardProps {
  tournamentsPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  lastActiveDate: string;
  joinedDate: string;
  eliminated: boolean;
}

export function PlayerSummaryCard({
  tournamentsPlayed,
  averagePlacement,
  topFourRate,
  lastActiveDate,
  joinedDate,
  eliminated,
}: PlayerSummaryCardProps) {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle>Player Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Trophy className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tournaments:</span>
          </div>
          <span className="font-medium">{tournamentsPlayed}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Medal className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Avg. Placement:</span>
          </div>
          <span className="font-medium">{averagePlacement}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Star className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Top 4 Rate:</span>
          </div>
          <span className="font-medium">{topFourRate}%</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last Active:</span>
          </div>
          <span className="font-medium">{lastActiveDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
          </div>
          <span className="font-medium">{joinedDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Status:</span>
          </div>
          <Badge variant="outline" className="bg-primary/20 text-primary">
            {eliminated ? "Eliminated" : "Active"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
} 