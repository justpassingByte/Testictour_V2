"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  WAITING:            { label: 'Waiting',       color: 'text-muted-foreground' },
  READY_CHECK:        { label: 'Ready Check',   color: 'text-yellow-400' },
  GRACE_PERIOD:       { label: 'Grace Period',  color: 'text-orange-400' },
  STARTING:           { label: 'Starting!',     color: 'text-green-400' },
  PLAYING:            { label: 'In Progress',   color: 'text-primary' },
  FINISHED:           { label: 'Finished',      color: 'text-green-600' },
  PAUSED:             { label: 'Paused',        color: 'text-orange-400' },
  ADMIN_INTERVENTION: { label: 'Admin Review',  color: 'text-red-400' },
};

function useCountdown(phaseStartedAt: string | undefined, durationSeconds: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!phaseStartedAt || !durationSeconds) return;
    const tick = () => {
      const endsAt = new Date(phaseStartedAt).getTime() + durationSeconds * 1000;
      setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt, durationSeconds]);
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  return { display: `${m}:${s}`, remaining };
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
  const { display } = useCountdown(match.phaseStartedAt, match.phaseDuration);
  const sc = STATE_LABELS[match.state] || { label: match.state, color: 'text-muted-foreground' };
  const isActive = !['WAITING', 'FINISHED'].includes(match.state);

  return (
    <Card className={`group transition-all border bg-card/60 dark:bg-card/40 backdrop-blur-lg duration-300 ${isActive ? 'border-primary/50 shadow-md shadow-primary/10 -translate-y-0.5' : 'border-gray-700/50 hover:border-primary/30'}`}>
      <CardContent className="p-3">
        <div className="font-medium truncate" title={match.lobbyName}>{match.lobbyName}</div>
        <div className="text-sm text-muted-foreground">
          Round {match.roundNumber} - {match.phaseName}
        </div>
        <div className="mt-3 text-sm space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-medium ${sc.color} ${isActive ? 'animate-pulse' : ''}`}>{sc.label}</span>
          </div>
          {isActive && match.phaseDuration > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> Time left:</span>
              <span className="font-mono font-bold tabular-nums">{display}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Link href={match.tournamentId
            ? `/tournaments/${match.tournamentId}/lobbies/${match.lobbyId}`
            : `/minitour/lobbies/${match.lobbyId}`}>
            <Button variant={isActive ? 'default' : 'outline'} className="w-full">
              {match.state === 'PLAYING' ? <><Play className="h-4 w-4 mr-1" />Playing</> : 'View Lobby'}
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
  const [matches, setMatches] = useState<IncomingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    fetch(`${BACKEND_URL}/api/players/${playerId}/incoming-matches`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setMatches(d.data || []); })
      .catch((e) => console.error("Error fetching incoming matches", e))
      .finally(() => setLoading(false));
  }, [playerId]);

  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Incoming Matches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading matches...</div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map(m => (
              <IncomingMatchItem key={m.lobbyId} match={m} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No upcoming matches scheduled
          </div>
        )}
      </CardContent>
    </Card>
  );
}