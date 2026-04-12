"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { io as socketClient } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const STATE_COLORS: Record<string, string> = {
  WAITING:            'text-muted-foreground',
  READY_CHECK:        'text-yellow-400',
  GRACE_PERIOD:       'text-orange-400',
  STARTING:           'text-green-400',
  PLAYING:            'text-primary',
  FINISHED:           'text-green-600',
  PAUSED:             'text-orange-400',
  ADMIN_INTERVENTION: 'text-red-400',
};

function useCountdown(phaseStartedAt: string | undefined, durationSeconds: number, status: string) {
  const [display, setDisplay] = useState('00:00');
  
  useEffect(() => {
    if (!phaseStartedAt) {
      setDisplay('00:00');
      return;
    }
    const startObj = new Date(phaseStartedAt).getTime();
    
    const tick = () => {
      const now = Date.now();
      if (status === 'IN_PROGRESS' || status === 'PLAYING') {
        // COUNT UP: time elapsed since start
        const elapsedSec = Math.max(0, Math.floor((now - startObj) / 1000));
        const m = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
        const s = (elapsedSec % 60).toString().padStart(2, '0');
        setDisplay(`${m}:${s}`);
      } else {
        // COUNT DOWN
        if (!durationSeconds) {
           setDisplay('00:00');
           return;
        }
        const endsAt = startObj + durationSeconds * 1000;
        const remainingSec = Math.max(0, Math.floor((endsAt - now) / 1000));
        const m = Math.floor(remainingSec / 60).toString().padStart(2, '0');
        const s = (remainingSec % 60).toString().padStart(2, '0');
        setDisplay(`${m}:${s}`);
      }
    };
    
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt, durationSeconds, status]);
  
  return { display };
}

interface IncomingMatch {
  lobbyId: string;
  lobbyName: string;
  tournamentId?: string;
  roundNumber: number;
  phaseName: string;
  state: string;
  phaseStartedAt: string;
  phaseDuration: number;
}

function IncomingMatchItem({ match }: { match: IncomingMatch }) {
  const t = useTranslations("common");
  const { display } = useCountdown(match.phaseStartedAt, match.phaseDuration, match.state);
  const color = STATE_COLORS[match.state] || 'text-muted-foreground';
  const label = t(`state_${match.state.toLowerCase()}`) || match.state;
  const isActive = !['WAITING', 'FINISHED'].includes(match.state);
  const isPlaying = match.state === 'PLAYING' || match.state === 'IN_PROGRESS';

  return (
    <Card className={`group transition-all border bg-card/60 dark:bg-card/40 backdrop-blur-lg duration-300 ${isActive ? 'border-primary/50 shadow-md shadow-primary/10 -translate-y-0.5' : 'border-gray-700/50 hover:border-primary/30'}`}>
      <CardContent className="p-3">
        <div className="font-medium truncate" title={match.lobbyName}>{match.lobbyName}</div>
        <div className="text-sm text-muted-foreground">
          {t("round")} {match.roundNumber} - {match.phaseName}
        </div>
        <div className="mt-3 text-sm space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t("status")}:</span>
            <span className={`font-medium ${color} ${isActive ? 'animate-pulse' : ''}`}>{label}</span>
          </div>
          {isActive && (match.phaseDuration > 0 || isPlaying) && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" /> {isPlaying ? t("elapsed") : t("time_left")}
              </span>
              <span className="font-mono font-bold tabular-nums">{display}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Link href={match.tournamentId
            ? `/tournaments/${match.tournamentId}/lobbies/${match.lobbyId}`
            : `/minitour/lobbies/${match.lobbyId}`}>
            <Button variant={isActive ? 'default' : 'outline'} className="w-full">
              {match.state === 'PLAYING' ? <><Play className="h-4 w-4 mr-1" />{t("playing")}</> : t("view_lobby")}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface PlayerUpcomingMatchesCardProps {
  playerId: string;
}

export function PlayerUpcomingMatchesCard({ playerId }: PlayerUpcomingMatchesCardProps) {
  const t = useTranslations("common");
  const [matches, setMatches] = useState<IncomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!playerId) return;

    let isMounted = true;

    const fetchMatches = () => {
      fetch(`${BACKEND_URL}/api/players/${playerId}/incoming-matches`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => { if (isMounted && d.success) setMatches(d.data || []); })
        .catch((e) => console.error("Error fetching incoming matches", e))
        .finally(() => { if (isMounted) setLoading(false); });
    };

    fetchMatches();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const s = socketClient(apiUrl, { withCredentials: true });
    setSocket(s);

    s.on('player_profile_update', (data: any) => {
      // If the update targets this player or is global
      if (!data.userId || data.userId === playerId) {
        if (isMounted) fetchMatches();
      }
    });

    s.on('admin_notification', () => {
      // Also refetch on admin notifications in case it's a match start alert
      if (isMounted) fetchMatches();
    });

    return () => {
      isMounted = false;
      s.disconnect();
    };
  }, [playerId]);

  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          {t("incoming_matches")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("loading_matches")}</div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map(m => (
              <IncomingMatchItem key={m.lobbyId} match={m} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {t("no_upcoming_matches")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}