"use client";

import { Gift, Trophy } from "lucide-react";
import { ITournament } from "@/app/types/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getPhysicalPrizes(tournament: ITournament): Record<string, string> {
  const ps: any = tournament.prizeStructure;
  if (!ps || Array.isArray(ps) || typeof ps !== "object" || !ps.physical) return {};
  return Object.fromEntries(
    Object.entries(ps.physical as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string" && (v as string).trim().length > 0)
      .map(([rank, v]) => [rank, (v as string).trim()])
  );
}

const rankLabel = (rank: string) => {
  const num = parseInt(rank, 10);
  if (num === 1) return "1st Place";
  if (num === 2) return "2nd Place";
  if (num === 3) return "3rd Place";
  if (!Number.isNaN(num)) return `${num}th Place`;
  return `Rank ${rank}`;
};

const rankEmoji = (rank: string) => {
  const num = parseInt(rank, 10);
  if (num === 1) return "🥇";
  if (num === 2) return "🥈";
  if (num === 3) return "🥉";
  return "🏅";
};

interface CustomPhysicalPrizesBannerProps {
  tournament: ITournament;
}

export function CustomPhysicalPrizesBanner({ tournament }: CustomPhysicalPrizesBannerProps) {
  const physicalPrizes = getPhysicalPrizes(tournament);
  const ranks = Object.keys(physicalPrizes).sort((a, b) => Number(a) - Number(b));

  if (ranks.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent shadow-lg overflow-hidden">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30">
            <Gift className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-amber-300">Physical Prizes</h2>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]">
                Sponsor Rewards
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Exclusive in-kind prizes awarded to top finishers in addition to the cash pool.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranks.map((rank) => (
            <div
              key={rank}
              className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-black/20 p-4"
            >
              <span className="text-2xl leading-none">{rankEmoji(rank)}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-500/80">
                  {rankLabel(rank)}
                </p>
                <p className="font-semibold text-white mt-0.5 break-words">{physicalPrizes[rank]}</p>
              </div>
              <Trophy className="h-4 w-4 text-amber-500/40 ml-auto shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
