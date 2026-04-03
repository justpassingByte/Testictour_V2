"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ITournament, IRound } from "@/app/types/tournament"
import { SyncStatus } from "@/components/sync-status"

interface RoundHeaderProps {
  tournament: ITournament | null
  round: IRound | null
}

export function RoundHeader({ tournament, round }: RoundHeaderProps) {
  if (!tournament || !round) return null

  return (
    <>
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tournaments">Tournaments</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/tournaments/${tournament.id}`}>{tournament.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Round {round.roundNumber} Results</span>
        </div>
        <SyncStatus status="idle" />
      </div>

      <div className="mt-6 flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Round {round.roundNumber} Results</h1>
        <p className="text-muted-foreground">
          {tournament.name} • {round.status === "completed" ? "Completed" : "In Progress"}
        </p>
      </div>
    </>
  )
} 