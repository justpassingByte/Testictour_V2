"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/app/stores/userStore";
import { Play } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface IncomingMatch {
  lobbyId: string;
  tournamentId: string;
  state: string;
}

export function TournamentLobbyButton({ tournamentId }: { tournamentId: string }) {
  const { currentUser } = useUserStore();
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    fetch(`${BACKEND_URL}/api/players/${currentUser.id}/incoming-matches`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Find if the user has an active lobby in THIS tournament
          const match = data.data.find((m: IncomingMatch) => m.tournamentId === tournamentId);
          if (match) {
            setActiveLobbyId(match.lobbyId);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser, tournamentId]);

  if (loading) {
    return (
      <Button variant="secondary" className="w-full opacity-50" disabled>
        Checking lobby...
      </Button>
    );
  }

  if (activeLobbyId) {
    return (
      <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-indigo-400/30 text-white shadow-lg shadow-indigo-500/20">
        <Link href={`/tournaments/${tournamentId}/lobbies/${activeLobbyId}`}>
          <Play className="mr-2 h-4 w-4" /> Enter My Lobby
        </Link>
      </Button>
    );
  }

  // Fallback for spectators or eliminated players
  return (
    <Button asChild variant="secondary" className="w-full">
      <Link href="#tournament-tabs">View Current Lobbies</Link>
    </Button>
  );
}
