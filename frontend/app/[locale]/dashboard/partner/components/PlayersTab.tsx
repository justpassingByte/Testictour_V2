import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Trophy, Users, TrendingUp } from "lucide-react"
import Link from "next/link"
import PlayersTabClient from "./PlayersTabClient"

// Matches the new simplified list API response
interface Player {
  id: string
  username: string
  email: string
  riotGameName: string
  riotGameTag: string
  totalPoints: number
  lobbiesPlayed: number
  lastPlayed: string
}

interface PlayersTabProps {
  players: Player[]
  currentBalance?: number
  totalRevenue?: number
  onPlayersUpdate?: () => void
}

export function PlayersTab({ players, currentBalance = 0, totalRevenue = 0, onPlayersUpdate }: PlayersTabProps) {
  return <PlayersTabClient players={players} currentBalance={currentBalance} totalRevenue={totalRevenue} onPlayersUpdate={onPlayersUpdate} />
}
