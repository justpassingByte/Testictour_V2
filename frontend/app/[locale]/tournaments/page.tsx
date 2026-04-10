import { Suspense } from "react"
import { getTranslations } from 'next-intl/server';
import { TournamentService } from "@/app/services/TournamentService"
import { ITournament } from "@/app/types/tournament"
import TournamentsClientPage from "./components/TournamentsClientPage"

export const metadata = {
  title: "Tournaments - TesTicTour",
  description: "Browse and join TFT tournaments, compete with players worldwide, and win prizes.",
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

export default async function TournamentsPage() {
  const t = await getTranslations('common');
  const tournaments = await getTournaments();
  
  return (
    <TournamentsClientPage initialTournaments={tournaments} />
  )
}
