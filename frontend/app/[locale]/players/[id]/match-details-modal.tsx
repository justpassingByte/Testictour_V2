"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Swords } from "lucide-react";
import { usePlayerStore } from "@/app/stores/playerStore";
import { MatchCompPanel, isGrimoireMatchData } from "@/components/match/MatchCompPanel";
import { GrimoireMatchData } from "@/app/types/riot";

interface MatchDetailsModalProps {
  matchId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchDetailsModal({ matchId, userId, isOpen, onClose }: MatchDetailsModalProps) {
  const { matchDetailsRaw, fetchPlayerMatchResults, isLoading, error } = usePlayerStore();

  useEffect(() => {
    if (isOpen && matchId) {
      fetchPlayerMatchResults(matchId);
    }
  }, [isOpen, matchId, fetchPlayerMatchResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect data format
  const isGrimoire = isGrimoireMatchData(matchDetailsRaw);
  const isLegacy = !isGrimoire && matchDetailsRaw?.info?.participants?.length > 0;
  const isComplete = isGrimoire || isLegacy;

  // Extract info for header
  const matchLabel = isGrimoire
    ? `TFT Set ${(matchDetailsRaw as GrimoireMatchData).tftSetNumber ?? '?'}`
    : matchDetailsRaw?.info?.tft_set_core_name || `Set ${matchDetailsRaw?.info?.tft_set_number || '?'}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-0 overflow-hidden flex flex-col h-[85vh]">
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Swords className="w-6 h-6 text-primary" /> 
              Match Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Deep analytics &amp; team compositions for match {matchId.substring(0, 8)}...
            </DialogDescription>
          </div>
          {matchDetailsRaw && (
            <Badge variant="outline" className="text-xs bg-black/40">
              {matchLabel}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse">Decrypting Match Data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-400/5 rounded-xl border border-red-500/20 p-8">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="font-medium text-lg">{error}</p>
            </div>
          ) : !isComplete ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 opacity-50" />
              </div>
              <p>Match data is still processing or unavailable.</p>
            </div>
          ) : isGrimoire ? (
            /* ── Rich Grimoire View via shared MatchCompPanel ── */
            <MatchCompPanel
              matchData={matchDetailsRaw as GrimoireMatchData}
              highlightPuuid={userId}
            />
          ) : (
            /* ── Legacy Riot raw data fallback ── */
            <LegacyMatchView data={matchDetailsRaw} userId={userId} />
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-end shrink-0">
          <Button onClick={onClose} variant="outline" className="border-white/20 hover:bg-white/10">Close Details</Button>
        </div>
      </DialogContent>
    </Dialog>
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

function LegacyMatchView({ data, userId }: { data: any; userId: string }) {
  const participants = data?.info?.participants || [];
  const sorted = [...participants].sort((a: any, b: any) => a.placement - b.placement);

  return (
    <div className="space-y-2">
      {sorted.map((p: any) => {
        const isCurrentUser = p.puuid === userId;
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
            <div className="text-xs text-muted-foreground">{p.points ?? 0} pts</div>
          </div>
        );
      })}
    </div>
  );
}