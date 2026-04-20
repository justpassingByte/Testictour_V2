"use client"

import { useEffect, useState } from 'react'
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ITournament } from '@/app/types/tournament'
import { useTournamentStore } from '@/app/stores/tournamentStore'
import { useUserStore } from '@/app/stores/userStore'
import { ParticipantService } from '@/app/services/ParticipantService'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TournamentLobbyButton } from "./TournamentLobbyButton"
import * as htmlToImage from "html-to-image"
import { toast } from "sonner"
import api from "@/app/lib/apiConfig"
import {
  Globe, Users, Calendar,
  DollarSign, Clock, Download,
  AlertTriangle, ShieldCheck, Lock, CheckCircle2
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate"

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
  const { formatVndText } = useCurrencyRate()
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

  const [loadingExportBracket, setLoadingExportBracket] = useState(false)
  const [loadingExportScoreboard, setLoadingExportScoreboard] = useState(false)
  const [loadingExportPlayers, setLoadingExportPlayers] = useState(false)
  const { currentUser } = useUserStore()
  const [isUserRegistered, setIsUserRegistered] = useState(false)

  useEffect(() => {
    if (!currentUser?.id || !tournament?.id) return
    ParticipantService.list(tournament.id)
      .then((participants) => {
        const found = participants.some((p: any) => p.userId === currentUser.id)
        setIsUserRegistered(found)
      })
      .catch(() => { /* ignore */ })
  }, [currentUser?.id, tournament?.id])

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportBracket = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoadingExportBracket(true)
    try {
      window.dispatchEvent(new CustomEvent('export_bracket_start', { detail: { tournament } }))
      await new Promise(resolve => setTimeout(resolve, 300)) // Wait for DOM re-render
      const el = document.getElementById('bracket-export-target')
      if (!el) {
        toast.error(t("bracket") + " " + t("not_found") + " - " + t("please_navigate_to_bracket_tab"))
        window.dispatchEvent(new Event('export_bracket_end'))
        return
      }
      const dataUrl = await htmlToImage.toPng(el, { 
        backgroundColor: '#0f172a',
        skipFonts: true,
        pixelRatio: 2
      })
      const link = document.createElement('a')
      link.download = `bracket_${tournament.id}.png`
      link.href = dataUrl
      link.click()
      toast.success(t("bracket") + " " + t("exported_successfully"))
    } catch (error) {
      console.error(error)
      toast.error(t("export") + " " + t("failed"))
    } finally {
      window.dispatchEvent(new Event('export_bracket_end'))
      setLoadingExportBracket(false)
    }
  }

  const handleExportScoreboard = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoadingExportScoreboard(true)
    try {
      const res = await api.get(`/tournaments/${tournament.id}/bracket`)
      const data = res.data
      if (!data.success || !data.phases) throw new Error("Invalid bracket data")

      let csvContent = ""
      data.phases.forEach((phase: any) => {
        csvContent += `\n${phase.name.toUpperCase()}\n`
        phase.groups.forEach((group: any) => {
          group.lobbies.forEach((lobby: any) => {
            const groupLetterRegex = lobby.name.match(/\[(.*?)\]/);
            const actualGroup = groupLetterRegex ? groupLetterRegex[1] : (group.groupLetter || '');

            csvContent += `\nBảng ${actualGroup} - ${lobby.name}\n`
            csvContent += `In-Game Name,Riot ID,Placement,Points\n`

            lobby.players.forEach((player: any) => {
              const riotId = player.riotGameName && player.riotGameTag ? `${player.riotGameName}#${player.riotGameTag}` : ""
              csvContent += `"${player.username}","${riotId}","${player.placement || ''}","${player.points || 0}"\n`
            })
          })
        })
      })

      downloadCSV(csvContent, `scoreboard_${tournament.id}.csv`)
      toast.success(t("export_scoreboard") + " " + t("exported_successfully"))
    } catch (error) {
      console.error(error)
      toast.error(t("export") + " " + t("failed"))
    } finally {
      setLoadingExportScoreboard(false)
    }
  }

  const handleExportPlayers = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoadingExportPlayers(true)
    try {
      const response = await api.get(`/tournaments/${tournament.id}/participants`)
      const participants = response.data.participants || response.data.data || []
      
      let csvContent = "In-Game Name,Riot ID,Email,Status,Payment Status\n"
      participants.forEach((p: any) => {
        const username = p.inGameName || p.user?.username || ''
        const riotId = p.gameSpecificId || ''
        const email = p.user?.email || ''
        const status = p.eliminated ? 'Eliminated' : 'Active'
        const payment = p.paid ? 'Paid' : 'Unpaid'
        csvContent += `"${username}","${riotId}","${email}","${status}","${payment}"\n`
      })

      downloadCSV(csvContent, `participants_${tournament.id}.csv`)
      toast.success(t("player_list") + " " + t("exported_successfully"))
    } catch (error) {
      console.error(error)
      toast.error(t("export") + " " + t("failed"))
    } finally {
      setLoadingExportPlayers(false)
    }
  }

  return (
    <div className="flex flex-col space-y-8">
      <Card className="overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-primary/20 shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
        <CardHeader className="p-0">
          <Image
            width={800}
            height={450}
            src={tournament.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'}
            alt={tournament.name}
            className="object-cover w-full aspect-video"
            priority={true}
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, 33vw"
            quality={85}
          />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <ul className="space-y-3">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4" /> {t("participants") || "Participants"}:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{tournament.registered || 0} / {tournament.maxPlayers}</span>
                {(tournament.reserveCount ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-500/30 text-amber-400 bg-amber-500/10 font-mono">
                    +{tournament.reserveCount} {t("reserve_badge")}
                  </Badge>
                )}
              </div>
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
                {tournament.registrationDeadline && !isNaN(new Date(tournament.registrationDeadline).getTime())
                  ? format(new Date(tournament.registrationDeadline), "yyyy-MM-dd HH:mm")
                  : t("n_a")}
              </span>
            </li>
            <li className="flex items-start justify-between">
              <span className="text-muted-foreground flex items-center mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><circle cx="8" cy="8" r="7"/><polyline points="8 4 8 12 11.5 15.5"/><circle cx="16" cy="16" r="7"/><line x1="16" y1="12" x2="16" y2="20"/><line x1="12" y1="16" x2="20" y2="16"/></svg> {t("registration_fee")}:
              </span>
              <div className="text-right">
                <span className="font-medium text-amber-400 font-mono">${tournament.entryFee.toLocaleString()} USD</span>
                <div className="text-[10px] text-muted-foreground">{formatVndText(tournament.entryFee)}</div>
              </div>
            </li>
            <li className="flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-muted-foreground flex items-center"><ShieldCheck className="mr-2 h-4 w-4" /> {t("funding_status") || "Funding"}:</span>
              {tournament.isCommunityMode ? (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-none font-mono tracking-wider px-1.5 uppercase">UNSECURED</Badge>
              ) : tournament.organizer?.partnerSubscription?.plan === 'PRO' || tournament.organizer?.partnerSubscription?.plan === 'ENTERPRISE' ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-none font-mono tracking-wider px-1.5 uppercase">TRUSTED</Badge>
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
            {(tournament.status === "in_progress" || tournament.status === "COMPLETED" || tournament.status === "completed") && (
              <>
                {tournament.status === "in_progress" && <TournamentLobbyButton tournamentId={tournament.id} />}
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/tournaments/${tournament.id}/live`}>
                    {tournament.status === "in_progress" ? t("view_live_scoreboard") : t("view_scoreboard")}
                  </Link>
                </Button>
              </>
            )}
            {(tournament.status === "UPCOMING" || tournament.status === "pending") && (
              isUserRegistered ? (
                <Button disabled className="w-full bg-green-600/20 text-green-500 border-green-500/30 hover:bg-green-600/20">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("already_registered") || "Already Registered"}
                </Button>
              ) : (tournament.registered || 0) >= tournament.maxPlayers ? (
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
          <a href="#" onClick={handleExportBracket} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1 p-2 hover:bg-primary/5 rounded-md -mx-2">
            <Download className="mr-2 h-4 w-4" /> {loadingExportBracket ? "..." : t("bracket")}
          </a>
          <a href="#" onClick={handleExportScoreboard} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1 p-2 hover:bg-primary/5 rounded-md -mx-2">
            <Download className="mr-2 h-4 w-4" /> {loadingExportScoreboard ? "..." : t("export_scoreboard")}
          </a>
          <a href="#" onClick={handleExportPlayers} className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:translate-x-1 p-2 hover:bg-primary/5 rounded-md -mx-2">
            <Download className="mr-2 h-4 w-4" /> {loadingExportPlayers ? "..." : t("player_list")}
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
