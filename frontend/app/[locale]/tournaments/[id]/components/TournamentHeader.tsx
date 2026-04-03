"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { SyncStatus } from "@/components/sync-status"
import { ITournament } from "@/app/types/tournament"

interface TournamentHeaderProps {
  tournament: ITournament;
}

export function TournamentHeader({ tournament }: TournamentHeaderProps) {
  return (
    <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/tournaments">Tournaments</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{tournament.name}</span>
      </div>
      <SyncStatus status="live" />
    </div>
  )
} 