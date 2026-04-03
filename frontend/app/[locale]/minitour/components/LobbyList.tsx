"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, DollarSign, Trophy, Star, Coins } from "lucide-react"

import { MiniTourLobby } from "@/stores/miniTourLobbyStore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function LobbyCard({ lobby }: { lobby: MiniTourLobby }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-green-500/20 text-green-500"
      case "IN_PROGRESS":
        return "bg-yellow-500/20 text-yellow-500"
      case "COMPLETED":
      case "CANCELLED":
        return "bg-red-500/20 text-red-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getThemeStyle = (theme?: string) => {
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

  return (
    <Card className={`card-hover-effect ${getThemeStyle(lobby.theme)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={lobby.customLogoUrl || "/placeholder.svg"} alt={lobby.name} />
              <AvatarFallback className="text-xs">{lobby.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{lobby.name}</CardTitle>
            </div>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{lobby.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={getStatusColor(lobby.status)}>
            {lobby.status}
          </Badge>
          <div className="flex items-center">
            <Star className="mr-1 h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{lobby.averageRating}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Players:</span>
            <span className="font-medium">
              {lobby.currentPlayers}/{lobby.maxPlayers}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entry Fee:</span>
            <span className="font-medium">
              {lobby.entryType === "coins" ? (
                <span className="flex items-center">
                  <Coins className="mr-1 h-3 w-3" />
                  {lobby.entryFee}
                </span>
              ) : (
                <span className="flex items-center">
                  <DollarSign className="mr-1 h-3 w-3" />
                  {lobby.entryFee}
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prize Pool:</span>
            <span className="font-medium">
              <span className="flex items-center">
                <Coins className="mr-1 h-3 w-3" />
                {lobby.prizePool}
              </span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Game Mode:</span>
            <span className="font-medium">{lobby.gameMode}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {lobby.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            asChild
            className="w-full"
            disabled={lobby.status === "COMPLETED" || lobby.status === "CANCELLED" || lobby.status === "IN_PROGRESS"}
            variant={lobby.status === "IN_PROGRESS" ? "outline" : "default"}
          >
            <Link href={`/minitour/lobbies/${lobby.id}`}>
              {lobby.status === "IN_PROGRESS"
                ? "In Progress"
                : lobby.status === "COMPLETED"
                  ? "Completed"
                  : lobby.status === "CANCELLED"
                    ? "Cancelled"
                    : "View Lobby"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function LobbyList({ initialLobbies }: { initialLobbies: MiniTourLobby[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGameMode, setSelectedGameMode] = useState<string>("all")
  const [selectedEntryType, setSelectedEntryType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("rating")

  const filteredLobbies = initialLobbies.filter((lobby) => {
    const matchesSearch =
      lobby.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lobby.description && lobby.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesGameMode =
      selectedGameMode === "all" || lobby.gameMode.toLowerCase() === selectedGameMode.toLowerCase()
    const matchesEntryType =
      selectedEntryType === "all" || lobby.entryType.toLowerCase() === selectedEntryType.toLowerCase()

    return matchesSearch && matchesGameMode && matchesEntryType
  })

  const sortedLobbies = [...filteredLobbies].sort((a, b) => {
    switch (sortBy) {
      case "players":
        return b.currentPlayers - a.currentPlayers
      case "rating":
        return b.averageRating - a.averageRating
      case "entryFee":
        return a.entryFee - b.entryFee
      default:
        return b.averageRating - a.averageRating
    }
  })

  return (
    <section className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Available Lobbies</h2>
        <p className="text-muted-foreground">Browse and join custom lobbies from our community partners</p>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lobbies..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedGameMode} onValueChange={setSelectedGameMode}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Game Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="ranked">Ranked</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedEntryType} onValueChange={setSelectedEntryType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Entry Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="coins">Coins</SelectItem>
              <SelectItem value="usd">USD</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="players">Players</SelectItem>
              <SelectItem value="entryFee">Entry Fee</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedLobbies.length > 0 ? (
          sortedLobbies.map((lobby) => <LobbyCard key={lobby.id} lobby={lobby} />)
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p>No lobbies match your filters.</p>
              <p className="text-sm">Try adjusting your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
