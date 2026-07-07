"use client"

import { useState } from "react"
import { Download, ImageIcon, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ITournament, IPhase } from "@/app/types/tournament"
import { captureBracketPng, exportPhaseScoreboardCsv } from "./phase-export"

interface PhaseLobbiesToolbarProps {
  tournament: ITournament
  phase: IPhase
  onExportBracketStart: () => void
  onExportBracketEnd: () => void
}

export function PhaseLobbiesToolbar({
  tournament,
  phase,
  onExportBracketStart,
  onExportBracketEnd,
}: PhaseLobbiesToolbarProps) {
  const t = useTranslations("common")
  const [loadingBracket, setLoadingBracket] = useState(false)
  const [loadingScoreboard, setLoadingScoreboard] = useState(false)

  const handleExportBracket = async () => {
    setLoadingBracket(true)
    onExportBracketStart()
    try {
      await new Promise((r) => setTimeout(r, 600))
      await captureBracketPng(
        "bracket-export-target",
        `bracket_${tournament.id}_phase${phase.phaseNumber}.png`
      )
      toast.success(t("export_bracket_success"))
    } catch (error) {
      console.error(error)
      toast.error(t("export_failed"))
    } finally {
      onExportBracketEnd()
      setLoadingBracket(false)
    }
  }

  const handleExportScoreboard = async () => {
    setLoadingScoreboard(true)
    try {
      await exportPhaseScoreboardCsv(tournament.id, phase)
      toast.success(t("export_scoreboard_success"))
    } catch (error) {
      console.error(error)
      toast.error(t("export_failed"))
    } finally {
      setLoadingScoreboard(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/20 border border-white/10">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
        {t("export")}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 border-white/10"
        disabled={loadingBracket || loadingScoreboard}
        onClick={handleExportBracket}
      >
        {loadingBracket ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
        {t("export_bracket_png")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 border-white/10"
        disabled={loadingBracket || loadingScoreboard}
        onClick={handleExportScoreboard}
      >
        {loadingScoreboard ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {t("export_phase_scoreboard")}
      </Button>
    </div>
  )
}
