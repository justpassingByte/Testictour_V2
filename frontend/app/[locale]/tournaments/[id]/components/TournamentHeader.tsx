"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { SyncStatus } from "@/components/sync-status"
import { ITournament } from "@/app/types/tournament"
import { useTranslations } from "next-intl"

interface TournamentHeaderProps {
  tournament: ITournament;
  onSync?: () => Promise<void>;
}

export function TournamentHeader({ tournament, onSync }: TournamentHeaderProps) {
  const t = useTranslations("common")
  const syncStatus: "live" | "idle" = ['in_progress', 'IN_PROGRESS'].includes(tournament.status) ? "live" : "idle"
  return (
    <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/">{t("home")}</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/tournaments">{t("tournaments")}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{tournament.name}</span>
      </div>
      <SyncStatus status={syncStatus} onSync={onSync} />
    </div>
  )
} 