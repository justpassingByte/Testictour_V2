import { PlayerRoundStats } from "@/app/types/tournament"

export interface PlacementStats {
  top1: number
  top2: number
  top3: number
  top4: number
  sumPlacements: number
  bestPlacement: number | null
  lastPlacement: number | null
  matchCount: number
}

export type PhaseStandingRow = PlayerRoundStats & {
  groups: string[]
  stats: PlacementStats
}

export function computePlacementStats(placements: number[]): PlacementStats {
  const valid = placements.filter((p) => p > 0 && Number.isFinite(p))
  return {
    top1: valid.filter((p) => p === 1).length,
    top2: valid.filter((p) => p === 2).length,
    top3: valid.filter((p) => p === 3).length,
    top4: valid.filter((p) => p <= 4).length,
    sumPlacements: valid.reduce((s, p) => s + p, 0),
    bestPlacement: valid.length ? Math.min(...valid) : null,
    lastPlacement: valid.length ? valid[valid.length - 1] : null,
    matchCount: valid.length,
  }
}

/** Swiss / APAC-style tiebreak — matches rules_tiebreak_swiss_items order */
export function swissTiebreakCompare(
  a: { total: number; placements: number[] },
  b: { total: number; placements: number[] }
): number {
  if (b.total !== a.total) return b.total - a.total

  const statsA = computePlacementStats(a.placements)
  const statsB = computePlacementStats(b.placements)

  if (statsA.sumPlacements !== statsB.sumPlacements) return statsA.sumPlacements - statsB.sumPlacements
  if (statsB.top1 !== statsA.top1) return statsB.top1 - statsA.top1
  if (statsB.top4 !== statsA.top4) return statsB.top4 - statsA.top4
  if (statsB.top2 !== statsA.top2) return statsB.top2 - statsA.top2
  if (statsB.top3 !== statsA.top3) return statsB.top3 - statsA.top3

  const bestA = statsA.bestPlacement ?? Infinity
  const bestB = statsB.bestPlacement ?? Infinity
  if (bestA !== bestB) return bestA - bestB

  const lastA = statsA.lastPlacement ?? Infinity
  const lastB = statsB.lastPlacement ?? Infinity
  return lastA - lastB
}

export function mergePhaseScoreboards(scoreboards: any[]): PhaseStandingRow[] {
  const playerMap = new Map<string, PhaseStandingRow>()

  scoreboards.forEach((sb: any, sbIdx: number) => {
    const groupLetter = String.fromCharCode(65 + (sb.round?.roundNumber ?? sbIdx + 1) - 1)
    const players: PlayerRoundStats[] = sb.scoreboard || []

    players.forEach((p) => {
      const existing = playerMap.get(p.id)
      if (!existing) {
        const placements = [...(p.placements || [])]
        const points = [...(p.points || [])]
        playerMap.set(p.id, {
          ...p,
          groups: [groupLetter],
          placements,
          points,
          total: p.total || 0,
          stats: computePlacementStats(placements),
        })
        return
      }

      // Same player resurfaced in another group — keep the richer record
      if ((p.placements?.length || 0) > existing.placements.length) {
        existing.placements = [...(p.placements || [])]
        existing.points = [...(p.points || [])]
        existing.total = p.total || 0
        existing.lobbyName = p.lobbyName
        existing.status = p.status
        existing.username = p.username || existing.username
        existing.discordId = p.discordId || existing.discordId
        existing.riotGameName = p.riotGameName || existing.riotGameName
        existing.riotGameTag = p.riotGameTag || existing.riotGameTag
      }
      if (!existing.groups.includes(groupLetter)) existing.groups.push(groupLetter)
      if (p.status === "eliminated") existing.status = "eliminated"
      else if (p.status === "advanced" && existing.status !== "eliminated") existing.status = "advanced"
      existing.stats = computePlacementStats(existing.placements)
    })
  })

  return Array.from(playerMap.values()).sort(swissTiebreakCompare)
}

export function placementBadgeClass(placement: number): string {
  if (placement === 1) return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
  if (placement === 2) return "bg-slate-400/20 text-slate-600 dark:text-slate-300"
  if (placement === 3) return "bg-amber-600/20 text-amber-700 dark:text-amber-500"
  if (placement === 4) return "bg-orange-500/15 text-orange-600 dark:text-orange-400"
  return "bg-secondary/80 text-secondary-foreground"
}
