"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { IPhase } from "@/app/types/tournament"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhaseNavProps {
  tournamentId: string
  phases: IPhase[]
  currentPhaseNumber: number
}

type PhaseSection = "standings" | "lobbies" | "rules"

function getActiveSection(pathname: string): PhaseSection {
  if (pathname.includes("/standings")) return "standings"
  if (pathname.includes("/rules")) return "rules"
  return "lobbies"
}

export function PhaseNav({ tournamentId, phases, currentPhaseNumber }: PhaseNavProps) {
  const t = useTranslations("common")
  const pathname = usePathname()
  const activeSection = getActiveSection(pathname)

  const sections: { key: PhaseSection; label: string; href: (n: number) => string }[] = [
    { key: "standings", label: t("current_standings"), href: (n) => `/tournaments/${tournamentId}/phases/${n}/standings` },
    { key: "lobbies", label: t("group_bracket_tab"), href: (n) => `/tournaments/${tournamentId}/phases/${n}/lobbies` },
    { key: "rules", label: t("rules"), href: (n) => `/tournaments/${tournamentId}/phases/${n}/rules` },
  ]

  return (
    <div className="space-y-4">
      {/* Phase switcher — APAC TFT Day 1 / Day 2 style */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {phases.map((phase) => {
          const isActive = phase.phaseNumber === currentPhaseNumber
          const isLive = phase.status === "in_progress" || phase.status === "PLAYING"
          const targetHref = `/tournaments/${tournamentId}/phases/${phase.phaseNumber}/${activeSection}`

          return (
            <Link
              key={phase.id}
              href={targetHref}
              className={cn(
                "relative shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.12)]"
                  : "bg-card/40 text-muted-foreground border-white/10 hover:bg-card/70 hover:text-foreground hover:border-white/20"
              )}
            >
              <span>{t("stage_n", { number: phase.phaseNumber })}</span>
              {isLive && (
                <Badge className="h-5 px-1.5 bg-red-500/15 text-red-400 border-red-500/30 text-[9px] font-bold animate-pulse flex gap-1 items-center">
                  <Activity className="h-2.5 w-2.5" />
                  {t("live")}
                </Badge>
              )}
            </Link>
          )
        })}
      </div>

      {/* Section nav — Standings | Lobbies | Rules */}
      <div className="border-b border-white/10">
        <nav className="flex gap-6 overflow-x-auto">
          {sections.map((section) => {
            const href = section.href(currentPhaseNumber)
            const isActive = activeSection === section.key

            return (
              <Link
                key={section.key}
                href={href}
                className={cn(
                  "pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {section.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
