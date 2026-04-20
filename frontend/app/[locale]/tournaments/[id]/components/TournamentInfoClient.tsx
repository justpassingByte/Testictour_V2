"use client"

import { ITournament } from '@/app/types/tournament'
import { useTournamentStore } from '@/app/stores/tournamentStore'
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ShieldCheck, Lock, Copy, Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import api from "@/app/lib/apiConfig"

interface TournamentInfoClientProps {
  initialTournament: ITournament;
}

export default function TournamentInfoClient({ initialTournament }: TournamentInfoClientProps) {
  const t = useTranslations("common")
  const currentTournament = useTournamentStore(state => state.currentTournament)
  
  const tournament = currentTournament?.id === initialTournament.id ? currentTournament : initialTournament

  const statusMapping: Record<string, { text: string; color: string }> = {
    pending:     { text: t("upcoming"),   color: "bg-yellow-500/20 text-yellow-500" },
    UPCOMING:    { text: t("upcoming"),   color: "bg-yellow-500/20 text-yellow-500" },
    in_progress: { text: t("ongoing"),    color: "bg-primary/20 text-primary animate-pulse-subtle" },
    completed:   { text: t("finished"),   color: "bg-muted text-muted-foreground" },
    COMPLETED:   { text: t("finished"),   color: "bg-muted text-muted-foreground" },
  }
  const currentStatus = statusMapping[tournament.status] || { text: tournament.status, color: "" }

  const [copiedId, setCopiedId] = useState(false)
  const searchParams = useSearchParams()

  // Confirm Sepay PG payment when redirected back with ?paymentSuccess=true
  useEffect(() => {
    const paymentSuccess = searchParams.get('paymentSuccess')
    if (paymentSuccess === 'true') {
      api.post(`/payments/confirm-pending/${tournament.id}`, {})
        .then(() => {
          toast.success('Payment confirmed! Your registration is complete.')
        })
        .catch(() => {
          // Payment might already be confirmed, still show success to user
          toast.success('Registration complete!')
        })
        .finally(() => {
          // Clean URL params
          const url = new URL(window.location.href)
          url.searchParams.delete('paymentSuccess')
          window.history.replaceState({}, '', url.toString())
        })
    }
  }, [])

  const handleCopyId = () => {
    navigator.clipboard.writeText(`Tournament ID: ${tournament.id}`)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold flex items-center gap-2 group">
          {tournament.name}
          <button 
            onClick={handleCopyId}
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white"
            title="Copy Tournament ID for Support"
          >
            {copiedId ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
          </button>
        </h1>
        <Badge variant="outline" className={`${currentStatus.color} capitalize`}>
          {currentStatus.text}
        </Badge>
        {tournament.isCommunityMode ? (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
            <AlertTriangle className="mr-1 h-3 w-3 inline mb-0.5" />
            {t("community_mode") || "Community Mode"}
          </Badge>
        ) : tournament.organizer?.partnerSubscription?.plan === 'PRO' || tournament.organizer?.partnerSubscription?.plan === 'ENTERPRISE' ? (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <ShieldCheck className="mr-1 h-3 w-3 inline mb-0.5" />
            Trusted Partner
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <ShieldCheck className="mr-1 h-3 w-3 inline mb-0.5" />
            {t("escrow_secured") || "Escrow Secured"}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground">{tournament.description}</p>
      
      {tournament.isCommunityMode ? (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-md p-4 mt-2 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-orange-500 font-medium mb-1">{t("community_tournament_notice")}</h4>
              <p className="text-sm text-orange-500/80">{t("this_tournament_is_operating_in_communit_desc")}</p>
            </div>
          </div>
        </div>
      ) : tournament.organizer?.partnerSubscription?.plan === 'PRO' || tournament.organizer?.partnerSubscription?.plan === 'ENTERPRISE' ? null : (
        <div className={`border rounded-xl p-4 mt-2 mb-6 flex items-start shadow-sm transition-colors ${
          tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released' 
            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10'
            : 'bg-yellow-500/10 border-yellow-500/30 shadow-yellow-500/10'
        }`}>
          {tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released' ? (
            <Lock className="h-6 w-6 text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
          )}
          <div>
            <h4 className={`font-semibold text-base mb-1 ${
              tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released' 
                ? 'text-emerald-400' : 'text-yellow-500'
            }`}>
              {tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released' 
                ? (t("prize_pool_locked") || "Prize Pool Fully Locked")
                : (t("prize_pool_pending") || "Funding Pending")}
            </h4>
            <p className={`text-sm ${
              tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released' 
                ? 'text-emerald-500/80' : 'text-yellow-500/80'
            }`}>
              {tournament.escrowStatus === 'locked' || tournament.escrowStatus === 'payout_released'
                ? (t("prize_pool_locked_desc") || "The total prize pool has been deposited into Escrow and successfully locked by the platform.")
                : (t("prize_pool_pending_desc") || "The tournament organizer is currently in the process of funding the Escrow requirements.")}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
