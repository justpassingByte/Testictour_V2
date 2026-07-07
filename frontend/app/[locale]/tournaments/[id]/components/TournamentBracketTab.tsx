"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BracketData } from "./bracket/bracket-shared"
import { BracketTabSkeleton } from "./TabSkeletons"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

interface TournamentBracketTabProps {
  tournamentId: string
  phaseNumber?: number
}

function resolveActivePhaseNumber(bracket: BracketData | null): number {
  if (!bracket?.phases?.length) return 1
  const live = bracket.phases.find((p) => p.status === "in_progress" || p.status === "PLAYING")
  if (live) return live.phaseNumber
  const completed = [...bracket.phases].reverse().find((p) => p.status === "completed")
  return completed?.phaseNumber ?? bracket.phases[0].phaseNumber
}

/** Live page embed — links to full phase bracket page */
export function TournamentBracketTab({ tournamentId, phaseNumber }: TournamentBracketTabProps) {
  const t = useTranslations("common")

  const { data: bracketResponse, isLoading } = useQuery({
    queryKey: ["tournament-bracket", tournamentId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/bracket`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 5000,
  })

  const bracket: BracketData | null = bracketResponse?.success ? bracketResponse : null
  const activePhase = phaseNumber ?? resolveActivePhaseNumber(bracket)

  if (isLoading) return <BracketTabSkeleton />

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 rounded-xl border border-white/10 bg-muted/10">
      <LayoutGrid className="h-10 w-10 text-primary/60" />
      <p className="text-sm text-muted-foreground max-w-sm">{t("bracket_moved_to_phase_page")}</p>
      <Link href={`/tournaments/${tournamentId}/phases/${activePhase}/lobbies`}>
        <Button variant="default" size="sm" className="gap-2 text-xs h-9">
          <ExternalLink className="h-3.5 w-3.5" />
          {t("view_full_bracket")}
        </Button>
      </Link>
    </div>
  )
}
