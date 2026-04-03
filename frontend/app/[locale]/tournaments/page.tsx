import { Suspense } from "react"
import { getTranslations } from 'next-intl/server';
import { TournamentService } from "@/app/services/TournamentService"
import { ITournament } from "@/app/types/tournament"
import TournamentsClientPage from "./components/TournamentsClientPage"

export const metadata = {
  title: "Tournaments - TesTicTour",
  description: "Browse and join TFT tournaments, compete with players worldwide, and win prizes.",
}

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
    <Suspense fallback={<TournamentsSkeleton />}>
      <TournamentsClientPage initialTournaments={tournaments} />
    </Suspense>
  )
}

// Simple skeleton loader for the tournaments page
function TournamentsSkeleton() {
  return (
    <div className="container py-10 space-y-8">
      <div className="h-10 w-48 bg-muted rounded mb-2"></div>
      <div className="h-5 w-96 bg-muted rounded-md mb-8"></div>
      
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 mb-8">
        <div className="relative flex-1">
          <div className="h-10 bg-muted rounded w-full"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-muted rounded"></div>
          <div className="h-10 w-28 bg-muted rounded"></div>
          <div className="h-10 w-10 bg-muted rounded"></div>
        </div>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
            <div className="aspect-[16/9] bg-muted"></div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded-md w-3/4"></div>
                <div className="h-4 bg-muted rounded-md w-1/2"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded-md w-full"></div>
                  <div className="h-4 bg-muted rounded-md w-3/4"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded-md w-full"></div>
                  <div className="h-4 bg-muted rounded-md w-3/4"></div>
                </div>
              </div>
              <div className="h-10 bg-muted rounded-md w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
