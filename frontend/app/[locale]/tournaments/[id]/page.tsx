import { Suspense } from "react"
import { notFound } from "next/navigation"
import { TournamentService } from "@/app/services/TournamentService"
import { TournamentHeader } from "@/app/[locale]/tournaments/[id]/components/TournamentHeader"
import { TournamentScheduleCard } from "@/app/[locale]/tournaments/[id]/components/TournamentScheduleCard"
import { TournamentFormatCard } from "@/app/[locale]/tournaments/[id]/components/TournamentFormatCard"
import { PointSystemCard } from "@/app/[locale]/tournaments/[id]/components/PointSystemCard"
import TabsContentClientWrapper from "@/app/[locale]/tournaments/[id]/components/TabsContentClientWrapper"
import TournamentInfoClient from "@/app/[locale]/tournaments/[id]/components/TournamentInfoClient"
import TournamentSidebarClient from "@/app/[locale]/tournaments/[id]/components/TournamentSidebarClient"

// Server-side data fetching
async function getTournamentDetail(id: string) {
  try {
    const tournament = await TournamentService.detail(id)
    return tournament
  } catch (error) {
    console.error(`Error fetching tournament ${id}:`, error)
    return null
  }
}

async function getTournamentParticipants(tournamentId: string) {
  try {
    const { participants } = await TournamentService.listParticipants(tournamentId, 1, 100)
    return participants
  } catch (error) {
    console.error(`Error fetching participants for tournament ${tournamentId}:`, error)
    return []
  }
}

export default async function TournamentPage({ params }: { params: { id: string } }) {
  const resolvedParams = await Promise.resolve(params)
  const [tournament, participants] = await Promise.all([
    getTournamentDetail(resolvedParams.id),
    getTournamentParticipants(resolvedParams.id)
  ])
  
  if (!tournament) {
    notFound()
  }

  return (
    <div className="container py-8">
      <TournamentHeader tournament={tournament} />

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="col-span-3 md:col-span-2">
          <div className="flex flex-col space-y-8">
            {/* Client component: title, status badge, escrow banner — updates in real-time */}
            <TournamentInfoClient initialTournament={tournament} />

            <div className="grid gap-4 md:grid-cols-2">
              <TournamentScheduleCard tournament={tournament} />
              <TournamentFormatCard tournament={tournament} />
            </div>

            <PointSystemCard tournament={tournament} />

            <Suspense fallback={<TabContentSkeleton />}>
              <div id="tournament-tabs">
                <TabsContentClientWrapper 
                  tournament={tournament}
                  participants={participants}
                />
              </div>
            </Suspense>
          </div>
        </div>

        <div className="col-span-3 md:col-span-1">
          {/* Client component: sidebar with status, funding, buttons — updates in real-time */}
          <TournamentSidebarClient initialTournament={tournament} />
        </div>
      </div>
    </div>
  )
}

// Skeleton for tab content during loading
function TabContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex space-x-4 border-b overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
      <div className="animate-pulse space-y-4 py-4">
        <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-muted rounded w-full mb-2"></div>
        <div className="h-4 bg-muted rounded w-full mb-2"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    </div>
  )
}