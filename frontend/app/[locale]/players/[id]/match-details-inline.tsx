"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Swords, ShieldCheck } from "lucide-react";
import { usePlayerStore } from "@/app/stores/playerStore";
import { MatchCompPanel, isGrimoireMatchData } from "@/components/match/MatchCompPanel";
import { GrimoireMatchData } from "@/app/types/riot";

interface MatchDetailsInlineProps {
  matchId: string;
  userId: string;
}

export function MatchDetailsInline({ matchId, userId }: MatchDetailsInlineProps) {
  const { matchDetailsRaw, fetchPlayerMatchResults, isMatchLoading: isLoading, error, playerMatches } = usePlayerStore();
  const [showLog, setShowLog] = useState(false);

  // Find the summary to get prize, points, placement, and tournament details
  const summaryGroup = playerMatches.find(group => group.matches.some((m: any) => m.matchId === matchId));
  const summary: any = summaryGroup?.matches.find((m: any) => m.matchId === matchId);

  // Detect data format
  const isGrimoire = isGrimoireMatchData(matchDetailsRaw);
  const isLegacy = !isGrimoire && matchDetailsRaw?.info?.participants?.length > 0;
  const isComplete = isGrimoire || isLegacy;

  // Extract info for header
  const matchLabel = isGrimoire
    ? `TFT Set ${(matchDetailsRaw as GrimoireMatchData).tftSetNumber ?? '?'}`
    : matchDetailsRaw?.info?.tft_set_core_name || `Set ${matchDetailsRaw?.info?.tft_set_number || '?'}`;

  // Build a resultMap so we can pass points and prize
  const resultMap: Record<string, { placement: number; points: number, prize?: number }> = {};
  let highlightPuuid: string | undefined = undefined;

  if (isComplete && matchDetailsRaw) {
     const participants = isGrimoire 
        ? matchDetailsRaw.participants 
        : matchDetailsRaw?.info?.participants || [];
     
     for (const p of participants) {
        if (summary && p.placement === summary.placement) {
           highlightPuuid = p.puuid;
           resultMap[p.puuid] = { 
             placement: summary.placement, 
             points: summary.points,
             prize: summary.prize
           };
        }
     }
  }

  const handleFetchLog = () => {
    setShowLog(true);
    fetchPlayerMatchResults(matchId);
  }

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-inner min-h-[150px] flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shrink-0">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" /> 
            Match Summary
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {summaryGroup?.name} — Round {summary?.roundNumber}
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Placement</span>
            <div className={`text-xl font-bold ${summary?.placement === 1 ? 'text-yellow-400' : summary?.placement <= 4 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              #{summary?.placement || '?'}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Points</span>
            <div className="text-xl font-bold text-primary">
              +{summary?.points || 0}
            </div>
          </div>
          {(summary?.prize || 0) > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Prize</span>
              <div className="text-xl font-bold text-amber-500">
                {summary?.prize} <span className="text-xs font-normal">Coins</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!showLog ? (
          <div className="flex flex-col items-center justify-center py-10 bg-black/10 rounded-xl border border-white/5 border-dashed">
            <ShieldCheck className="w-8 h-8 text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground text-sm mb-4 max-w-md text-center">
              Detailed team compositions and combat analytics require fetching data from Grimoire Riot API.
            </p>
            <Button onClick={handleFetchLog} variant="outline" className="border-primary/30 hover:border-primary hover:bg-primary/10">
              Fetch Full Combat Analytics
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse text-sm">Decrypting Match Data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-red-400 bg-red-400/5 rounded-xl border border-red-500/20 p-6">
            <AlertCircle className="w-10 h-10 mb-4" />
            <p className="font-medium">{error}</p>
          </div>
        ) : !isComplete ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 opacity-50" />
            </div>
            <p className="text-sm">Match data is still processing or unavailable.</p>
          </div>
        ) : isGrimoire ? (
          /* ── Rich Grimoire View via shared MatchCompPanel ── */
          <div className="animate-fade-in-up">
            <MatchCompPanel
              matchData={matchDetailsRaw as GrimoireMatchData}
              highlightPuuid={highlightPuuid || userId}
              resultMap={resultMap}
            />
          </div>
        ) : (
          /* ── Legacy Riot raw data fallback ── */
          <div className="animate-fade-in-up">
            <LegacyMatchView data={matchDetailsRaw} userId={highlightPuuid || userId} resultMap={resultMap} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legacy fallback for old raw Riot data ──────────────────────────────────
// Keep this minimal since we're phasing it out.

function cleanName(name: string) {
  if (!name) return "";
  return name.replace(/^TFT\d+_/, '').replace(/_/, ' ').replace(/Item_|Augment_/g, '');
}

function getPlacementColor(placement: number) {
  if (placement === 1) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  if (placement === 2) return "text-gray-300 bg-gray-300/10 border-gray-300/30";
  if (placement === 3) return "text-amber-600 bg-amber-600/10 border-amber-600/30";
  if (placement <= 4) return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  return "text-muted-foreground bg-muted border-muted/50";
}

function LegacyMatchView({ data, userId, resultMap }: { data: any; userId: string; resultMap?: Record<string, { placement: number; points: number, prize?: number }> }) {
  const participants = data?.info?.participants || [];
  const sorted = [...participants].sort((a: any, b: any) => a.placement - b.placement);

  return (
    <div className="space-y-2">
      {sorted.map((p: any) => {
        const isCurrentUser = p.puuid === userId;
        const mapped = resultMap?.[p.puuid];
        const points = mapped?.points ?? p.points ?? 0;
        const prize = mapped?.prize;

        return (
          <div
            key={p.puuid || Math.random()}
            className={`rounded-lg border p-3 flex items-center gap-4 ${
              isCurrentUser ? 'bg-primary/5 border-primary/30' : 'bg-black/20 border-white/5'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${getPlacementColor(p.placement)}`}>
              #{p.placement}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{p.riotIdGameName || cleanName(p.character_id || 'Unknown')}</p>
              <p className="text-xs text-muted-foreground">Lvl {p.level} · {p.gold_left ?? 0}g remaining</p>
            </div>
            <div className="flex flex-col items-end gap-1">
               {points > 0 && <div className="text-xs font-bold text-primary">+{points} pts</div>}
               {prize && prize > 0 ? (
                  <div className="text-xs font-bold text-yellow-500">+{prize} Coins</div>
               ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
