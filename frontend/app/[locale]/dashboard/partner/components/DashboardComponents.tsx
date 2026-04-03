'use client';
import {
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  TrendingUp,
  Coins,
  Users,
  ArrowUpDown,
} from "lucide-react"

import api from "@/app/lib/apiConfig"
import { Player, MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Import the async components from the new file
import { PartnerHeader, KeyMetrics, OverviewTab, LobbiesTab, AnalyticsTab, RevenueTab, SettingsTab } from "./PartnerServerComponents"

// Data Fetching Functions
import { usePlayerStore } from "@/app/stores/playerStore"

// --- CLIENT COMPONENTS ---

export function PlayerTab({ referrer }: { referrer: string }) {
  const { allPlayers: players, fetchAllPlayers, isLoading, error } = usePlayerStore()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' | null }>({ key: null, direction: null })

  useEffect(() => {
    // Fetch all players when component mounts or referrer changes
    if (referrer) {
      fetchAllPlayers(undefined, referrer)
    }
  }, [fetchAllPlayers, referrer])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && player.isActive) ||
      (filterStatus === 'inactive' && !player.isActive)
    return matchesSearch && matchesFilter
  })

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortConfig.key === 'balance') {
      if (a.balance < b.balance) {
        return sortConfig.direction === 'ascending' ? -1 : 1
      }
      if (a.balance > b.balance) {
        return sortConfig.direction === 'ascending' ? 1 : -1
      }
    }
    return 0
  })

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending'
    }
    setSortConfig({ key, direction })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Players</h2>
        <Link href="/dashboard/partner/players/add">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Player
          </Button>
        </Link>
      </div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="max-w-sm"
        />
        <Select onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterStatus(value)} defaultValue="all">
          <SelectTrigger className="w-[180px] ml-4">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            <SelectItem value="active">Active Players</SelectItem>
            <SelectItem value="inactive">Inactive Players</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Matches Played</TableHead>
                <TableHead className="text-center">Tournaments Won</TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('balance')}
                    className="p-0"
                  >
                    Balance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No players found for this referrer.
                  </TableCell>
                </TableRow>
              ) : (
                sortedPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${player.username}`} alt="Avatar" />
                          <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {player.username}
                      </div>
                    </TableCell>
                    <TableCell>{player.email}</TableCell>
                    <TableCell className="text-center">{player.totalMatchesPlayed}</TableCell>
                    <TableCell className="text-center">{player.tournamentsWon}</TableCell>
                    <TableCell className="text-center">{player.balance.toLocaleString()} VND</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/dashboard/partner/players/${player.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> View Player
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit Player
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Player
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function MiniTournamentsTab() {
  const [tournaments, setTournaments] = useState<MiniTourLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const response = await api.get('/minitournaments'); // Adjust API endpoint as needed
        setTournaments(response.data.data);
      } catch (err: any) {
        console.error("Failed to fetch tournaments:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  if (loading) return <div>Loading tournaments...</div>;
  if (error) return <div>Error: {error}</div>;
  if (tournaments.length === 0) return <p>No mini-tournaments found.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mini-Tournaments</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tournament Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Players</TableHead>
            <TableHead>Prize Pool</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => (
            <TableRow key={tournament.id}>
              <TableCell className="font-medium">{tournament.name}</TableCell>
              <TableCell>{tournament.status}</TableCell>
              <TableCell>{tournament.currentPlayers}/{tournament.maxPlayers}</TableCell>
              <TableCell>${tournament.prizePool.toLocaleString()}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>View Tournament</DropdownMenuItem>
                    <DropdownMenuItem>Edit Tournament</DropdownMenuItem>
                    <DropdownMenuItem>Delete Tournament</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
