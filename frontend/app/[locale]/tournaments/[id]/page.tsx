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
import { TournamentLobbyButton } from "@/app/[locale]/tournaments/[id]/components/TournamentLobbyButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server"
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
  const t = await getTranslations("common")
  const resolvedParams = await Promise.resolve(params)
  const [tournament, participants] = await Promise.all([
    getTournamentDetail(resolvedParams.id),
    getTournamentParticipants(resolvedParams.id)
  ])
  
  if (!tournament) {
    notFound()
  }

  const statusMapping = {
    pending:     { text: t("upcoming"),   color: "bg-yellow-500/20 text-yellow-500" },
    in_progress: { text: t("ongoing"),    color: "bg-primary/20 text-primary animate-pulse-subtle" },
    completed:   { text: t("finished"),   color: "bg-muted text-muted-foreground" },
  }
  const currentStatus = statusMapping[tournament.status as keyof typeof statusMapping] || 
    { text: tournament.status, color: "" }

  return (
    <div className="container py-8">
      <TournamentHeader tournament={tournament} />

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="col-span-3 md:col-span-2">
          <div className="flex flex-col space-y-8">
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
          <div className="flex flex-col space-y-8">
            <Card className="overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-primary/20 shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
              <CardHeader className="p-0">
                <Image
                  width={1000}
                  height={1000}
                  src={tournament.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'}
                  alt={tournament.name}
                  className="object-cover w-full h-full"
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4" /> {t("participants") || "Participants"}:</span>
                    <span className="font-medium">{tournament.registered || 0} / {tournament.maxPlayers}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Globe className="mr-2 h-4 w-4" /> {t("region")}:</span>
                    <span className="font-medium">{tournament.region || 'N/A'}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" /> {t("registration_deadline")}:</span>
                    <span className="font-medium">
                      {tournament.endTime && !isNaN(new Date(tournament.endTime).getTime())
                        ? format(new Date(tournament.endTime), "yyyy-MM-dd")
                        : "N/A"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><circle cx="8" cy="8" r="7"/><polyline points="8 4 8 12 11.5 15.5"/><circle cx="16" cy="16" r="7"/><line x1="16" y1="12" x2="16" y2="20"/><line x1="12" y1="16" x2="20" y2="16"/></svg> {t("registration_fee")}:
                    </span>
                    <span className="font-medium text-amber-400 font-mono">{tournament.entryFee.toLocaleString()}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Clock className="mr-2 h-4 w-4" /> {t("status")}:</span>
                    <Badge variant="outline" className={`${currentStatus.color} capitalize`}>{currentStatus.text}</Badge>
                  </li>
                </ul>
                <div className="grid gap-3">
                  {tournament.status === "in_progress" && (
                    <>
                      <TournamentLobbyButton tournamentId={tournament.id} />
                      <Button asChild variant="secondary" className="w-full">
                        <Link href={`/tournaments/${tournament.id}/live`}>{t("view_live_scoreboard")}</Link>
                      </Button>
                    </>
                  )}
                  {tournament.status === "UPCOMING" && (
                    <Button asChild className="w-full">
                      <Link href={`/tournaments/${tournament.id}/register`}>{t("register_now")}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-primary/20 shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">{t("quick_links")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Link href="#" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1 p-2 hover:bg-primary/5 rounded-md -mx-2">
                  <Download className="mr-2 h-4 w-4" /> {t("bracket")}
                </Link>
                <Link href="#" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1 p-2 hover:bg-primary/5 rounded-md -mx-2">
                  <Download className="mr-2 h-4 w-4" /> {t("export_scoreboard")}
                </Link>
                <Link href="#" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1 p-2 hover:bg-primary/5 rounded-md -mx-2">
                  <Download className="mr-2 h-4 w-4" /> {t("player_list")}
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