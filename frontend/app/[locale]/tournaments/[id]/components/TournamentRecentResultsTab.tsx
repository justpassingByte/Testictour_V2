"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Flame, Trophy, Clock, Swords } from 'lucide-react';
import api from '@/app/lib/apiConfig';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from "next-intl";

export function TournamentRecentResultsTab({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("Common");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentResults = async () => {
    try {
      const res = await api.get(`/tournaments/${tournamentId}/recent-results`);
      if (res.data?.success) {
        setResults(res.data.matches);
      }
    } catch (e) {
      console.error('Failed to fetch recent results:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentResults();
    
    // Auto refresh mechanism
    window.addEventListener('bracket_update', fetchRecentResults);
    return () => window.removeEventListener('bracket_update', fetchRecentResults);
  }, [tournamentId]);

  if (loading) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border border-primary/10 h-64 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-80" />
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border border-border/50 shadow-inner p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
          <Clock className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-xl font-medium mb-1">{t("no_match_results_yet")}</h3>
        <p className="text-muted-foreground text-sm">{t("once_lobbies_finish_playing_their_top_4__desc")}</p>
      </Card>
    );
  }

  const getPlacementColor = (placement: number) => {
    switch(placement) {
      case 1: return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-500/30";
      case 2: return "bg-gray-400/20 text-gray-600 dark:text-gray-300 border-gray-400/30";
      case 3: return "bg-amber-700/20 text-amber-700 dark:text-amber-600 border-amber-700/30";
      case 4: return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {results.map((match: any, index: number) => (
        <Card key={match.id} className="overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 hover:border-border transition-all duration-300">
          <CardHeader className="p-4 py-3 bg-muted/50 border-b border-border/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Round {match.lobby.round?.roundNumber || '?'} - {match.lobby.name}</CardTitle>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {match.fetchedAt ? formatDistanceToNow(new Date(match.fetchedAt), { addSuffix: true }) : 'Recently'}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
              {match.matchResults.slice(0, 4).map((result: any) => (
                <div key={result.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      {result.placement === 1 ? 'Winner' : `${result.placement}nd / rd / th`.replace(/.(?=nd|rd|th)/, '')}
                    </span>
                    <span className="font-semibold text-sm truncate pr-2 group-hover:text-primary transition-colors">
                      {result.user.riotGameName || result.user.username}
                    </span>
                    {result.user.riotGameTag && <span className="text-xs text-muted-foreground">#{result.user.riotGameTag}</span>}
                  </div>
                  <Badge variant="outline" className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${getPlacementColor(result.placement)}`}>
                    #{result.placement}
                  </Badge>
                </div>
              ))}
              
              {/* Show remaining players briefly if any */}
              {match.matchResults.length > 4 && (
                <div className="col-span-full bg-black/20 p-2 px-4 flex gap-2 overflow-x-auto custom-scrollbar">
                  <span className="text-[10px] text-muted-foreground self-center uppercase font-bold mr-2 whitespace-nowrap">{t("bottom_4")}</span>
                  {match.matchResults.slice(4).map((result: any) => (
                    <Badge key={result.id} variant="secondary" className="bg-white/5 border-white/5 text-[10px] font-normal shrink-0">
                      #{result.placement} {result.user.riotGameName || result.user.username}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
