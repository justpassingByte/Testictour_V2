"use client"

import { useState, useCallback, useMemo, memo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Users, Swords, CircleUser, LayoutGrid, Info, Loader2,
  ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Activity, ArrowRight,
  Eye, Trophy, Copy, Check
} from "lucide-react"
import NextLink from "next/link"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useQuery } from '@tanstack/react-query'
import { BracketTabSkeleton } from './TabSkeletons'

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
  return m ? m[1] : 'A'
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

  // ── React Query replaces manual fetch + window event listeners ──
  const { data: bracketResponse, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['tournament-bracket', tournamentId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/bracket`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 5000, // 5s guard against burst socket invalidations
  })
  const bracket: BracketData | null = bracketResponse?.success ? bracketResponse : null
  const error = queryError?.message ?? null
  
  // Per-phase: which match tab is active (index into phase.groups for multi-match)
  const [activeMatchIdx, setActiveMatchIdx] = useState<Record<string, number>>({})
  // Per-match: which group letter is expanded
  const [activeGroup, setActiveGroup] = useState<Record<string, string | null>>({})
  // For non-multi-match: which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  // For exporting all content
  const [exportMode, setExportMode] = useState(false)
  const [exportTournament, setExportTournament] = useState<any>(null)

  // Listen for export events dispatched from the sidebar
  useEffect(() => {
    const handleExportStart = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setExportTournament(detail?.tournament || null)
      setExportMode(true)
    }
    const handleExportEnd = () => {
      setExportMode(false)
    }
    window.addEventListener('export_bracket_start', handleExportStart)
    window.addEventListener('export_bracket_end', handleExportEnd)
    return () => {
      window.removeEventListener('export_bracket_start', handleExportStart)
      window.removeEventListener('export_bracket_end', handleExportEnd)
    }
  }, [])

  const getStateLabel = useCallback((state?: string) => {
    const s = (state || '').toUpperCase()
    if (s === 'PLAYING' || s === 'IN_PROGRESS') return t('group_status_playing')
    if (s === 'FINISHED' || s === 'COMPLETED') return t('group_status_finished')
    return t('group_status_waiting')
  }, [t])

  // ── Detect multi-match phases ──

  const isMultiMatchPhase = useCallback((phase: BracketPhase) => {
    return phase.groups.length > 0 && 
           (String(phase.groups[0].groupLetter || '').startsWith('Vòng') || 
            String(phase.groups[0].groupLetter || '').startsWith('Trận'))
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
    
    // Sort lobbies numerically (e.g., "[A] Lobby 1" comes before "[A] Lobby 2")
    Object.values(groups).forEach(g => {
      g.lobbies.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10)
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10)
        if (numA !== numB) return numA - numB
        return a.name.localeCompare(b.name)
      })
    })

    return groups
  }, [])

  // ── Loading / Error / Empty states ──

  if (loading) {
    return <BracketTabSkeleton />
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

  // ── Determine which phases to render ──
  const activePhase = bracket.phases.find(p => p.status === 'in_progress' || p.status === 'PLAYING') 
    || bracket.phases.slice().reverse().find(p => p.status === 'completed') 
    || bracket.phases[0];
  
  const phasesToRender = exportMode ? (activePhase ? [activePhase] : bracket.phases) : bracket.phases;

  // ── Render ──

  return (
    <div id="bracket-export-target" className={`space-y-8 ${exportMode ? 'p-6 bg-[#0f172a]/95 rounded-xl border border-white/10' : ''}`}>
      
      {/* ── Export Banner ── */}
      {exportMode && exportTournament && (
        <div className="relative w-full h-[240px] rounded-t-xl overflow-hidden mb-12 border-b border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-indigo-900/40">
            {exportTournament.image ? (
              <img 
                src={exportTournament.image.startsWith('http') ? exportTournament.image : `${BACKEND_URL}${exportTournament.image}`} 
                alt="Banner" 
                className="w-full h-full object-cover opacity-50" 
              />
            ) : (
              <div className="w-full h-full bg-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" />
            <div className="absolute inset-0 border border-white/5 rounded-xl pointer-events-none" />
          </div>

          <div className="absolute bottom-6 left-8 flex flex-col gap-3">
            <Badge className="w-fit bg-primary/20 text-primary border-primary/30 uppercase font-bold tracking-widest text-xs px-3 py-1 backdrop-blur-md">
              {exportTournament.game || "Game"}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg leading-tight">
              {exportTournament.name}
            </h1>
            <div className="flex items-center text-sm gap-4 mt-2">
              {exportTournament.startTime && (
                <div className="flex items-center gap-2 bg-black/40 text-slate-200 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-inner">
                  <span className="font-semibold">{new Date(exportTournament.startTime).toLocaleDateString()}</span>
                </div>
              )}
              {exportTournament.prizeStructure && Object.keys(exportTournament.prizeStructure).length > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full backdrop-blur-md border border-amber-500/20 shadow-inner">
                  <Trophy className="w-4 h-4" />
                  <span className="font-bold tracking-wider text-xs">PRIZE POOL</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {phasesToRender.map((phase) => {
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
                exportMode={exportMode}
              />
            ) : (
              <RegularGroupsView
                phase={phase}
                expandedGroups={expandedGroups}
                toggleGroup={(id) => setExpandedGroups(prev => ({ [id]: prev[id] ? false : true }))}
                getStateLabel={getStateLabel}
                tournamentId={tournamentId}
                t={t}
                exportMode={exportMode}
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
  exportMode?: boolean
}

function MultiMatchView({
  phase, matchIdx, setMatchIdx, activeGroup, setActiveGroup,
  getGroupsFromLobbies, getStateLabel, tournamentId, t, exportMode
}: MultiMatchViewProps) {
  const currentMatch = phase.groups[matchIdx]
  const groupsMap = currentMatch ? getGroupsFromLobbies(currentMatch.lobbies) : {}
  const groupLetters = Object.keys(groupsMap).sort()
  const groupKey = `${phase.id}_m${matchIdx}`
  const selectedGroupLetter = activeGroup[groupKey] ?? null

  // In export mode, render ALL matches with ALL groups expanded
  if (exportMode) {
    return (
      <div className="space-y-8">
        {phase.groups.map((match, mIdx) => {
          const mGroupsMap = getGroupsFromLobbies(match.lobbies)
          const mGroupLetters = Object.keys(mGroupsMap).sort()
          const totalPlayers = match.lobbies.reduce((s, l) => s + l.players.length, 0)

          return (
            <div key={`${match.id}_${mIdx}`} className="space-y-4">
              {/* Match Header */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Swords className="h-4 w-4 text-primary" />
                <span className="font-bold text-base">Match {mIdx + 1}</span>
                <Badge variant="outline" className={`${getStateColor(match.status)} text-[10px] uppercase font-bold ml-2`}>
                  {getStateLabel(match.status)}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">{totalPlayers} players</span>
              </div>

              {/* All groups for this match */}
              {mGroupLetters.map(letter => {
                const groupData = mGroupsMap[letter]
                const lobbies = groupData.lobbies
                const anyPlaying = lobbies.some(l => l.state === 'PLAYING' || l.state === 'IN_PROGRESS')
                const allFinished = lobbies.every(l => l.state === 'FINISHED' || l.state === 'COMPLETED')
                const status = allFinished ? 'completed' : anyPlaying ? 'in_progress' : 'pending'

                return (
                  <div key={letter} className="m-0 space-y-4">
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
                    </div>
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
        })}
      </div>
    )
  }

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
  exportMode?: boolean
}

function RegularGroupsView({
  phase, expandedGroups, toggleGroup, getStateLabel, tournamentId, t, exportMode
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
        if (!exportMode && phase.groups.length > 1 && !expandedGroups[uniqueId]) return null
        const isVirtualMatch = String(group.groupLetter || '').includes('Trận') || String(group.groupLetter || '').includes('Match')

        return (
          <div key={uniqueId} className={`space-y-3 ${exportMode ? '' : 'animate-fade-in-up'}`}>
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


// ══════════════════════════════════════════════════════════
// Lobby Card (reusable)
// ══════════════════════════════════════════════════════════

interface LobbyCardProps {
  lobby: BracketLobby
  lobbyIndex: number
  tournamentId: string
  getStateLabel: (state?: string) => string
  stripGroupPrefix?: boolean
  exportMode?: boolean
}

// Memoized: prevents re-rendering 64+ cards when parent state changes (tab switch, timer, etc.)
// Custom comparator only checks fields that affect visual output.
const LobbyCard = memo(function LobbyCard({ lobby, lobbyIndex, tournamentId, getStateLabel, stripGroupPrefix, exportMode }: LobbyCardProps) {
  const displayName = stripGroupPrefix ? lobby.name.replace(/\[\w+\]\s*/, '') : lobby.name
  const realId = getRealLobbyId(lobby.id)
  const lobbyHref = `/tournaments/${tournamentId}/lobbies/${realId}`
  const playersToRender = exportMode ? lobby.players : lobby.players.slice(0, 4)

  const [copiedId, setCopiedId] = useState(false)
  const handleCopyId = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(`Tournament: ${tournamentId} - Lobby: ${lobby.id}`)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const isClickable = !exportMode && lobby.players.length > 0;

  const cardContent = (
      <Card
        className={`
          overflow-hidden transition-all duration-300 relative
          ${isClickable ? 'cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5' : 'opacity-80 grayscale-[30%]'}
          bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10
          ${lobby.state === 'PLAYING' ? 'ring-1 ring-emerald-500/30' : ''}
          ${lobby.state === 'FINISHED' ? 'opacity-80' : ''}
          ${exportMode ? '' : 'animate-fade-in-up'}
        `}
        style={{ animationDelay: exportMode ? '0ms' : `${lobbyIndex * 50}ms` }}
      >
        {!isClickable && lobby.players.length === 0 && (
           <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-3 text-center border overflow-hidden rounded-xl">
             <span className="text-xs font-semibold text-muted-foreground uppercase opacity-80 z-20 mix-blend-plus-lighter bg-background/80 px-2 py-1 rounded">Chưa chia bảng</span>
           </div>
        )}
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            {displayName}
            <button 
              onClick={handleCopyId}
              className="opacity-0 group-hover/lobby:opacity-100 transition-all duration-300 flex items-center justify-center p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transform -translate-x-2 group-hover/lobby:translate-x-0"
              title="Copy Lobby ID for Support"
            >
              {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </CardTitle>
          <Badge variant="outline" className={`${getStateColor(lobby.state)} text-[10px] px-1.5`}>
            {getStateLabel(lobby.state)}
          </Badge>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1.5">
            {playersToRender.map((player, playerIndex) => (
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
            {!exportMode && lobby.players.length > 4 && (
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
  )

  return isClickable ? (
    <NextLink href={lobbyHref} className="block group/lobby">
      {cardContent}
    </NextLink>
  ) : (
    <div className="block cursor-not-allowed">
      {cardContent}
    </div>
  )
}, (prev, next) => {
  // Custom comparator: skip re-render if nothing visual changed
  return prev.lobby.state === next.lobby.state &&
    prev.lobby.players.length === next.lobby.players.length &&
    prev.lobbyIndex === next.lobbyIndex &&
    prev.exportMode === next.exportMode &&
    prev.stripGroupPrefix === next.stripGroupPrefix
})
