"use client"

import { useEffect } from 'react'
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ITournament } from '@/app/types/tournament'
import { useTournamentStore } from '@/app/stores/tournamentStore'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TournamentLobbyButton } from "./TournamentLobbyButton"
import {
  Globe, Users, Calendar,
  DollarSign, Clock, Download,
  AlertTriangle, ShieldCheck, Lock
} from "lucide-react"
import { useTranslations } from "next-intl"

interface TournamentSidebarClientProps {
  initialTournament: ITournament;
}

const regionSubRegions: Record<string, string> = {
  AMERICAS: "North America (NA1), Brazil (BR1), LATAM North (LA1), LATAM South (LA2)",
  EUROPE: "Europe West (EUW1), Europe Nordic & East (EUN1), Turkey (TR1), Russia (RU)",
  ASIA: "Vietnam (VN2), Taiwan (TW2), Singapore/Malaysia (SG2), Thailand (TH2), Philippines (PH2), Korea (KR), Japan (JP1)"
};

export default function TournamentSidebarClient({ initialTournament }: TournamentSidebarClientProps) {
  const t = useTranslations("common")
  const currentTournament = useTournamentStore(state => state.currentTournament)
  
  // Use the store's current tournament if available, otherwise SSR data
  const tournament = currentTournament?.id === initialTournament.id ? currentTournament : initialTournament

  const statusMapping: Record<string, { text: string; color: string }> = {
    pending:     { text: t("upcoming"),   color: "bg-yellow-500/20 text-yellow-500" },
    UPCOMING:    { text: t("upcoming"),   color: "bg-yellow-500/20 text-yellow-500" },
    in_progress: { text: t("ongoing"),    color: "bg-primary/20 text-primary animate-pulse-subtle" },
    completed:   { text: t("finished"),   color: "bg-muted text-muted-foreground" },
    COMPLETED:   { text: t("finished"),   color: "bg-muted text-muted-foreground" },
  }
  const currentStatus = statusMapping[tournament.status] || { text: tournament.status, color: "" }

  return (
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
              {tournament.region && regionSubRegions[tournament.region] ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="font-medium underline decoration-dashed underline-offset-4 decoration-muted-foreground cursor-help hover:text-primary transition-colors">
                        {tournament.region}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-center border-white/10 bg-black/80 backdrop-blur-md">
                      <p className="font-semibold text-xs mb-1">{t("included_sub_regions")}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {regionSubRegions[tournament.region]}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="font-medium">{tournament.region || t("n_a")}</span>
              )}
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" /> {t("registration_deadline")}:</span>
              <span className="font-medium">
                {tournament.endTime && !isNaN(new Date(tournament.endTime).getTime())
                  ? format(new Date(tournament.endTime), "yyyy-MM-dd")
                  : t("n_a")}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><circle cx="8" cy="8" r="7"/><polyline points="8 4 8 12 11.5 15.5"/><circle cx="16" cy="16" r="7"/><line x1="16" y1="12" x2="16" y2="20"/><line x1="12" y1="16" x2="20" y2="16"/></svg> {t("registration_fee")}:
              </span>
              <span className="font-medium text-amber-400 font-mono">{tournament.entryFee.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-muted-foreground flex items-center"><ShieldCheck className="mr-2 h-4 w-4" /> {t("funding_status") || "Funding"}:</span>
              {tournament.isCommunityMode ? (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-none font-mono tracking-wider px-1.5 uppercase">UNSECURED</Badge>
              ) : tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released' ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-none font-mono tracking-wider px-1.5 uppercase">100% FUNDED</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-none font-mono tracking-wider px-1.5 uppercase">PENDING</Badge>
              )}
            </li>
            <li className="flex items-center justify-between pt-1">
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
            {(tournament.status === "UPCOMING" || tournament.status === "pending") && (
              (tournament.registered || 0) >= tournament.maxPlayers ? (
                <Button disabled className="w-full">
                  {t("tournament_full") || "Tournament Full"}
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href={`/tournaments/${tournament.id}/register`}>{t("register_now")}</Link>
                </Button>
              )
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
  )
}
