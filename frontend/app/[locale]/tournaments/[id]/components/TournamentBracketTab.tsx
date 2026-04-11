"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Swords, CircleUser, LayoutGrid, Info, Loader2, ShieldCheck, ChevronDown, ChevronUp, Activity } from "lucide-react"
import NextLink from "next/link"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface BracketPlayer {
  id: string;
  username: string;
  riotGameName?: string;
  riotGameTag?: string;
  rank?: string;
}

interface BracketLobby {
  id: string;
  name: string;
  state?: string;
  fetchedResult?: boolean;
  players: BracketPlayer[];
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

export function TournamentBracketTab({ tournamentId }: TournamentBracketTabProps) {
  const t = useTranslations("common")
  const [bracket, setBracket] = useState<BracketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const fetchBracket = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/bracket`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success) {
        setBracket(data)
        // Auto-select first group if none selected
        if (!activeGroup && data.phases?.[0]?.groups?.[0]?.id) {
          setActiveGroup(data.phases[0].groups[0].id)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId, activeGroup])

  useEffect(() => {
    fetchBracket()
  }, [fetchBracket])

  // Listen for bracket_update via window custom event (dispatched from TabsContentClientWrapper)
  useEffect(() => {
    const handler = () => fetchBracket()
    window.addEventListener('bracket_update', handler)
    return () => window.removeEventListener('bracket_update', handler)
  }, [fetchBracket])

  const getStateColor = (state?: string) => {
    const s = state?.toUpperCase() || ''
    if (s === 'PLAYING' || s === 'IN_PROGRESS') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (s === 'FINISHED' || s === 'COMPLETED') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  }

  const getStateLabel = (state?: string) => {
    const s = state?.toUpperCase() || ''
    if (s === 'PLAYING' || s === 'IN_PROGRESS') return t('group_status_playing')
    if (s === 'FINISHED' || s === 'COMPLETED') return t('group_status_finished')
    return t('group_status_waiting')
  }

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
          <p className="text-xs text-muted-foreground/50 mt-2">{t('bracket_not_ready')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {bracket.phases.map((phase) => (
        <div key={phase.id} className="space-y-4">
          {/* Phase Header */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-primary/30" />
            <h3 className="text-xl font-bold tracking-tight">
              {t('stage_n', { number: phase.phaseNumber })}: {phase.name}
            </h3>
            {phase.status === 'in_progress' || phase.status === 'PLAYING' ? (
              <Badge className="ml-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold animate-pulse border-red-500/50 flex gap-1 items-center">
                <Activity className="h-3 w-3" /> LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className={`ml-2 ${getStateColor(phase.status)} text-xs capitalize`}>
                {getStateLabel(phase.status)}
              </Badge>
            )}
          </div>

          {/* Group Selector Tabs */}
          {phase.groups.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {phase.groups.map((group) => {
                const isActive = activeGroup === group.id
                const totalPlayers = group.lobbies.reduce((sum, l) => sum + l.players.length, 0)

                return (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroup(group.id)}
                    className={`
                      relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                      transition-all duration-300 border
                      ${isActive
                        ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/10 scale-[1.02]'
                        : 'bg-card/60 text-muted-foreground border-white/10 hover:bg-card/80 hover:text-foreground hover:border-white/20'
                      }
                    `}
                  >
                    <Swords className="h-4 w-4" />
                    <span>{t('group_n', { letter: group.groupLetter })}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 h-4 ${isActive ? 'bg-primary/30' : 'bg-muted/50'}`}
                    >
                      {totalPlayers}
                    </Badge>
                    {/* Status dot */}
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

          {/* Group Content: Lobbies */}
          {phase.groups.map((group) => {
            if (phase.groups.length > 1 && activeGroup !== group.id) return null

            return (
              <div key={group.id} className="space-y-3 animate-fade-in-up">
                {/* Group info banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/20 border border-white/5 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium text-base">{t('group_n', { letter: group.groupLetter })}</span>
                      <Badge variant="outline" className={`${getStateColor(group.status)} text-[10px] uppercase font-bold ml-2`}>
                        {getStateLabel(group.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t('players_count_in_group', { count: group.lobbies.reduce((s, l) => s + l.players.length, 0) })}</span>
                      <span className="opacity-50">•</span>
                      <span>Lobbies: {group.lobbies.length}</span>
                      {group.startTime && (
                        <>
                          <span className="opacity-50">•</span>
                          <span>Start: {new Date(group.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 border border-white/10 hover:bg-white/5"
                      onClick={() => toggleGroup(group.id)}
                    >
                      {expandedGroups[group.id] ? (
                        <><ChevronUp className="h-4 w-4 mr-1" /> Collapse</>
                      ) : (
                        <><ChevronDown className="h-4 w-4 mr-1" /> Expand Lobbies</>
                      )}
                    </Button>
                    <NextLink href={`/tournaments/${tournamentId}/rounds/${group.id}`}>
                      <Button
                        size="sm"
                        variant={group.status === "pending" || group.status === "WAITING" ? "secondary" : "default"}
                        className="btn-zodiac text-white font-semibold text-xs h-8 shadow-md"
                      >
                        {group.status === "completed" || group.status === "FINISHED" ? "View Results"
                          : group.status === "in_progress" || group.status === "PLAYING" ? "Live Scoreboard"
                            : "View Details"}
                      </Button>
                    </NextLink>
                  </div>
                </div>

                {!expandedGroups[group.id] ? null : group.lobbies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">{t('no_lobbies_in_group')}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.lobbies.map((lobby, lobbyIndex) => (
                      <Card
                        key={lobby.id}
                        className={`
                          overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5
                          bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10
                          ${lobby.state === 'PLAYING' ? 'ring-1 ring-emerald-500/30' : ''}
                          ${lobby.state === 'FINISHED' ? 'opacity-75' : ''}
                          animate-fade-in-up
                        `}
                        style={{ animationDelay: `${lobbyIndex * 80}ms` }}
                      >
                        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
                              <Users className="h-3.5 w-3.5 text-primary" />
                            </div>
                            {lobby.name}
                          </CardTitle>
                          <Badge variant="outline" className={`${getStateColor(lobby.state)} text-[10px] px-1.5`}>
                            {getStateLabel(lobby.state)}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="space-y-1.5">
                            {lobby.players.map((player, playerIndex) => (
                              <div
                                key={player.id}
                                className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors group"
                              >
                                <div className="relative">
                                  <CircleUser className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-primary/80 text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                    {playerIndex + 1}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {player.riotGameName || player.username}
                                  </div>
                                  {player.riotGameTag && (
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      #{player.riotGameTag}
                                    </div>
                                  )}
                                </div>
                                {player.rank && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0 bg-primary/10 text-primary/80">
                                    {player.rank}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
