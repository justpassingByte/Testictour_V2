"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { IPhase, ITournament } from "@/app/types/tournament"
import { Badge } from "@/components/ui/badge"
import { SyncStatus } from "@/components/sync-status"
import { getStateColor } from "../bracket/bracket-shared"

interface PhaseHeaderProps {
  tournament: ITournament
  phase: IPhase
  onSync?: () => Promise<void>
}

export function PhaseHeader({ tournament, phase, onSync }: PhaseHeaderProps) {
  const t = useTranslations("common")

  const formatType = (() => {
    switch (phase.type?.toLowerCase()) {
      case "group_stage": return t("phase_group_stage")
      case "knockout": return t("phase_knockout")
      case "points": return t("phase_points")
      case "swiss": return t("phase_swiss")
      case "checkmate": return t("phase_checkmate")
      case "elimination": return t("phase_elimination")
      default: return phase.type
    }
  })()

  const isLive = phase.status === "in_progress" || phase.status === "PLAYING"

  return (
    <>
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/">{t("home")}</Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <Link href="/tournaments">{t("tournaments")}</Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <Link href={`/tournaments/${tournament.id}`}>{tournament.name}</Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground">
            {t("stage_n", { number: phase.phaseNumber })}: {phase.name}
          </span>
        </div>
        <SyncStatus status={isLive ? "live" : "idle"} onSync={onSync} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {t("stage_n", { number: phase.phaseNumber })}: {phase.name}
            </h1>
            <Badge variant="outline" className="uppercase text-xs font-semibold px-2 py-1 bg-primary/10 text-primary">
              {formatType}
            </Badge>
            {isLive ? (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/50 text-xs font-bold animate-pulse">
                {t("live")}
              </Badge>
            ) : (
              <Badge variant="outline" className={`${getStateColor(phase.status)} text-xs capitalize`}>
                {phase.status}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{tournament.name}</p>
        </div>
      </div>
    </>
  )
}
