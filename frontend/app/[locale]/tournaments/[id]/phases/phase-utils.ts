import { notFound, redirect } from "next/navigation"
import { TournamentService } from "@/app/services/TournamentService"
import { IPhase } from "@/app/types/tournament"

export async function getPhaseContext(tournamentId: string, phaseNumberStr: string) {
  const phaseNumber = parseInt(phaseNumberStr, 10)
  if (isNaN(phaseNumber) || phaseNumber < 1) return null

  const tournament = await TournamentService.detail(tournamentId).catch(() => null)
  if (!tournament) return null

  const phase = tournament.phases?.find((p: IPhase) => p.phaseNumber === phaseNumber)
  if (!phase) return null

  return { tournament, phase }
}

export function getActivePhaseNumber(phases: IPhase[]): number {
  const live = phases.find((p) => p.status === "in_progress" || p.status === "PLAYING")
  if (live) return live.phaseNumber
  const completed = [...phases].reverse().find((p) => p.status === "completed")
  if (completed) return completed.phaseNumber
  return phases[0]?.phaseNumber ?? 1
}
