"use client";

import { Trophy, Medal, Star, Clock, Calendar, BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("common");
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle>{t("player_summary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Trophy className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("tournaments")}:</span>
          </div>
          <span className="font-medium">{tournamentsPlayed}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Medal className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("avg_placement")}:</span>
          </div>
          <span className="font-medium">{averagePlacement}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Star className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("top_4_rate")}:</span>
          </div>
          <span className="font-medium">{topFourRate}%</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("last_active")}:</span>
          </div>
          <span className="font-medium">{lastActiveDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("joined")}:</span>
          </div>
          <span className="font-medium">{joinedDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm">
            <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("status")}:</span>
          </div>
          <Badge variant="outline" className="bg-primary/20 text-primary">
            {eliminated ? t("eliminated") : t("active")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
} 