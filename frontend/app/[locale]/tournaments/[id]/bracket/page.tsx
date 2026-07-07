import { redirect, notFound } from "next/navigation"
import { TournamentService } from "@/app/services/TournamentService"
import { getActivePhaseNumber } from "../phases/phase-utils"

interface BracketRedirectProps {
  params: { id: string }
}

export default async function BracketRedirectPage({ params }: BracketRedirectProps) {
  const tournament = await TournamentService.detail(params.id).catch(() => null)
  if (!tournament?.phases?.length) notFound()

  const n = getActivePhaseNumber(tournament.phases)
  redirect(`/tournaments/${params.id}/phases/${n}/lobbies`)
}
