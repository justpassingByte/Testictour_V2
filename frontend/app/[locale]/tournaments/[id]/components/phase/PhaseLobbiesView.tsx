"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import NextLink from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, Swords, LayoutGrid, Info, ShieldCheck, ShieldAlert,
  Activity, ArrowRight, Eye, Trophy,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { BracketTabSkeleton } from "../TabSkeletons"
import {
  BracketPhase,
  BracketData,
  LobbyCard,
  getStateColor,
  isMultiMatchPhase,
  getGroupsFromLobbies,
} from "../bracket/bracket-shared"
import { LOBBY_GRID_CLASS } from "./phase-export"
import { PhaseLobbiesToolbar } from "./PhaseLobbiesToolbar"
import { ITournament, IPhase } from "@/app/types/tournament"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

interface PhaseLobbiesViewProps {
  tournamentId: string
  phaseNumber: number
  tournament: ITournament
  phase: IPhase
}

export function PhaseLobbiesView({
  tournamentId,
  phaseNumber,
  tournament,
  phase: phaseMeta,
}: PhaseLobbiesViewProps) {
  const t = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [exportMode, setExportMode] = useState(false)

  const { data: bracketResponse, isLoading, error: queryError } = useQuery({
    queryKey: ["tournament-bracket", tournamentId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/bracket`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 5000,
  })

  const bracket: BracketData | null = bracketResponse?.success ? bracketResponse : null
  const phase = bracket?.phases.find((p) => p.phaseNumber === phaseNumber) ?? null

  const matchFromUrl = parseInt(searchParams.get("match") || "1", 10) - 1
  const groupFromUrl = searchParams.get("group") || ""

  const getStateLabel = useCallback((state?: string) => {
    const s = (state || "").toUpperCase()
    if (s === "PLAYING" || s === "IN_PROGRESS") return t("group_status_playing")
    if (s === "FINISHED" || s === "COMPLETED") return t("group_status_finished")
    return t("group_status_waiting")
  }, [t])

  const updateUrl = useCallback((match: number, group: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("match", String(match + 1))
    if (group) params.set("group", group)
    else params.delete("group")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  if (isLoading) return <BracketTabSkeleton />

  if (queryError || !bracket || !phase) {
    return (
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="p-8 text-center">
          <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">{t("no_groups_available")}</p>
          <p className="text-xs text-muted-foreground/50 mt-2">{t("bracket_not_ready")}</p>
        </CardContent>
      </Card>
    )
  }

  const hasGroups = phase.groups.length > 0 && phase.groups.some((g) => g.lobbies.length > 0)
  if (!hasGroups) {
    return (
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="p-8 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">{t("no_groups_available")}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Ban tổ chức sẽ chia bảng và gán người chơi trước khi bắt đầu trận đấu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const multiMatch = isMultiMatchPhase(phase)
  const safeMatchIdx = Math.min(Math.max(0, matchFromUrl), Math.max(0, phase.groups.length - 1))
  const currentMatch = phase.groups[safeMatchIdx]
  const groupsMap = currentMatch ? getGroupsFromLobbies(currentMatch.lobbies) : {}
  const groupLetters = Object.keys(groupsMap).sort()
  const selectedGroup = groupFromUrl && groupLetters.includes(groupFromUrl)
    ? groupFromUrl
    : groupLetters[0] || ""

  return (
    <div className="space-y-4">
      <PhaseLobbiesToolbar
        tournament={tournament}
        phase={phaseMeta}
        onExportBracketStart={() => setExportMode(true)}
        onExportBracketEnd={() => setExportMode(false)}
      />

      <div
        id="bracket-export-target"
        className={`space-y-6 ${exportMode ? "p-6 bg-[#0f172a]/95 rounded-xl border border-white/10" : ""}`}
      >
        {exportMode && (
          <ExportBanner tournament={tournament} phase={phaseMeta} />
        )}

      {multiMatch ? (
        <MultiMatchLobbies
          phase={phase}
          matchIdx={safeMatchIdx}
          selectedGroup={selectedGroup}
          groupLetters={groupLetters}
          groupsMap={groupsMap}
          tournamentId={tournamentId}
          getStateLabel={getStateLabel}
          exportMode={exportMode}
          onMatchChange={(idx) => updateUrl(idx, groupLetters[0] || "")}
          onGroupChange={(letter) => updateUrl(safeMatchIdx, letter)}
          t={t}
        />
      ) : (
        <RegularPhaseLobbies
          phase={phase}
          tournamentId={tournamentId}
          getStateLabel={getStateLabel}
          exportMode={exportMode}
          t={t}
        />
      )}
      </div>
    </div>
  )
}

function ExportBanner({ tournament, phase }: { tournament: ITournament; phase: IPhase }) {
  return (
    <div className="relative w-full h-[200px] rounded-xl overflow-hidden mb-8 border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-indigo-900/40">
        {tournament.image ? (
          <img
            src={tournament.image.startsWith("http") ? tournament.image : `${BACKEND_URL}${tournament.image}`}
            alt="Banner"
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" />
      </div>
      <div className="absolute bottom-6 left-8 flex flex-col gap-2">
        <Badge className="w-fit bg-primary/20 text-primary border-primary/30 uppercase font-bold tracking-widest text-xs px-3 py-1">
          {tournament.game || "TFT"}
        </Badge>
        <h2 className="text-2xl font-black text-white">{tournament.name}</h2>
        <p className="text-sm text-slate-300 font-medium">
          Stage {phase.phaseNumber}: {phase.name}
        </p>
        {tournament.prizeStructure && Object.keys(tournament.prizeStructure).length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/20 text-xs font-bold">
            <Trophy className="w-3.5 h-3.5" />
            PRIZE POOL
          </div>
        )}
      </div>
    </div>
  )
}

interface MultiMatchLobbiesProps {
  phase: BracketPhase
  matchIdx: number
  selectedGroup: string
  groupLetters: string[]
  groupsMap: Record<string, { lobbies: any[]; roundId?: string }>
  tournamentId: string
  getStateLabel: (s?: string) => string
  exportMode: boolean
  onMatchChange: (idx: number) => void
  onGroupChange: (letter: string) => void
  t: any
}

function MultiMatchLobbies({
  phase, matchIdx, selectedGroup, groupLetters, groupsMap,
  tournamentId, getStateLabel, exportMode, onMatchChange, onGroupChange, t,
}: MultiMatchLobbiesProps) {
  if (exportMode) {
    return (
      <div className="space-y-10">
        {phase.groups.map((match, mIdx) => {
          const mGroups = getGroupsFromLobbies(match.lobbies)
          return (
            <div key={`${match.id}_${mIdx}`} className="space-y-6">
              <MatchPillBar
                groups={phase.groups}
                activeIdx={mIdx}
                onSelect={() => {}}
                getStateLabel={getStateLabel}
                readOnly
              />
              {Object.keys(mGroups).sort().map((letter) => (
                <GroupSection
                  key={letter}
                  letter={letter}
                  lobbies={mGroups[letter].lobbies}
                  roundId={mGroups[letter].roundId}
                  matchIdx={mIdx}
                  tournamentId={tournamentId}
                  getStateLabel={getStateLabel}
                  exportMode
                  t={t}
                />
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  const groupData = groupsMap[selectedGroup]
  const lobbies = groupData?.lobbies ?? []
  const roundId = groupData?.roundId

  return (
    <div className="space-y-6">
      <MatchPillBar
        groups={phase.groups}
        activeIdx={matchIdx}
        onSelect={onMatchChange}
        getStateLabel={getStateLabel}
      />

      {groupLetters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groupLetters.map((letter) => {
            const count = groupsMap[letter].lobbies.reduce((s, l) => s + l.players.length, 0)
            const isActive = letter === selectedGroup
            return (
              <button
                key={letter}
                onClick={() => onGroupChange(letter)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all
                  ${isActive
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-card/50 text-muted-foreground border-white/10 hover:border-white/25 hover:text-foreground"
                  }
                `}
              >
                {t("group_n", { letter })}
                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary/10 text-primary/80">
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      <GroupSection
        letter={selectedGroup}
        lobbies={lobbies}
        roundId={roundId}
        matchIdx={matchIdx}
        tournamentId={tournamentId}
        getStateLabel={getStateLabel}
        exportMode={false}
        t={t}
      />
    </div>
  )
}

function MatchPillBar({
  groups, activeIdx, onSelect, getStateLabel, readOnly,
}: {
  groups: BracketPhase["groups"]
  activeIdx: number
  onSelect: (idx: number) => void
  getStateLabel: (s?: string) => string
  readOnly?: boolean
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {groups.map((match, idx) => {
        const totalPlayers = match.lobbies.reduce((s, l) => s + l.players.length, 0)
        const isActive = idx === activeIdx
        const isPlaying = match.status === "in_progress" || match.status === "PLAYING"

        return (
          <div key={`${match.id}_${idx}`} className="flex items-center gap-3 shrink-0">
            {idx > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground/40" />}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onSelect(idx)}
              className={`
                relative flex flex-col items-center gap-1 px-5 py-3 rounded-xl text-sm font-semibold border min-w-[120px]
                transition-all duration-200
                ${isActive
                  ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_12px_rgba(var(--primary),0.15)]"
                  : "bg-card/40 text-muted-foreground border-white/10 hover:bg-card/70"
                }
                ${readOnly ? "cursor-default" : "cursor-pointer"}
              `}
            >
              <div className="flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5" />
                <span>Match {idx + 1}</span>
              </div>
              <span className="text-lg font-bold">{totalPlayers}</span>
              <Badge variant="outline" className={`${getStateColor(match.status)} text-[9px] px-1.5 py-0`}>
                {getStateLabel(match.status)}
              </Badge>
              {isPlaying && !readOnly && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-background" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function GroupSection({
  letter, lobbies, roundId, matchIdx, tournamentId, getStateLabel, exportMode, t,
}: {
  letter: string
  lobbies: any[]
  roundId?: string
  matchIdx: number
  tournamentId: string
  getStateLabel: (s?: string) => string
  exportMode: boolean
  t: any
}) {
  const anyPlaying = lobbies.some((l) => l.state === "PLAYING" || l.state === "IN_PROGRESS")
  const allFinished = lobbies.length > 0 && lobbies.every((l) => l.state === "FINISHED" || l.state === "COMPLETED")
  const status = allFinished ? "completed" : anyPlaying ? "in_progress" : "pending"
  const detailHref = roundId
    ? `/tournaments/${tournamentId}/rounds/${roundId}?limitMatch=${matchIdx + 1}`
    : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-semibold text-base">{t("group_n", { letter })}</span>
            <Badge variant="outline" className={`${getStateColor(status)} text-[10px] uppercase font-bold`}>
              {getStateLabel(status)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{t("players_count_in_group", { count: lobbies.reduce((s, l) => s + l.players.length, 0) })}</span>
            <span className="opacity-50">•</span>
            <span>{t("lobbies")}: {lobbies.length}</span>
          </div>
        </div>
        {detailHref && (
          <NextLink href={detailHref}>
            <Button size="sm" className="text-xs h-8 font-semibold">
              <Eye className="h-3.5 w-3.5 mr-1" />
              {t("view_detail")}
            </Button>
          </NextLink>
        )}
      </div>

      {lobbies.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">{t("no_lobbies_in_group")}</p>
      ) : (
        <div className={LOBBY_GRID_CLASS}>
          {lobbies.map((lobby, idx) => (
            <LobbyCard
              key={lobby.id}
              lobby={lobby}
              lobbyIndex={idx}
              tournamentId={tournamentId}
              getStateLabel={getStateLabel}
              stripGroupPrefix
              exportMode={exportMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RegularPhaseLobbies({
  phase, tournamentId, getStateLabel, exportMode, t,
}: {
  phase: BracketPhase
  tournamentId: string
  getStateLabel: (s?: string) => string
  exportMode: boolean
  t: any
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    phase.groups.length === 1 ? `${phase.groups[0].id}-${phase.groups[0].groupNumber || 0}` : null
  )

  return (
    <div className="space-y-6">
      {phase.groups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {phase.groups.map((group) => {
            const uniqueId = `${group.id}-${group.groupNumber || 0}`
            const isExpanded = exportMode || expandedId === uniqueId
            const totalPlayers = group.lobbies.reduce((s, l) => s + l.players.length, 0)
            const isVirtualMatch =
              String(group.groupLetter || "").includes("Trận") ||
              String(group.groupLetter || "").includes("Match")

            return (
              <button
                key={uniqueId}
                type="button"
                onClick={() => setExpandedId(expandedId === uniqueId ? null : uniqueId)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all
                  ${isExpanded
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-card/50 text-muted-foreground border-white/10 hover:border-white/25"
                  }
                `}
              >
                <Swords className="h-4 w-4" />
                <span>{isVirtualMatch ? group.groupLetter : t("group_n", { letter: group.groupLetter })}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{totalPlayers}</Badge>
              </button>
            )
          })}
        </div>
      )}

      {phase.groups.map((group) => {
        const uniqueId = `${group.id}-${group.groupNumber || 0}`
        if (!exportMode && phase.groups.length > 1 && expandedId !== uniqueId) return null

        const isVirtualMatch =
          String(group.groupLetter || "").includes("Trận") ||
          String(group.groupLetter || "").includes("Match")

        let href = `/tournaments/${tournamentId}/rounds/${group.id}`
        if (isVirtualMatch) {
          const matchNum = String(group.groupLetter || "").match(/\d+/)
          if (matchNum) href += `?limitMatch=${matchNum[0]}`
        }

        return (
          <div key={uniqueId} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {isVirtualMatch ? group.groupLetter : t("group_n", { letter: group.groupLetter })}
                  </span>
                  <Badge variant="outline" className={`${getStateColor(group.status)} text-[10px] uppercase font-bold`}>
                    {getStateLabel(group.status)}
                  </Badge>
                  {(group.status === "in_progress" || group.status === "PLAYING") && (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/50 text-[9px] animate-pulse">
                      <Activity className="h-2.5 w-2.5 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{t("players_count_in_group", { count: group.lobbies.reduce((s, l) => s + l.players.length, 0) })}</span>
                  <span className="opacity-50">•</span>
                  <span>{t("lobbies")}: {group.lobbies.length}</span>
                </div>
              </div>
              <NextLink href={href}>
                <Button size="sm" variant="default" className="text-xs h-8 font-semibold">
                  {group.status === "completed" || group.status === "FINISHED"
                    ? t("view_all_results")
                    : group.status === "in_progress" || group.status === "PLAYING"
                      ? t("live_scoreboard")
                      : t("view_all_details")}
                </Button>
              </NextLink>
            </div>

            {group.lobbies.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground bg-black/10 rounded-xl border border-white/5">
                <ShieldAlert className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">{t("no_lobbies_in_group")}</p>
              </div>
            ) : (
              <div className={LOBBY_GRID_CLASS}>
                {group.lobbies.map((lobby, idx) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    lobbyIndex={idx}
                    tournamentId={tournamentId}
                    getStateLabel={getStateLabel}
                    exportMode={exportMode}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
