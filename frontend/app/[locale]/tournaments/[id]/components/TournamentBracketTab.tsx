"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Users, Swords, CircleUser, LayoutGrid, Info, Loader2,
  ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Activity, ArrowRight,
  Eye, Trophy
} from "lucide-react"
import NextLink from "next/link"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// ── Interfaces ──────────────────────────────────────────

interface BracketPlayer {
  id: string;
  username: string;
  riotGameName?: string;
  riotGameTag?: string;
  rank?: string;
  placement?: number;
  points?: number;
}

interface BracketLobby {
  id: string;
  name: string;
  state?: string;
  fetchedResult?: boolean;
  players: BracketPlayer[];
  roundId?: string; // Real round ID for this group (A→round1, B→round2, etc.)
}

interface BracketGroup {
  id: string;
  name: string;
  groupLetter: string;
  groupNumber: number;
  status: string;
  startTime?: string;
  endTime?: string;
  lobbies: BracketLobby[];
}

interface BracketPhase {
  id: string;
  name: string;
  phaseNumber: number;
  status: string;
  type: string;
  groups: BracketGroup[];
}

interface BracketData {
  tournamentId: string;
  phases: BracketPhase[];
}

interface TournamentBracketTabProps {
  tournamentId: string;
}

// ── Helpers ─────────────────────────────────────────────

/** Extract group letter from lobby name like "[A] Lobby 1" → "A" */
function extractGroupLetter(lobbyName: string): string {
  const m = lobbyName.match(/\[(\w+)\]/)
  return m ? m[1] : ''
}

/** Extract real lobby ID from virtual "abc_m0" → "abc" */
function getRealLobbyId(virtualId: string): string {
  const m = virtualId.match(/^(.+?)_m\d+$/)
  return m ? m[1] : virtualId
}

/** State → color class */
function getStateColor(state?: string) {
  const s = (state || '').toUpperCase()
  if (s === 'PLAYING' || s === 'IN_PROGRESS') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (s === 'FINISHED' || s === 'COMPLETED') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
}

// ── Main Component ──────────────────────────────────────

