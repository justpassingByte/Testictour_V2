import { getTranslations } from 'next-intl/server';
import HomePageClient from './components/HomePageClient';
import { TournamentService } from "@/app/services/TournamentService"
import { ITournament } from "@/app/types/tournament"
import api from "@/app/lib/apiConfig"
import { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

export const metadata = {
  title: "TesTicTour - Tournament Platform for TFT Players",
  description: "Join TFT tournaments, compete with players worldwide, and win prizes. The ultimate tournament platform for TFT enthusiasts.",
}

export const revalidate = 60; // Cache the page for 60 seconds (ISR) to fix fetching delay

// Server-side data fetching
async function getTournaments() {
  try {
    const data = await TournamentService.list()
    return data.tournaments || []
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return []
  }
}

async function getMiniTourLobbies(): Promise<MiniTourLobby[]> {
  try {
    const response = await api.get("/minitour-lobbies")
    if (response.data && response.data.success) {
      return response.data.data
    }
    return []
  } catch (error) {
    console.error("Error fetching MiniTour lobbies:", error)
    return []
  }
}

export default async function HomePage() {
  const t = await getTranslations('common');
  const [tournaments, lobbies] = await Promise.all([
    getTournaments(),
    getMiniTourLobbies(),
  ]);

  return (
    <HomePageClient tournaments={tournaments} lobbies={lobbies} />
  )
}
