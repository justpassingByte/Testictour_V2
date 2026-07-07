import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getPhaseContext } from "../../phase-utils"
import { PhasePageShell } from "../../../components/phase/PhasePageShell"
import { PhaseLobbiesView } from "../../../components/phase/PhaseLobbiesView"
import { BracketTabSkeleton } from "../../../components/TabSkeletons"

interface PhaseLobbiesPageProps {
  params: { id: string; phaseNumber: string }
}

export default async function PhaseLobbiesPage({ params }: PhaseLobbiesPageProps) {
  const ctx = await getPhaseContext(params.id, params.phaseNumber)
  if (!ctx) notFound()

  const { tournament, phase } = ctx
  const phaseNum = parseInt(params.phaseNumber, 10)

  return (
    <PhasePageShell tournament={tournament} phase={phase}>
      <Suspense fallback={<BracketTabSkeleton />}>
        <PhaseLobbiesView
          tournamentId={tournament.id}
          phaseNumber={phaseNum}
          tournament={tournament}
          phase={phase}
        />
      </Suspense>
    </PhasePageShell>
  )
}
