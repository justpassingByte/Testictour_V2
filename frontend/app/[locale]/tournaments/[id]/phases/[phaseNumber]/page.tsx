import { notFound, redirect } from "next/navigation"
import { getPhaseContext } from "../phase-utils"

interface PhaseIndexProps {
  params: { id: string; phaseNumber: string }
}

export default async function PhaseIndexPage({ params }: PhaseIndexProps) {
  const ctx = await getPhaseContext(params.id, params.phaseNumber)
  if (!ctx) notFound()
  redirect(`/tournaments/${params.id}/phases/${params.phaseNumber}/lobbies`)
}
