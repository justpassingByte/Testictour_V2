import api from "@/app/lib/apiConfig"
import * as htmlToImage from "html-to-image"
import { IPhase } from "@/app/types/tournament"
import { computePlacementStats, swissTiebreakCompare } from "./standings-utils"

export const LOBBY_GRID_CLASS =
  "grid gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3"

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function captureBracketPng(elementId: string, filename: string) {
  const el = document.getElementById(elementId)
  if (!el) throw new Error("BRACKET_ELEMENT_NOT_FOUND")

  const dataUrl = await htmlToImage.toPng(el, {
    backgroundColor: "#0f172a",
    skipFonts: true,
    pixelRatio: 2,
    cacheBust: true,
  })

  const link = document.createElement("a")
  link.download = filename
  link.href = dataUrl
  link.click()
}

interface ExportPlayer {
  userId: string
  username: string
  discordId: string
  riotGameName: string
  riotGameTag: string
  matchResults: Record<number, { placement: number; points: number }>
  totalPoints: number
  placements: number[]
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function inGameTag(name: string, tag: string): string {
  if (name && tag) return `${name}#${tag}`
  return name || tag || ""
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(",")
}

function sectionTitle(title: string): string {
  return `\n${title}\n`
}

function blankRows(count = 1): string {
  return "\n".repeat(count)
}

function buildPlayerFromResult(r: any): ExportPlayer {
  return {
    userId: r.userId,
    username: r.username || "Unknown",
    discordId: r.discordId || "",
    riotGameName: r.riotGameName || "",
    riotGameTag: r.riotGameTag || "",
    matchResults: {},
    totalPoints: 0,
    placements: [],
  }
}

function collectLobbyPlayers(lobby: any): ExportPlayer[] {
  const playerMap = new Map<string, ExportPlayer>()

  lobby.participants?.forEach((p: any) => {
    if (!p?.userId) return
    playerMap.set(p.userId, buildPlayerFromResult(p))
  })

  lobby.matches?.forEach((match: any, matchIdx: number) => {
    match.results?.forEach((r: any) => {
      const key = r.userId
      if (!playerMap.has(key)) {
        playerMap.set(key, buildPlayerFromResult(r))
      }
      const player = playerMap.get(key)!
      player.username = r.username || player.username
      player.discordId = r.discordId || player.discordId
      player.riotGameName = r.riotGameName || player.riotGameName
      player.riotGameTag = r.riotGameTag || player.riotGameTag
      player.matchResults[matchIdx + 1] = { placement: r.placement, points: r.points }
      player.totalPoints += r.points || 0
      if (r.placement > 0) player.placements.push(r.placement)
    })
  })

  return Array.from(playerMap.values()).sort((a, b) =>
    swissTiebreakCompare(
      { total: a.totalPoints, placements: a.placements },
      { total: b.totalPoints, placements: b.placements }
    )
  )
}

function buildLobbyCsvBlock(lobby: any): string {
  const matchCount = lobby.matches?.length || 0
  let block = sectionTitle(`LOBBY: ${lobby.lobbyName} | Trạng thái: ${lobby.state}`)

  const players = collectLobbyPlayers(lobby)
  if (!players.length) {
    return block + "(Chưa có người chơi trong lobby)\n"
  }

  const baseHeaders = [
    "Hạng",
    "Real Name",
    "Discord",
    "In-Game Name",
    "Riot Tag",
    "In-Game#Tag",
  ]
  const matchHeaders: string[] = []
  for (let i = 1; i <= matchCount; i++) {
    matchHeaders.push(`Trận ${i} Hạng`, `Trận ${i} Điểm`)
  }
  const statHeaders = ["Tổng điểm", "#1", "#2", "#3", "Top 4", "Σ Hạng", "Best"]
  block += csvRow([...baseHeaders, ...matchHeaders, ...statHeaders]) + "\n"

  players.forEach((player, idx) => {
    const stats = computePlacementStats(player.placements)
    const matchCells: (string | number)[] = []
    for (let i = 1; i <= matchCount; i++) {
      const mr = player.matchResults[i]
      matchCells.push(mr?.placement ?? "", mr?.points ?? "")
    }
    block +=
      csvRow([
        idx + 1,
        player.username,
        player.discordId,
        player.riotGameName,
        player.riotGameTag,
        inGameTag(player.riotGameName, player.riotGameTag),
        ...matchCells,
        player.totalPoints,
        stats.top1,
        stats.top2,
        stats.top3,
        stats.top4,
        stats.sumPlacements || "",
        stats.bestPlacement ?? "",
      ]) + "\n"
  })

  return block
}

function buildGroupSummary(group: any): string {
  const groupPlayers = new Map<string, ExportPlayer>()

  group.lobbies?.forEach((lobby: any) => {
    collectLobbyPlayers(lobby).forEach((player) => {
      const existing = groupPlayers.get(player.userId)
      if (!existing) {
        groupPlayers.set(player.userId, {
          ...player,
          matchResults: { ...player.matchResults },
          placements: [...player.placements],
        })
        return
      }
      existing.totalPoints += player.totalPoints
      existing.placements.push(...player.placements)
      Object.entries(player.matchResults).forEach(([k, v]) => {
        existing.matchResults[Number(k)] = v
      })
    })
  })

  const sorted = Array.from(groupPlayers.values()).sort((a, b) =>
    swissTiebreakCompare(
      { total: a.totalPoints, placements: a.placements },
      { total: b.totalPoints, placements: b.placements }
    )
  )

  if (!sorted.length) return ""

  let block = sectionTitle(`TỔNG HỢP BẢNG ${group.groupLetter}`)
  block +=
    csvRow([
      "Hạng",
      "Real Name",
      "Discord",
      "In-Game#Tag",
      "Tổng điểm",
      "Số trận",
      "#1",
      "#2",
      "#3",
      "Top 4",
      "Σ Hạng",
      "Best",
    ]) + "\n"

  sorted.forEach((player, idx) => {
    const stats = computePlacementStats(player.placements)
    block +=
      csvRow([
        idx + 1,
        player.username,
        player.discordId,
        inGameTag(player.riotGameName, player.riotGameTag),
        player.totalPoints,
        stats.matchCount,
        stats.top1,
        stats.top2,
        stats.top3,
        stats.top4,
        stats.sumPlacements || "",
        stats.bestPlacement ?? "",
      ]) + "\n"
  })

  return block + blankRows()
}

export async function exportPhaseScoreboardCsv(tournamentId: string, phase: IPhase) {
  const res = await api.get(`/tournaments/${tournamentId}/scoreboard-export`)
  const data = res.data
  if (!data.success || !data.phases) throw new Error("Invalid scoreboard export data")

  const phaseData = data.phases.find((p: any) => p.phaseNumber === phase.phaseNumber)
  if (!phaseData) throw new Error("Phase not found in export data")

  let csvContent = ""
  csvContent += csvRow(["Giải đấu", data.tournamentName]) + "\n"
  csvContent += csvRow(["Trạng thái", data.tournamentStatus]) + "\n"
  csvContent += csvRow(["Giai đoạn", `${phaseData.phaseName} (Phase ${phase.phaseNumber})`]) + "\n"
  csvContent += blankRows(2)

  phaseData.groups.forEach((group: any, groupIdx: number) => {
    if (groupIdx > 0) csvContent += blankRows()
    csvContent += sectionTitle(`════ BẢNG ${group.groupLetter} ════`)

    group.lobbies.forEach((lobby: any, lobbyIdx: number) => {
      if (lobbyIdx > 0) csvContent += blankRows()
      csvContent += buildLobbyCsvBlock(lobby)
    })

    csvContent += buildGroupSummary(group)
  })

  const phaseTotals = new Map<string, ExportPlayer>()
  phaseData.groups.forEach((group: any) => {
    group.lobbies.forEach((lobby: any) => {
      collectLobbyPlayers(lobby).forEach((player) => {
        const existing = phaseTotals.get(player.userId)
        if (!existing) {
          phaseTotals.set(player.userId, {
            ...player,
            matchResults: { ...player.matchResults },
            placements: [...player.placements],
          })
          return
        }
        existing.totalPoints += player.totalPoints
        existing.placements.push(...player.placements)
      })
    })
  })

  const phaseSorted = Array.from(phaseTotals.values()).sort((a, b) =>
    swissTiebreakCompare(
      { total: a.totalPoints, placements: a.placements },
      { total: b.totalPoints, placements: b.placements }
    )
  )

  csvContent += blankRows()
  csvContent += sectionTitle(`════ TỔNG HỢP GIAI ĐOẠN ${phase.phaseNumber} ════`)
  csvContent +=
    csvRow([
      "Hạng",
      "Real Name",
      "Discord",
      "In-Game#Tag",
      "Tổng điểm",
      "Số trận",
      "#1",
      "#2",
      "#3",
      "Top 4",
      "Σ Hạng",
      "Best",
    ]) + "\n"

  phaseSorted.forEach((player, idx) => {
    const stats = computePlacementStats(player.placements)
    csvContent +=
      csvRow([
        idx + 1,
        player.username,
        player.discordId,
        inGameTag(player.riotGameName, player.riotGameTag),
        player.totalPoints,
        stats.matchCount,
        stats.top1,
        stats.top2,
        stats.top3,
        stats.top4,
        stats.sumPlacements || "",
        stats.bestPlacement ?? "",
      ]) + "\n"
  })

  downloadCSV(csvContent, `scoreboard_${tournamentId}_phase${phase.phaseNumber}.csv`)
}
