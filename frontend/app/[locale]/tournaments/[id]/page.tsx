import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { TournamentService } from "@/app/services/TournamentService"
import { TournamentHeader } from "@/app/[locale]/tournaments/[id]/components/TournamentHeader"
import { TournamentScheduleCard } from "@/app/[locale]/tournaments/[id]/components/TournamentScheduleCard"
import { TournamentFormatCard } from "@/app/[locale]/tournaments/[id]/components/TournamentFormatCard"
import { PointSystemCard } from "@/app/[locale]/tournaments/[id]/components/PointSystemCard"
import TabsContentClientWrapper from "@/app/[locale]/tournaments/[id]/components/TabsContentClientWrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Globe, Users, Calendar, 
  DollarSign, Clock, Download, Loader2
} from "lucide-react"

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
  const tournament = await getTournamentDetail(resolvedParams.id)
  
  if (!tournament) {
    notFound()
  }

  // Pre-fetch participants for server rendering
  const participants = await getTournamentParticipants(resolvedParams.id)

  // Determine status from database values
  const statusMapping = {
    pending: { text: "Upcoming", color: "bg-yellow-500/20 text-yellow-500" },
    in_progress: { text: "Ongoing", color: "bg-primary/20 text-primary animate-pulse-subtle" },
    completed: { text: "Finished", color: "bg-muted text-muted-foreground" },
  }
  const currentStatus = statusMapping[tournament.status as keyof typeof statusMapping] || 
    { text: tournament.status, color: "" }

  return (
    <div className="container py-8">
      <TournamentHeader tournament={tournament} />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="col-span-3 md:col-span-2">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl font-bold">{tournament.name}</h1>
                <Badge variant="outline" className={`${currentStatus.color} capitalize`}>
                  {currentStatus.text}
                </Badge>
              </div>
              <p className="text-muted-foreground">{tournament.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TournamentScheduleCard tournament={tournament} />
              <TournamentFormatCard tournament={tournament} />
            </div>

            <PointSystemCard tournament={tournament} />

            <Suspense fallback={<TabContentSkeleton />}>
              {/* Use the client component wrapper */}
              <TabsContentClientWrapper 
                tournament={tournament}
                participants={participants}
              />
            </Suspense>
          </div>
        </div>

        <div className="col-span-3 md:col-span-1">
          <div className="flex flex-col space-y-6">
            <Card className="overflow-hidden bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
              <CardHeader className="p-0">
                <Image
                  width={1000}
                  height={1000}
                  src={tournament.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'}
                  alt={tournament.name}
                  className="object-cover"
                />
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4" /> Players:</span>
                    <span className="font-medium">{tournament.registered || 0} / {tournament.maxPlayers}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Globe className="mr-2 h-4 w-4" /> Region:</span>
                    <span className="font-medium">{tournament.region || 'N/A'}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" /> Reg. Deadline:</span>
                    <span className="font-medium">
                      {tournament.endTime && !isNaN(new Date(tournament.endTime).getTime())
                        ? format(new Date(tournament.endTime), "yyyy-MM-dd")
                        : "N/A"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4" /> Reg. Fee:</span>
                    <span className="font-medium">${tournament.entryFee}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Clock className="mr-2 h-4 w-4" /> Status:</span>
                    <Badge variant="outline" className={`${currentStatus.color} capitalize`}>{currentStatus.text}</Badge>
                  </li>
                </ul>
                <div className="grid gap-2">
                  {tournament.status === "in_progress" && (
                    <>
                      <Button asChild className="w-full">
                        <Link href={`/tournaments/${tournament.id}/scoreboard`}>View Live Scoreboard</Link>
                      </Button>
                      <Button asChild variant="secondary" className="w-full">
                        <Link href={`/tournaments/${tournament.id}/lobbies`}>View Current Lobbies</Link>
                      </Button>
                    </>
                  )}
                  {tournament.status === "UPCOMING" && (
                    <Button asChild className="w-full">
                      <Link href={`/tournaments/${tournament.id}/register`}>Register Now</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Link href="#" className="flex items-center text-sm hover:text-primary">
                  <Download className="mr-2 h-4 w-4" /> Download Brackets
                </Link>
                <Link href="#" className="flex items-center text-sm hover:text-primary">
                  <Download className="mr-2 h-4 w-4" /> Export Results as CSV
                </Link>
                <Link href="#" className="flex items-center text-sm hover:text-primary">
                  <Download className="mr-2 h-4 w-4" /> Download Player List
                </Link>
              </CardContent>
            </Card>
          </div>
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