export function TournamentBracketTab({ tournamentId }: TournamentBracketTabProps) {
  const t = useTranslations("common")
  const [bracket, setBracket] = useState<BracketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-phase: which match tab is active (index into phase.groups for multi-match)
  const [activeMatchIdx, setActiveMatchIdx] = useState<Record<string, number>>({})
  // Per-match: which group letter is expanded
  const [activeGroup, setActiveGroup] = useState<Record<string, string | null>>({})
  // For non-multi-match: which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const getStateLabel = useCallback((state?: string) => {
    const s = (state || '').toUpperCase()
    if (s === 'PLAYING' || s === 'IN_PROGRESS') return t('group_status_playing')
    if (s === 'FINISHED' || s === 'COMPLETED') return t('group_status_finished')
    return t('group_status_waiting')
  }, [t])

  // ── Data fetching ──

  const fetchBracket = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/bracket`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success) setBracket(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => { fetchBracket() }, [fetchBracket])

  useEffect(() => {
    const handler = () => fetchBracket()
    window.addEventListener('bracket_update', handler)
    return () => window.removeEventListener('bracket_update', handler)
  }, [fetchBracket])

  // ── Detect multi-match phases ──

  const isMultiMatchPhase = useCallback((phase: BracketPhase) => {
    return phase.groups.length > 0 && String(phase.groups[0].groupLetter || '').startsWith('Vòng')
  }, [])

  // ── Group lobbies by group letter for a given match ──

  const getGroupsFromLobbies = useCallback((lobbies: BracketLobby[]) => {
    const groups: Record<string, { lobbies: BracketLobby[], roundId?: string }> = {}
    lobbies.forEach(lobby => {
      const letter = extractGroupLetter(lobby.name)
      if (!letter) return
      if (!groups[letter]) groups[letter] = { lobbies: [], roundId: lobby.roundId }
      groups[letter].lobbies.push(lobby)
      // Prefer non-undefined roundId
      if (lobby.roundId && !groups[letter].roundId) groups[letter].roundId = lobby.roundId
    })
    return groups
  }, [])

  // ── Loading / Error / Empty states ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !bracket) {
    return (
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="p-8 text-center">
          <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">{t('no_groups_available')}</p>
          <p className="text-xs text-muted-foreground/50 mt-2">{t('bracket_not_ready')}</p>
        </CardContent>
      </Card>
    )
  }

  const hasAnyGroups = bracket.phases.some(p => p.groups.length > 0)
  if (!hasAnyGroups) {
    return (
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
        <CardContent className="p-8 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">{t('no_groups_available')}</p>
        </CardContent>
      </Card>
    )
  }

  // ── Render ──

  return (
    <div className="space-y-8">
      {bracket.phases.map((phase) => {
        const isMultiMatch = isMultiMatchPhase(phase)
        const matchIdx = activeMatchIdx[phase.id] ?? 0
        const currentMatch = phase.groups[matchIdx]

        return (
          <div key={phase.id} className="space-y-5">
            {/* ═══ Phase Header ═══ */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-primary/30" />
              <h3 className="text-xl font-bold tracking-tight">
                {t('stage_n', { number: phase.phaseNumber })}: {phase.name}
              </h3>
              {(phase.status === 'in_progress' || phase.status === 'PLAYING') ? (
                <Badge className="ml-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold animate-pulse border-red-500/50 flex gap-1 items-center">
                  <Activity className="h-3 w-3" /> {t("live")}
                </Badge>
              ) : (
                <Badge variant="outline" className={`ml-2 ${getStateColor(phase.status)} text-xs capitalize`}>
                  {getStateLabel(phase.status)}
                </Badge>
              )}
            </div>

            {phase.groups.reduce((acc, g) => acc + g.lobbies.length, 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-black/10 rounded-xl border border-white/5">
                <ShieldAlert className="h-10 w-10 mb-3 opacity-20" />
                <p className="font-medium text-sm">Chưa có bảng đấu nào được gán</p>
                <p className="text-xs opacity-60 mt-1">Ban tổ chức sẽ chia bảng và gán người chơi trước khi bắt đầu trận đấu.</p>
              </div>
            ) : isMultiMatch ? (
              <MultiMatchView
                phase={phase}
                matchIdx={matchIdx}
                setMatchIdx={(idx) => setActiveMatchIdx(prev => ({ ...prev, [phase.id]: idx }))}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                getGroupsFromLobbies={getGroupsFromLobbies}
                getStateLabel={getStateLabel}
                tournamentId={tournamentId}
                t={t}
              />
            ) : (
              <RegularGroupsView
                phase={phase}
                expandedGroups={expandedGroups}
                toggleGroup={(id) => setExpandedGroups(prev => ({ [id]: prev[id] ? false : true }))}
                getStateLabel={getStateLabel}
                tournamentId={tournamentId}
                t={t}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Multi-Match View (Match 1 → Match 2 → Match 3)
// Within each match: Group A, B, C, D with expand + navigate
// ══════════════════════════════════════════════════════════

interface MultiMatchViewProps {
  phase: BracketPhase
  matchIdx: number
  setMatchIdx: (idx: number) => void
  activeGroup: Record<string, string | null>
  setActiveGroup: (fn: (prev: Record<string, string | null>) => Record<string, string | null>) => void
  getGroupsFromLobbies: (lobbies: BracketLobby[]) => Record<string, { lobbies: BracketLobby[], roundId?: string }>
  getStateLabel: (state?: string) => string
  tournamentId: string
  t: any
}

function MultiMatchView({
  phase, matchIdx, setMatchIdx, activeGroup, setActiveGroup,
  getGroupsFromLobbies, getStateLabel, tournamentId, t
}: MultiMatchViewProps) {
  const currentMatch = phase.groups[matchIdx]
  const groupsMap = currentMatch ? getGroupsFromLobbies(currentMatch.lobbies) : {}
  const groupLetters = Object.keys(groupsMap).sort()
  const groupKey = `${phase.id}_m${matchIdx}`
  const selectedGroupLetter = activeGroup[groupKey] ?? null

  return (
    <div className="space-y-5">
      {/* ── Match Flow Bar ── */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {phase.groups.map((match, idx) => {
          const totalPlayers = match.lobbies.reduce((s, l) => s + l.players.length, 0)
          const isActive = idx === matchIdx
          const isPlaying = match.status === 'in_progress' || match.status === 'PLAYING'

          return (
            <div key={`${match.id}_${idx}`} className="flex items-center gap-4 shrink-0">
              {idx > 0 && (
                <ArrowRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              )}
              <button
                onClick={() => setMatchIdx(idx)}
                className={`
                  relative flex flex-col items-center gap-1 px-6 py-3.5 rounded-xl text-sm font-semibold
                  transition-all duration-300 border min-w-[130px]
                  ${isActive
                    ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.2)] scale-[1.05] z-10'
                    : 'bg-card/40 text-muted-foreground border-white/5 hover:bg-card/80 hover:border-white/20 opacity-80 hover:opacity-100'
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5" />
                  <span>Match {idx + 1}</span>
                </div>
                <div className="text-lg font-bold">{totalPlayers}</div>
                <Badge variant="outline" className={`${getStateColor(match.status)} text-[9px] px-1.5 py-0`}>
                  {getStateLabel(match.status)}
                </Badge>
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse border-2 border-background" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Match Content ── */}
      {currentMatch && (
        <div className="space-y-4">
          {/* ── Group Tabs ── */}
          {groupLetters.length > 0 && (
            <Tabs 
              value={selectedGroupLetter || groupLetters[0]} 
              onValueChange={(val) => {
                setActiveGroup(prev => ({ ...prev, [groupKey]: val }))
              }}
              className="w-full"
            >
              <div className="border-b border-white/10 mb-6 w-full">
                <TabsList className="w-full justify-start h-auto bg-transparent p-0 flex overflow-x-auto gap-6 scrollbar-thin">
                  {groupLetters.map(letter => {
                    const totalPlayers = groupsMap[letter].lobbies.reduce((s, l) => s + l.players.length, 0)
                    return (
                      <TabsTrigger
                        key={letter}
                        value={letter}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all shadow-none hover:text-primary/80 text-muted-foreground data-[state=active]:shadow-none whitespace-nowrap"
                      >
                        {t('group_n', { letter })}
                        <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary/80">
                          {totalPlayers}
                        </Badge>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              {groupLetters.map(letter => {
                const groupData = groupsMap[letter]
                const lobbies = groupData.lobbies
                const roundId = groupData.roundId
                const anyPlaying = lobbies.some(l => l.state === 'PLAYING' || l.state === 'IN_PROGRESS')
                const allFinished = lobbies.every(l => l.state === 'FINISHED' || l.state === 'COMPLETED')
                const status = allFinished ? 'completed' : anyPlaying ? 'in_progress' : 'pending'
                const detailHref = roundId
                  ? `/tournaments/${tournamentId}/rounds/${roundId}?limitMatch=${matchIdx + 1}`
                  : undefined

                return (
                  <TabsContent key={letter} value={letter} className="m-0 space-y-4 animate-fade-in-up">
                    {/* Header Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/20 border border-white/5 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span className="font-medium text-base">{t('group_n', { letter })}</span>
                          <Badge variant="outline" className={`${getStateColor(status)} text-[10px] uppercase font-bold ml-2`}>
                            {getStateLabel(status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{t('players_count_in_group', { count: lobbies.reduce((s, l) => s + l.players.length, 0) })}</span>
                          <span className="opacity-50">•</span>
                          <span>{t("lobbies")}: {lobbies.length}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-2">
                        {detailHref && (
                          <NextLink href={detailHref}>
                            <Button size="sm" className="btn-zodiac text-white font-semibold text-xs h-8 shadow-md">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              {t('view_detail')}
                            </Button>
                          </NextLink>
                        )}
                      </div>
                    </div>

                    {/* Lobbies Grid */}
                    {lobbies.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6 text-sm">{t('no_lobbies_in_group')}</p>
                    ) : (
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {lobbies.map((lobby, idx) => (
                          <LobbyCard
                            key={lobby.id}
                            lobby={lobby}
                            lobbyIndex={idx}
                            tournamentId={tournamentId}
                            getStateLabel={getStateLabel}
                            stripGroupPrefix
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Regular Groups View (no multi-match: Group A, B, C, D)
// ══════════════════════════════════════════════════════════

interface RegularGroupsViewProps {
  phase: BracketPhase
  expandedGroups: Record<string, boolean>
  toggleGroup: (id: string) => void
  getStateLabel: (state?: string) => string
  tournamentId: string
  t: any
}

function RegularGroupsView({
  phase, expandedGroups, toggleGroup, getStateLabel, tournamentId, t
}: RegularGroupsViewProps) {
  const getUniqueGroupId = (group: BracketGroup) => `${group.id}-${group.groupNumber || 0}`

  return (
    <div className="space-y-4">
      {/* Group selector tabs (only when multiple groups) */}
      {phase.groups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {phase.groups.map((group) => {
            const uniqueId = getUniqueGroupId(group)
            const isExpanded = expandedGroups[uniqueId]
            const totalPlayers = group.lobbies.reduce((s, l) => s + l.players.length, 0)
            const isVirtualMatch = String(group.groupLetter || '').includes('Trận') || String(group.groupLetter || '').includes('Match')

            return (
              <button
                key={uniqueId}
                onClick={() => toggleGroup(uniqueId)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-300 border
                  ${isExpanded
                    ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/10 scale-[1.02]'
                    : 'bg-card/60 text-muted-foreground border-white/10 hover:bg-card/80 hover:text-foreground hover:border-white/20'
                  }
                `}
              >
                <Swords className="h-4 w-4" />
                <span>{isVirtualMatch ? group.groupLetter : t('group_n', { letter: group.groupLetter })}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-4 ${isExpanded ? 'bg-primary/30' : 'bg-muted/50'}`}
                >
                  {totalPlayers}
                </Badge>
                <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-background
                  ${group.status === 'in_progress' ? 'bg-emerald-500 animate-pulse' : ''}
                  ${group.status === 'completed' ? 'bg-blue-500' : ''}
                  ${group.status === 'pending' ? 'bg-amber-500' : ''}
                `} />
              </button>
            )
          })}
        </div>
      )}

      {/* Group content */}
      {phase.groups.map((group) => {
        const uniqueId = getUniqueGroupId(group)
        if (phase.groups.length > 1 && !expandedGroups[uniqueId]) return null
        const isVirtualMatch = String(group.groupLetter || '').includes('Trận') || String(group.groupLetter || '').includes('Match')

        return (
          <div key={uniqueId} className="space-y-3 animate-fade-in-up">
            {/* Group info banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/20 border border-white/5 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium text-base">
                    {isVirtualMatch ? group.groupLetter : t('group_n', { letter: group.groupLetter })}
                  </span>
                  <Badge variant="outline" className={`${getStateColor(group.status)} text-[10px] uppercase font-bold ml-2`}>
                    {getStateLabel(group.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{t('players_count_in_group', { count: group.lobbies.reduce((s, l) => s + l.players.length, 0) })}</span>
                  <span className="opacity-50">•</span>
                  <span>{t("lobbies")}: {group.lobbies.length}</span>
                  {group.startTime && (
                    <>
                      <span className="opacity-50">•</span>
                      <span>{t("start")}: {new Date(group.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2">
                {(() => {
                  const isPending = group.status === "pending" || group.status === "WAITING"
                  if (isVirtualMatch && isPending) {
                    return (
                      <Button size="sm" variant="secondary" disabled className="text-white font-semibold text-xs h-8 shadow-md opacity-50">
                        {t("waiting")}
                      </Button>
                    )
                  }

                  let href = `/tournaments/${tournamentId}/rounds/${group.id}`
                  if (isVirtualMatch) {
                    const matchNum = String(group.groupLetter || '').match(/\d+/)
                    if (matchNum) href += `?limitMatch=${matchNum[0]}`
                  }

                  return (
                    <NextLink href={href}>
                      <Button size="sm" variant={isPending ? "secondary" : "default"} className="btn-zodiac text-white font-semibold text-xs h-8 shadow-md">
                        {group.status === "completed" || group.status === "FINISHED" ? t("view_all_results")
                          : group.status === "in_progress" || group.status === "PLAYING" ? t("live_scoreboard")
                            : t("view_all_details")}
                      </Button>
                    </NextLink>
                  )
                })()}
              </div>
            </div>

            {/* Lobby grid */}
            {group.lobbies.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">{t('no_lobbies_in_group')}</p>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {group.lobbies.map((lobby, lobbyIndex) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    lobbyIndex={lobbyIndex}
                    tournamentId={tournamentId}
                    getStateLabel={getStateLabel}
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


// ══════════════════════════════════════════════════════════
// Lobby Card (reusable)
// ══════════════════════════════════════════════════════════

interface LobbyCardProps {
  lobby: BracketLobby
  lobbyIndex: number
  tournamentId: string
  getStateLabel: (state?: string) => string
  stripGroupPrefix?: boolean
}

function LobbyCard({ lobby, lobbyIndex, tournamentId, getStateLabel, stripGroupPrefix }: LobbyCardProps) {
  const displayName = stripGroupPrefix ? lobby.name.replace(/\[\w+\]\s*/, '') : lobby.name
  const realId = getRealLobbyId(lobby.id)
  const lobbyHref = `/tournaments/${tournamentId}/lobbies/${realId}`

  return (
    <NextLink href={lobbyHref}>
      <Card
        className={`
          overflow-hidden transition-all duration-300 cursor-pointer
          hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5
          bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10
          ${lobby.state === 'PLAYING' ? 'ring-1 ring-emerald-500/30' : ''}
          ${lobby.state === 'FINISHED' ? 'opacity-80' : ''}
          animate-fade-in-up
        `}
        style={{ animationDelay: `${lobbyIndex * 50}ms` }}
      >
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            {displayName}
          </CardTitle>
          <Badge variant="outline" className={`${getStateColor(lobby.state)} text-[10px] px-1.5`}>
            {getStateLabel(lobby.state)}
          </Badge>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1.5">
            {lobby.players.slice(0, 4).map((player, playerIndex) => (
              <div
                key={player.id}
                className="flex items-center gap-2.5 p-1.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="relative">
                  <CircleUser className="h-6 w-6 text-muted-foreground" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[7px] font-bold bg-primary/80 text-primary-foreground rounded-full w-3 h-3 flex items-center justify-center">
                    {playerIndex + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {player.riotGameName || player.username}
                  </div>
                  {player.riotGameTag && (
                    <div className="text-[9px] text-muted-foreground truncate">
                      #{player.riotGameTag}
                    </div>
                  )}
                </div>
                {player.rank && (
                  <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 shrink-0 bg-primary/10 text-primary/80">
                    {player.rank}
                  </Badge>
                )}
              </div>
            ))}
            {lobby.players.length > 4 && (
              <div className="text-[10px] text-muted-foreground/50 text-center pt-1">
                +{lobby.players.length - 4} more players
              </div>
            )}
            {lobby.players.length === 0 && (
              <div className="text-[10px] text-muted-foreground/50 text-center py-2">
                No players assigned
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </NextLink>
  )
}
