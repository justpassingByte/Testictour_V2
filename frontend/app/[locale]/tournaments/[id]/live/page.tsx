import { notFound } from "next/navigation"
import { TournamentService } from "@/app/services/TournamentService"
import LivePageClient from "./LivePageClient"

async function getTournamentDetail(id: string) {
  try {
    const tournament = await TournamentService.detail(id)
    return tournament
  } catch (error) {
    console.error(`Error fetching tournament ${id}:`, error)
    return null
  }
}

export default async function LiveScoreboardPage({ params }: { params: { id: string } }) {
  const resolvedParams = await Promise.resolve(params)
  const tournament = await getTournamentDetail(resolvedParams.id)
  
  if (!tournament) {
    notFound()
  }

  return <LivePageClient tournament={tournament} />
}
