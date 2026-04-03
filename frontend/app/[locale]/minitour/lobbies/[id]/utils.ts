export const getThemeStyle = (theme: string | undefined) => {
  switch (theme) {
    case "premium":
      return "border-yellow-500/50 bg-yellow-500/5"
    case "dark":
      return "border-purple-500/50 bg-purple-500/5"
    case "colorful":
      return "border-pink-500/50 bg-pink-500/5"
    default:
      return ""
  }
}

export const getRankColor = (rank: string) => {
  if (rank.includes("Challenger")) return "bg-purple-500/20 text-purple-500"
  if (rank.includes("Grandmaster")) return "bg-red-500/20 text-red-500"
  if (rank.includes("Master")) return "bg-blue-500/20 text-blue-500"
  if (rank.includes("Diamond")) return "bg-cyan-500/20 text-cyan-500"
  return "bg-muted text-muted-foreground"
} 