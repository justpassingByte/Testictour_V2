import { notFound } from "next/navigation"
import api from "@/app/lib/apiConfig"
import LivePageClient from "./LivePageClient"

/**
 * Lightweight SSR fetch for the Live page.
 * Uses the dedicated /live-summary endpoint which only returns basic tournament info
 * + lobby states. NO deep nested matches/results/participants.
 * ~10ms vs ~500ms+ for the full TournamentService.detail() call.
 */
async function getTournamentLiveSummary(id: string) {
  try {
    const response = await api.get(`/tournaments/${id}/live-summary`)
    const { tournament, liveStats } = response.data
    return { tournament, liveStats }
  } catch (error) {
    console.error(`Error fetching live summary for tournament ${id}:`, error)
    return null
  }
}

export default async function LiveScoreboardPage({ params }: { params: { id: string } }) {
  const resolvedParams = await Promise.resolve(params)
  const data = await getTournamentLiveSummary(resolvedParams.id)
  
  if (!data?.tournament) {
    notFound()
  }

  return <LivePageClient tournament={data.tournament} liveStats={data.liveStats} />
}
