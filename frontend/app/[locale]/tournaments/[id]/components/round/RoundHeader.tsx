"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ITournament, IRound } from "@/app/types/tournament"
import { SyncStatus } from "@/components/sync-status"
import { useTranslations } from "next-intl"

interface RoundHeaderProps {
  tournament: ITournament | null
  round: IRound | null
  limitMatch?: number | null
}

export function RoundHeader({ tournament, round, limitMatch }: RoundHeaderProps) {
  const t = useTranslations("common")

  if (!tournament || !round) return null

  // If the round has a specific custom name like "Group A", we can display it. 
  // Otherwise default to "Match/Round N Results". For parallel groups, roundNumber is used to derive Group A, B, C, D.
  let title = "";
  if (limitMatch && limitMatch > 0) {
    title = t("round_n_results", { number: limitMatch });
  } else {
    // If it's a phase with multiple parallel groups (or just standard display)
    // We can infer the Group Letter from the roundNumber (1 -> A, 2 -> B, etc.)
    const groupLetter = String.fromCharCode(64 + round.roundNumber);
    title = t('group_results_title', { name: groupLetter });
  }

  return (
    <>
      <div className="flex flex-col space-y-1 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/">{t("home")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tournaments">{t("tournaments")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/tournaments/${tournament.id}`}>{tournament.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <SyncStatus status="idle" />
      </div>

      <div className="mt-6 flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          {tournament.name} • {round.status === "completed" ? t("completed") : t("in_progress")}
        </p>
      </div>
    </>
  )
} 