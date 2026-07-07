export interface TiebreakItem {
  label: string
  desc: string
}

export interface PhaseRuleContent {
  type: string
  label: string
  desc: string
  items: TiebreakItem[]
}

export const PHASE_RULE_COLOR_MAP: Record<string, string> = {
  swiss: "text-blue-400",
  elimination: "text-red-400",
  elimination_bo: "text-red-400",
  checkmate: "text-yellow-400",
  points: "text-green-400",
  round_robin: "text-purple-400",
}

export function normalizePhaseRuleType(type: string): string {
  const normalized = (type || "").toLowerCase()
  if (normalized === "group_stage") return "swiss"
  if (normalized === "knockout") return "elimination"
  return normalized
}

const RULE_TYPE_FALLBACKS: Record<string, string[]> = {
  group_stage: ["swiss"],
  knockout: ["elimination"],
}

export function getPhaseRuleContent(
  t: (key: string, values?: Record<string, unknown>) => string,
  tRaw: (key: string) => unknown,
  phaseType: string
): PhaseRuleContent {
  const normalized = normalizePhaseRuleType(phaseType)
  const candidates = [normalized, ...(RULE_TYPE_FALLBACKS[(phaseType || "").toLowerCase()] || []), "points", "swiss"]

  for (const key of candidates) {
    const labelKey = `rules_tiebreak_${key}_label`
    const label = t(labelKey)
    if (!label || label === labelKey) continue

    const descKey = `rules_tiebreak_${key}_desc`
    const desc = t(descKey)
    const raw = tRaw(`rules_tiebreak_${key}_items`)
    const items = Array.isArray(raw)
      ? raw.filter((item): item is TiebreakItem =>
          !!item && typeof item === "object" && "label" in item && "desc" in item
        )
      : []

    return {
      type: key,
      label,
      desc: desc === descKey ? "" : desc,
      items,
    }
  }

  return { type: normalized, label: normalized, desc: "", items: [] }
}

export function getAdvancementText(t: (key: string, values?: Record<string, unknown>) => string, phase: {
  advancementCondition?: unknown
}): string {
  const advCondition = phase.advancementCondition as Record<string, unknown> | undefined
  if (!advCondition) return t("based_on_standard_ruleset")
  if (advCondition.type === "top_n_scores") return t("top_n_scorers_advance", { value: advCondition.value })
  if (advCondition.type === "placement") return t("top_n_placements_advance", { value: advCondition.value })
  if (advCondition.winCondition === "checkmate_win") {
    return t("requires_points_for_checkmate", { points: advCondition.pointsToActivate })
  }
  return t("based_on_standard_ruleset")
}

export function getGroupsLabel(count: number): string {
  if (!count) return ""
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i)).join(", ")
}
