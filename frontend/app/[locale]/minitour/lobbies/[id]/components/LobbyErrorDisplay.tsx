"use client"

import { Button } from "@/components/ui/button"

interface LobbyErrorDisplayProps {
  errorMessage: string;
  lobbyId: string;
}

export function LobbyErrorDisplay({ errorMessage, lobbyId }: LobbyErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <p className="text-xl text-red-500">Error: {errorMessage}</p>
      <Button onClick={() => window.location.href = `/minitour/lobbies/${lobbyId}`} className="mt-4">Retry</Button>
    </div>
  );
} 