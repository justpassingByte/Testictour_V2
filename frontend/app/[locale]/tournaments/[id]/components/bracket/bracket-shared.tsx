"use client"

import { memo, useState } from "react"
import NextLink from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CircleUser, Copy, Check } from "lucide-react"
import { PlayerIdentityLines } from "../phase/player-identity"

export interface BracketPlayer {
  id: string
  username: string
  discordId?: string
  riotGameName?: string
  riotGameTag?: string
  rank?: string
  placement?: number
  points?: number
}

export interface BracketLobby {
  id: string
  name: string
  state?: string
  fetchedResult?: boolean
  players: BracketPlayer[]
  roundId?: string
}

export interface BracketGroup {
  id: string
  name: string
  groupLetter: string
  groupNumber: number
  status: string
  startTime?: string
  endTime?: string
  lobbies: BracketLobby[]
}

export interface BracketPhase {
  id: string
  name: string
  phaseNumber: number
  status: string
  type: string
  groups: BracketGroup[]
}

export interface BracketData {
  tournamentId: string
  phases: BracketPhase[]
}

export function extractGroupLetter(lobbyName: string): string {
  const m = lobbyName.match(/\[(\w+)\]/)
  return m ? m[1] : "A"
}

export function getRealLobbyId(virtualId: string): string {
  const m = virtualId.match(/^(.+?)_m\d+$/)
  return m ? m[1] : virtualId
}

export function getStateColor(state?: string) {
  const s = (state || "").toUpperCase()
  if (s === "PLAYING" || s === "IN_PROGRESS") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
  if (s === "FINISHED" || s === "COMPLETED") return "bg-blue-500/20 text-blue-400 border-blue-500/30"
  return "bg-amber-500/20 text-amber-400 border-amber-500/30"
}

export function isMultiMatchPhase(phase: BracketPhase) {
  return (
    phase.groups.length > 0 &&
    (String(phase.groups[0].groupLetter || "").startsWith("Vòng") ||
      String(phase.groups[0].groupLetter || "").startsWith("Trận"))
  )
}

export function getGroupsFromLobbies(lobbies: BracketLobby[]) {
  const groups: Record<string, { lobbies: BracketLobby[]; roundId?: string }> = {}
  lobbies.forEach((lobby) => {
    const letter = extractGroupLetter(lobby.name)
    if (!letter) return
    if (!groups[letter]) groups[letter] = { lobbies: [], roundId: lobby.roundId }
    groups[letter].lobbies.push(lobby)
    if (lobby.roundId && !groups[letter].roundId) groups[letter].roundId = lobby.roundId
  })

  Object.values(groups).forEach((g) => {
    g.lobbies.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || "0", 10)
      const numB = parseInt(b.name.match(/\d+/)?.[0] || "0", 10)
      if (numA !== numB) return numA - numB
      return a.name.localeCompare(b.name)
    })
  })

  return groups
}

interface LobbyCardProps {
  lobby: BracketLobby
  lobbyIndex: number
  tournamentId: string
  getStateLabel: (state?: string) => string
  stripGroupPrefix?: boolean
  exportMode?: boolean
}

export const LobbyCard = memo(function LobbyCard({
  lobby,
  lobbyIndex,
  tournamentId,
  getStateLabel,
  stripGroupPrefix,
  exportMode,
}: LobbyCardProps) {
  const displayName = stripGroupPrefix ? lobby.name.replace(/\[\w+\]\s*/, "") : lobby.name
  const realId = getRealLobbyId(lobby.id)
  const lobbyHref = `/tournaments/${tournamentId}/lobbies/${realId}`
  const playersToRender = lobby.players

  const [copiedId, setCopiedId] = useState(false)
  const handleCopyId = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(`Tournament: ${tournamentId} - Lobby: ${lobby.id}`)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const isClickable = !exportMode && lobby.players.length > 0

  const cardContent = (
    <Card
      className={`
        overflow-hidden transition-all duration-300 relative
        ${isClickable ? "cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5" : "opacity-80 grayscale-[30%]"}
        bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10
        ${lobby.state === "PLAYING" ? "ring-1 ring-emerald-500/30" : ""}
        ${lobby.state === "FINISHED" ? "opacity-80" : ""}
        ${exportMode ? "" : "animate-fade-in-up"}
      `}
      style={{ animationDelay: exportMode ? "0ms" : `${lobbyIndex * 50}ms` }}
    >
      {!isClickable && lobby.players.length === 0 && (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-3 text-center border overflow-hidden rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground uppercase opacity-80 z-20 mix-blend-plus-lighter bg-background/80 px-2 py-1 rounded">
            Chưa chia bảng
          </span>
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
        {exportMode && playersToRender.length > 0 && (
          <div className="grid grid-cols-[20px_1fr] gap-x-2 gap-y-0.5 mb-2 px-2 text-[9px] uppercase tracking-wide text-muted-foreground/70 font-semibold border-b border-white/5 pb-1.5">
            <span>#</span>
            <span>Real Name · Discord · In-Game#Tag</span>
          </div>
        )}
        <div className="space-y-1.5">
          {playersToRender.map((player, playerIndex) => (
            <div
              key={player.id}
              className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors min-h-[44px]"
            >
              <div className="relative shrink-0">
                <CircleUser className="h-6 w-6 text-muted-foreground" />
                <span className="absolute -bottom-0.5 -right-0.5 text-[7px] font-bold bg-primary/80 text-primary-foreground rounded-full w-3 h-3 flex items-center justify-center">
                  {playerIndex + 1}
                </span>
              </div>
              <PlayerIdentityLines player={player} showLabels compact />
              {player.rank && (
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 shrink-0 bg-primary/10 text-primary/80">
                  {player.rank}
                </Badge>
              )}
            </div>
          ))}
          {lobby.players.length === 0 && (
            <div className="text-[10px] text-muted-foreground/50 text-center py-2">No players assigned</div>
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
    <div className="block cursor-not-allowed">{cardContent}</div>
  )
}, (prev, next) => {
  return (
    prev.lobby.state === next.lobby.state &&
    prev.lobby.players.length === next.lobby.players.length &&
    prev.lobbyIndex === next.lobbyIndex &&
    prev.exportMode === next.exportMode &&
    prev.stripGroupPrefix === next.stripGroupPrefix
  )
})
