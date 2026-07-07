import { notFound } from "next/navigation"
import { getPhaseContext } from "../../phase-utils"
import { PhasePageShell } from "../../../components/phase/PhasePageShell"
import { PhaseStandingsView } from "../../../components/phase/PhaseStandingsView"


interface PhaseStandingsPageProps {
  params: { id: string; phaseNumber: string }
}

export default async function PhaseStandingsPage({ params }: PhaseStandingsPageProps) {
  const ctx = await getPhaseContext(params.id, params.phaseNumber)
  if (!ctx) notFound()

  const { tournament, phase } = ctx

  return (
    <PhasePageShell tournament={tournament} phase={phase}>
      <PhaseStandingsView tournamentId={tournament.id} phase={phase} />
    </PhasePageShell>
  )
}
