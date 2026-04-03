"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Coins, Heart, Star, Swords } from "lucide-react";
import { usePlayerStore } from "@/app/stores/playerStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MatchDetailsModalProps {
  matchId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Helpers for UI
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

function getTraitStyle(tierCurrent: number, tierTotal: number) {
  if (!tierTotal || tierTotal === 0) return "bg-slate-800 text-slate-400 border-slate-700";
  const ratio = tierCurrent / tierTotal;
  if (ratio >= 1) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 scale-105 shadow-[0_0_10px_rgba(234,179,8,0.2)]";
  if (ratio >= 0.5) return "bg-gray-300/20 text-gray-300 border-gray-300/50";
  return "bg-amber-700/20 text-amber-700 border-amber-700/50 opacity-80";
}

export function MatchDetailsModal({ matchId, userId, isOpen, onClose }: MatchDetailsModalProps) {
  const { matchDetailsRaw, fetchPlayerMatchResults, isLoading, error } = usePlayerStore();

  useEffect(() => {
    if (isOpen && matchId) {
      fetchPlayerMatchResults(matchId);
    }
  }, [isOpen, matchId, fetchPlayerMatchResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const participants = matchDetailsRaw?.info?.participants || [];
  const sortedParticipants = [...participants].sort((a: any, b: any) => a.placement - b.placement);
  const gameMode = matchDetailsRaw?.info?.tft_game_type || "TFT Match";
  const isComplete = sortedParticipants.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-0 overflow-hidden flex flex-col h-[85vh]">
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Swords className="w-6 h-6 text-primary" /> 
              {cleanName(gameMode)} Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Deep analytics & team compositions for match {matchId.substring(0, 8)}...
            </DialogDescription>
          </div>
          {matchDetailsRaw && (
            <Badge variant="outline" className="text-xs bg-black/40">
              Set {matchDetailsRaw?.info?.tft_set_core_name || matchDetailsRaw?.info?.tft_set_number}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse">Decrypting Riot Match Data...</p>
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
              <p>Riot Data is still processing or unavailable.</p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-3">
                {sortedParticipants.map((p: any) => {
                  const isCurrentUser = p.puuid === userId || (p.riotIdGameName && p.riotIdGameName === userId); // Basic fallback matching
                  
                  // Filter traits that are actually active (tier_current > 0)
                  const activeTraits = (p.traits || [])
                    .filter((t: any) => t.tier_current > 0)
                    .sort((a: any, b: any) => b.tier_current - a.tier_current);

                  return (
                    <div 
                      key={p.puuid} 
                      className={`relative overflow-hidden rounded-xl border transition-all duration-300 hover:border-primary/50 group
                        ${isCurrentUser ? 'bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'bg-black/20 border-white/5'}
                      `}
                    >
                      <div className="p-4 flex flex-col md:flex-row gap-4 md:items-center">
                        {/* Placement & User Info */}
                        <div className="w-48 shrink-0 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border ${getPlacementColor(p.placement)}`}>
                            #{p.placement}
                          </div>
                          <div>
                            <div className="font-bold text-sm truncate max-w-[120px]" title={p.riotIdGameName || "Unknown Player"}>
                              {p.riotIdGameName || "Unknown"} <span className="text-xs text-muted-foreground font-normal">#{p.riotIdTagLine || "TFT"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1" title="Level"><Star className="w-3 h-3" /> Lvl {p.level}</span>
                              <span className="flex items-center gap-1" title="Gold Remaining"><Coins className="w-3 h-3 text-yellow-500/70" /> {p.gold_left}</span>
                              <span className="flex items-center gap-1" title="Damage to Players"><Heart className="w-3 h-3 text-red-400/70" /> {p.total_damage_to_players}</span>
                            </div>
                          </div>
                        </div>

                        {/* Traits & Augments */}
                        <div className="flex-1 flex flex-col gap-2 border-l border-white/5 pl-4">
                           {/* Traits row */}
                           <div className="flex flex-wrap gap-1.5">
                             {activeTraits.length === 0 ? (
                               <span className="text-xs text-muted-foreground italic">No active traits</span>
                             ) : (
                               activeTraits.map((t: any, i: number) => (
                                 <Tooltip key={i}>
                                   <TooltipTrigger asChild>
                                     <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border ${getTraitStyle(t.tier_current, t.tier_total)}`}>
                                       {t.num_units} {cleanName(t.name)}
                                     </Badge>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p className="text-xs font-bold text-center mb-1">{cleanName(t.name)}</p>
                                     <p className="text-xs text-muted-foreground text-center">Tier: {t.tier_current} / {t.tier_total}</p>
                                   </TooltipContent>
                                 </Tooltip>
                               ))
                             )}
                           </div>

                           {/* Augments row */}
                           <div className="flex gap-2">
                             {(p.augments || []).map((aug: string, i: number) => (
                               <Tooltip key={i}>
                                 <TooltipTrigger asChild>
                                    <div className="w-6 h-6 rotate-45 border border-primary/40 bg-card flex items-center justify-center -ml-0.5 mt-1">
                                      <div className="-rotate-45 text-[8px] font-bold text-primary/70">{cleanName(aug).substring(0, 2)}</div>
                                    </div>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p className="text-xs font-semibold">{cleanName(aug)}</p>
                                 </TooltipContent>
                               </Tooltip>
                             ))}
                           </div>
                        </div>

                        {/* Units / Team Comp */}
                        <div className="md:w-[45%] flex flex-wrap gap-x-2 gap-y-5 justify-end">
                          {(p.units || []).sort((a: any, b: any) => b.tier - a.tier).map((unit: any, i: number) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <div className="relative flex flex-col items-center">
                                  {/* Stars */}
                                  <div className="absolute -top-3 flex w-full justify-center space-x-[1px]">
                                    {Array.from({ length: unit.tier }).map((_, st) => (
                                      <Star key={st} fill={unit.tier === 3 ? "#eab308" : unit.tier === 2 ? "#9ca3af" : "#f43f5e"} className={`w-3 h-3 ${unit.tier === 3 ? "text-yellow-500" : unit.tier === 2 ? "text-gray-400" : "text-rose-500"}`} />
                                    ))}
                                  </div>
                                  {/* Champion Icon (Fallback to Name Initials) */}
                                  <div className={`w-10 h-10 rounded shadow-md border-2 bg-slate-900 flex items-center justify-center font-bold text-xs uppercase
                                    ${unit.tier === 3 ? 'border-yellow-500 shadow-yellow-500/20' : unit.tier === 2 ? 'border-gray-400' : 'border-rose-900'}
                                  `}>
                                    {cleanName(unit.character_id).substring(0, 3)}
                                  </div>
                                  {/* Items */}
                                  <div className="absolute -bottom-2.5 flex gap-[1px]">
                                    {(unit.itemNames || []).map((item: string, itIdx: number) => (
                                      <div key={itIdx} className="w-3.5 h-3.5 bg-slate-800 border-x border-t border-slate-600 rounded-[2px] flex items-center justify-center overflow-hidden" title={cleanName(item)}>
                                        <span className="text-[6px] font-bold text-slate-300">{cleanName(item).substring(0, 1)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-black/90 border-white/10 p-3">
                                <p className="font-bold text-sm mb-1">{cleanName(unit.character_id)} <span className="text-yellow-500">{unit.tier}★</span></p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <p>Items:</p>
                                  <ul className="list-disc pl-4">
                                    {(unit.itemNames || []).length > 0 ? (
                                      (unit.itemNames || []).map((it: string, x: number) => <li key={x} className="text-slate-300">{cleanName(it)}</li>)
                                    ) : <li>None</li>}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
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