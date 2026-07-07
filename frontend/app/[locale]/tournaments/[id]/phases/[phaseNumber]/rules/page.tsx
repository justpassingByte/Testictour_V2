import { notFound } from "next/navigation"
import { getPhaseContext } from "../../phase-utils"
import { PhasePageShell } from "../../../components/phase/PhasePageShell"
import { PhaseRulesView } from "../../../components/phase/PhaseRulesView"

interface PhaseRulesPageProps {
  params: { id: string; phaseNumber: string }
}

export default async function PhaseRulesPage({ params }: PhaseRulesPageProps) {
  const ctx = await getPhaseContext(params.id, params.phaseNumber)
  if (!ctx) notFound()

  const { tournament, phase } = ctx

  return (
    <PhasePageShell tournament={tournament} phase={phase}>
      <PhaseRulesView phase={phase} />
    </PhasePageShell>
  )
}
