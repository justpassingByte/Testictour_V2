"use client";

import React, { useEffect, useState } from 'react';
import api from '@/app/lib/apiConfig';
import { Loader2 } from 'lucide-react';

export function TournamentQuickStats({ tournamentId, className }: { tournamentId: string, className?: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const res = await api.get(`/dev/tournament-statistics/${tournamentId}`);
        if (mounted && res.data?.success && res.data?.stats) {
          setStats(res.data.stats);
        }
      } catch (e) {
        // Ignore stats fetch error for quick stats
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-2 text-muted-foreground text-xs ${className || ''}`}>
        <Loader2 className="h-3 w-3 animate-spin mr-1" /> Load stats...
      </div>
    );
  }

  if (!stats || (stats.topUnits.length === 0 && stats.topTraits.length === 0)) {
    return null;
  }

  const topUnit = stats.topUnits[0];
  const topTrait = stats.topTraits[0];

  const getUnitImgUrl = (name: string, payload?: any) => {
    if (payload?.iconUrl) return payload.iconUrl;
    const cleanName = name.toLowerCase().replace(/['\s.]/g, '');
    return `https://raw.communitydragon.org/latest/game/assets/characters/${cleanName}/hud/${cleanName}_square.png`;
  };

  const getTraitImgUrl = (name: string, payload?: any) => {
    if (payload?.iconUrl) return payload.iconUrl;
    const cleanName = name.toLowerCase().replace(/['\s.]/g, '').replace('set14_', '14_').replace('set13_', '13_');
    return `https://raw.communitydragon.org/latest/game/assets/traits/trait_icon_${cleanName}.png`;
  };

  return (
    <div className={`flex items-center justify-between gap-2 text-xs ${className || ''}`}>
      {topUnit && (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <img 
            src={getUnitImgUrl(topUnit.name, topUnit)} 
            className="h-5 w-5 rounded-full border border-primary/20 object-cover bg-black/40 shrink-0" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            alt="Top Unit" 
          />
          <div className="min-w-0 flex-col flex leading-none">
            <span className="text-[9px] text-muted-foreground uppercase">Top Champ</span>
            <span className="text-white/90 truncate font-medium">{topUnit.name.split('_').pop()}</span>
          </div>
        </div>
      )}
      
      {topTrait && (
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
          <div className="min-w-0 flex-col flex leading-none">
            <span className="text-[9px] text-muted-foreground uppercase">Top Trait</span>
            <span className="text-emerald-100 truncate font-medium">{topTrait.formattedName || topTrait.name.replace('Set14_', '').replace('Set13_', '')}</span>
          </div>
          <img 
             src={getTraitImgUrl(topTrait.name, topTrait)}
             className="h-5 w-5 object-contain bg-black/40 rounded border border-emerald-500/20 shrink-0 p-0.5 brightness-0 invert opacity-90"
             onError={(e) => { e.currentTarget.style.display = 'none'; }}
             alt="Top Trait"
          />
        </div>
      )}
    </div>
  );
}
