import { BarChart2, RefreshCw, Swords, Star, Trophy } from "lucide-react"

export const PHASE_RULE_ICON_MAP: Record<string, React.ReactNode> = {
  swiss: <BarChart2 className="h-4 w-4" />,
  elimination: <Swords className="h-4 w-4" />,
  elimination_bo: <Swords className="h-4 w-4" />,
  checkmate: <Trophy className="h-4 w-4" />,
  points: <Star className="h-4 w-4" />,
  round_robin: <RefreshCw className="h-4 w-4" />,
}
