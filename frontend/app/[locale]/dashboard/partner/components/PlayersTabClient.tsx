"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Users, Edit, Trash2, Upload, Plus, DollarSign, X, Calendar, Trophy, Target, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, History, Loader2, ChevronDown, Search, Filter, ArrowUpDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import AddPlayerModal from "./AddPlayerModal"
import { useRouter } from "next/navigation"
import api from "@/app/lib/apiConfig"

// Matches the new simplified list API response
interface PartnerPlayer {
  id: string
  username: string
  email: string
  riotGameName: string
  riotGameTag: string
  totalPoints: number
  lobbiesPlayed: number
  lastPlayed: string
}

// Matches the detail API response
interface PlayerDetail {
  player: {
    id: string
    username: string
    email: string
    riotGameName: string
    riotGameTag: string
    region: string | null
    referrer: string | null
    rank: string | null
    totalMatchesPlayed: number
    averagePlacement: number
    topFourRate: number
    firstPlaceRate: number
    tournamentsPlayed: number
    tournamentsWon: number
    createdAt: string
    isActive: boolean
    balance: {
      amount: number
      updatedAt: string
    } | null
  }
  stats: {
    totalPoints: number
    totalMatchesPlayed: number
    lobbiesPlayed: number
    averagePlacement: number
    firstPlaceCount: number
    topFourCount: number
    topFourRate: number
    firstPlaceRate: number
    recentPlacements: number[]
    totalPointsPerMatch: number
  }
  lobbies: {
    lobbyId: string
    lobbyName: string
    status: string
    entryFee: number
    prizePool: number
    gameMode: string
    joinedAt: string
    totalPoints: number
    matchesPlayed: number
    averagePlacement: number
  }[]
  matchHistory: {
    matchId: string
    matchIdRiotApi: string | null
    lobbyId: string
    lobbyName: string
    placement: number
    points: number
    status: string
    playedAt: string
  }[]
  transactions: Transaction[]
}

interface Transaction {
  id: string
  userId: string
  type: 'deposit' | 'withdraw' | 'reward' | 'entry_fee' | 'refund'
  amount: number
  status: 'pending' | 'success' | 'failed' | 'completed'
  refId?: string
  createdAt: string
  processedAt?: string
}

interface PlayersTabClientProps {
  players: PartnerPlayer[]
  currentBalance?: number
  totalRevenue?: number
  onPlayersUpdate?: () => void
  partnerId?: string
}

export default function PlayersTabClient({ players: initialPlayers, currentBalance = 0, totalRevenue = 0, onPlayersUpdate, partnerId }: PlayersTabClientProps) {
  const router = useRouter()
  const [localPlayers, setLocalPlayers] = useState<PartnerPlayer[]>(initialPlayers)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [openTransactionModal, setOpenTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionDescription, setTransactionDescription] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PartnerPlayer | null>(null)
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("username")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Sync with prop from parent
  useEffect(() => {
    setLocalPlayers(initialPlayers)
  }, [initialPlayers])

  const refreshPlayers = async () => {
    // If viewing as admin (partnerId is present), rely on parent update or just don't fetch from partner endpoint
    if (partnerId) {
      if (onPlayersUpdate) onPlayersUpdate();
      return;
    }

    try {
      const response = await api.get('/partner/players')
      if (response.data?.data) {
        setLocalPlayers(response.data.data)
        if (onPlayersUpdate) {
          onPlayersUpdate()
        }
      }
    } catch (error) {
      console.error('Error refreshing players:', error)
    }
  }

  const handleViewPlayer = async (player: PartnerPlayer) => {
    setSelectedPlayer(player)
    setIsEditing(false)
    setDetailLoading(true)
    setPlayerDetail(null)

    try {
      let url = `/partner/players/${player.id}`;
      // In admin context, pass targetPartnerId so the backend knows which partner context to use
      if (partnerId) {
        url += `?targetPartnerId=${partnerId}`;
      }

      const response = await api.get(url);

      if (response.data?.data) {
        setPlayerDetail(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching player detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseDetail = () => {
    setSelectedPlayer(null)
    setPlayerDetail(null)
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedPlayer || !playerDetail) return

    try {
      const response = await api.put(`/partner/players/${selectedPlayer.id}`, {
        username: playerDetail.player.username,
        email: playerDetail.player.email
      });

      if (response.status === 200) {
        alert('Player updated successfully');
        setIsEditing(false);
        refreshPlayers();
      } else {
        alert(response.data.message || 'Failed to update player');
      }
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error updating player');
    }
  }

  const handleDeleteInline = async () => {
    if (!selectedPlayer) return

    if (confirm('Are you sure you want to delete this player?')) {
      try {
        const response = await api.delete(`/partner/players/${selectedPlayer.id}`);

        if (response.status === 200) {
          alert('Player deleted successfully');
          setSelectedPlayer(null);
          setPlayerDetail(null);
          refreshPlayers();
        } else {
          alert(response.data.message || 'Failed to delete player');
        }
      } catch (error) {
        console.error('Error deleting player:', error);
        alert('Error deleting player');
      }
    }
  }

  const handleExportCSV = async () => {
    try {
      // Fetch the CSV directly from the backend which now has much more detail
      const response = await api.get('/partner/export/users', {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `partner-players-detailed-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      alert(error.message || 'Failed to export detailed player data');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      try {
        const response = await api.delete(`/partner/players/${playerId}`);

        if (response.status === 200) {
          refreshPlayers();
        } else {
          alert(response.data.message || 'Failed to delete player');
        }
      } catch (error) {
        console.error('Error deleting player:', error);
        alert('Error deleting player');
      }
    }
  };

  const handleCreatePlayer = async (playerData: any) => {
    try {
      const response = await api.post('/partner/players', playerData);

      if (response.status === 200 || response.status === 201) {
        alert('Player created successfully');
        refreshPlayers();
      } else {
        alert(response.data.message || 'Failed to create player');
      }
    } catch (error) {
      console.error('Error creating player:', error);
      alert('Error creating player');
    }
  }

  const handleUpdatePlayer = async (playerId: string, playerData: any) => {
    try {
      const response = await api.put(`/partner/players/${playerId}`, playerData);

      if (response.status === 200) {
        alert('Player updated successfully');
        refreshPlayers();
      } else {
        alert(response.data.message || 'Failed to update player');
      }
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error updating player');
    }
  };

  const handleTransaction = async () => {
    if (!selectedPlayer || !transactionAmount) return

    const amount = parseFloat(transactionAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      // Use our unified transaction endpoint
      const response = await api.post('/partner/transaction', {
        playerId: selectedPlayer.id,
        type: transactionType,
        amount,
        description: transactionDescription
      });

      if (response.status === 200 || response.status === 201) {
        alert(`${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} processed successfully`);
        setOpenTransactionModal(false);
        setTransactionAmount('');
        setTransactionDescription('');

        // Refresh player list to show updated totals
        const playersResponse = await api.get('/partner/players');
        if (playersResponse.data?.data) {
          setLocalPlayers(playersResponse.data.data);
        }

        // Refresh detail view for the specific player to show new balance and transaction history
        handleViewPlayer(selectedPlayer);
      }
    } catch (error: any) {
      console.error(`Error processing ${transactionType}:`, error);
      alert(error.message || `Failed to process ${transactionType}`);
    }
  };

  const handleOpenTransactionModal = (type: 'deposit' | 'withdraw') => {
    setTransactionType(type)
    setOpenTransactionModal(true)
  }

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await api.post('/partner/import/players', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (response.status === 200) {
            const summary = response.data.data;
            alert(`Import processed!\n\n✅ Successfully imported: ${summary.imported}\n❌ Failed: ${summary.failed}${summary.errors.length > 0 ? '\n\nCheck console for details on failed rows.' : ''}`);

            if (summary.errors.length > 0) {
              console.group('CSV Import Error Details');
              summary.errors.forEach((err: string) => console.error(err));
              console.groupEnd();
            }

            refreshPlayers();
          } else {
            alert(response.data.message || 'Failed to import players');
          }
        } catch (error) {
          console.error('Error importing players:', error);
          alert('Error importing players');
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Referred Players</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Total Referred: {localPlayers.length}
          </span>
          <Badge variant="secondary">All Active</Badge>

          {!partnerId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportCSV}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setOpenAddModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Player List
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative w-64">
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="played">Has Played</SelectItem>
                <SelectItem value="never">Never Played</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="points">Total Points</SelectItem>
                  <SelectItem value="lobbies">Lobbies</SelectItem>
                  <SelectItem value="lastPlayed">Last Played</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? "ASC" : "DESC"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Points</TableHead>
                <TableHead>Lobbies Played</TableHead>
                <TableHead>Last Played</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localPlayers
                .filter(player => {
                  const matchesSearch =
                    player.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    player.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    player.riotGameName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    player.riotGameTag?.toLowerCase().includes(searchQuery.toLowerCase());

                  if (filterStatus === "played") return matchesSearch && (player.lobbiesPlayed || 0) > 0;
                  if (filterStatus === "never") return matchesSearch && (player.lobbiesPlayed || 0) === 0;

                  return matchesSearch;
                })
                .sort((a, b) => {
                  let comparison = 0;
                  if (sortBy === "username") {
                    comparison = (a.username || "").localeCompare(b.username || "");
                  } else if (sortBy === "points") {
                    comparison = (a.totalPoints || 0) - (b.totalPoints || 0);
                  } else if (sortBy === "lobbies") {
                    comparison = (a.lobbiesPlayed || 0) - (b.lobbiesPlayed || 0);
                  } else if (sortBy === "lastPlayed") {
                    const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
                    const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
                    comparison = dateA - dateB;
                  }
                  return sortOrder === "asc" ? comparison : -comparison;
                })
                .map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={`/placeholder.svg`} />
                          <AvatarFallback>
                            {player.username ? player.username.slice(0, 2).toUpperCase() : 'PL'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div
                            className="font-medium cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleViewPlayer(player)}
                          >
                            {player.username || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {player.riotGameName && player.riotGameTag
                              ? `${player.riotGameName}#${player.riotGameTag}`
                              : 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{player.email || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="font-medium">{player.totalPoints || 0}</span>
                    </TableCell>
                    <TableCell>{player.lobbiesPlayed || 0}</TableCell>
                    <TableCell>
                      {player.lastPlayed ? new Date(player.lastPlayed).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enhanced Player Detail View */}
      {selectedPlayer && (
        <Card className="border-2 shadow-xl bg-slate-800 text-white">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 border-4 border-slate-600 shadow-lg">
                  <AvatarImage src={`/placeholder.svg`} />
                  <AvatarFallback className="text-xl font-bold bg-slate-600 text-white">
                    {selectedPlayer.username ? selectedPlayer.username.slice(0, 2).toUpperCase() : 'PL'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center">
                    <Users className="mr-3 h-6 w-6" />
                    {selectedPlayer.username}
                  </CardTitle>
                  <p className="text-slate-300 mt-1">
                    {selectedPlayer.riotGameName && selectedPlayer.riotGameTag
                      ? `${selectedPlayer.riotGameName}#${selectedPlayer.riotGameTag}`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDetail}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-3 text-slate-400">Loading player details...</span>
              </div>
            ) : playerDetail ? (
              <>
                {/* Stats Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-emerald-800 to-emerald-900 border-emerald-700 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-emerald-200 font-medium">Balance</p>
                          <p className="text-2xl font-bold text-white">
                            ${playerDetail.player.balance?.amount || 0}
                          </p>
                        </div>
                        <Wallet className="h-8 w-8 text-emerald-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-800 to-blue-900 border-blue-700 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-200 font-medium">Total Matches</p>
                          <p className="text-2xl font-bold text-white">
                            {playerDetail.stats.totalMatchesPlayed}
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-violet-800 to-violet-900 border-violet-700 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-violet-200 font-medium">Win Rate</p>
                          <p className="text-2xl font-bold text-white">
                            {playerDetail.stats.firstPlaceRate}%
                          </p>
                        </div>
                        <Trophy className="h-8 w-8 text-violet-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-800 to-amber-900 border-amber-700 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-amber-200 font-medium">Avg Placement</p>
                          <p className="text-2xl font-bold text-white">
                            {playerDetail.stats.averagePlacement || 'N/A'}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-amber-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Username:</span>
                        <span className="text-sm">{playerDetail.player.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{playerDetail.player.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Riot Game Name:</span>
                        <span className="text-sm">{playerDetail.player.riotGameName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Riot Tag:</span>
                        <span className="text-sm">{playerDetail.player.riotGameTag || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Region:</span>
                        <span className="text-sm">{playerDetail.player.region || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Rank:</span>
                        <Badge variant="outline">{playerDetail.player.rank || 'Unranked'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Referred By:</span>
                        <span className="text-sm">{playerDetail.player.referrer || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={playerDetail.player.isActive ? 'default' : 'destructive'}>
                          {playerDetail.player.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Trophy className="mr-2 h-4 w-4" />
                      Performance Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Matches:</span>
                        <span className="text-sm">{playerDetail.stats.totalMatchesPlayed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Lobbies Played:</span>
                        <span className="text-sm">{playerDetail.stats.lobbiesPlayed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Average Placement:</span>
                        <span className="text-sm">{playerDetail.stats.averagePlacement}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">First Place Count:</span>
                        <span className="text-sm">{playerDetail.stats.firstPlaceCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Top 4 Count:</span>
                        <span className="text-sm">{playerDetail.stats.topFourCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Top 4 Rate:</span>
                        <span className="text-sm">{playerDetail.stats.topFourRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Points:</span>
                        <span className="text-sm">{playerDetail.stats.totalPoints}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Points Per Match:</span>
                        <span className="text-sm">{playerDetail.stats.totalPointsPerMatch}</span>
                      </div>
                      {playerDetail.stats.recentPlacements.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Recent Form:</span>
                          <div className="flex gap-1">
                            {playerDetail.stats.recentPlacements.map((p, i) => (
                              <Badge key={i} variant={p <= 4 ? 'default' : 'secondary'} className="text-xs">
                                #{p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Account Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Balance:</span>
                      <span className="text-sm font-bold text-green-400">
                        ${playerDetail.player.balance?.amount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Referred By:</span>
                      <span className="text-sm">{playerDetail.player.referrer || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Account Created:</span>
                      <span className="text-sm">
                        {playerDetail.player.createdAt ? new Date(playerDetail.player.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lobby History */}
                {playerDetail.lobbies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Trophy className="mr-2 h-4 w-4" />
                      Lobby History ({playerDetail.lobbies.length})
                    </h3>
                    <Card className="bg-slate-700 border-slate-600">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-slate-300">Lobby</TableHead>
                              <TableHead className="text-slate-300">Status</TableHead>
                              <TableHead className="text-slate-300">Points</TableHead>
                              <TableHead className="text-slate-300">Matches</TableHead>
                              <TableHead className="text-slate-300">Avg Place</TableHead>
                              <TableHead className="text-slate-300">Joined</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {playerDetail.lobbies.map((lobby) => (
                              <TableRow key={lobby.lobbyId} className="border-slate-600">
                                <TableCell className="text-white font-medium">{lobby.lobbyName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{lobby.status}</Badge>
                                </TableCell>
                                <TableCell className="text-white">{lobby.totalPoints}</TableCell>
                                <TableCell className="text-white">{lobby.matchesPlayed}</TableCell>
                                <TableCell className="text-white">{lobby.averagePlacement.toFixed(1)}</TableCell>
                                <TableCell className="text-slate-400 text-sm">
                                  {new Date(lobby.joinedAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Match History */}
                {playerDetail.matchHistory.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <History className="mr-2 h-4 w-4" />
                      Recent Matches ({playerDetail.matchHistory.length})
                    </h3>
                    <Card className="bg-slate-700 border-slate-600">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-slate-300">Lobby</TableHead>
                              <TableHead className="text-slate-300">Placement</TableHead>
                              <TableHead className="text-slate-300">Points</TableHead>
                              <TableHead className="text-slate-300">Status</TableHead>
                              <TableHead className="text-slate-300">Played At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {playerDetail.matchHistory.map((match) => (
                              <TableRow key={match.matchId} className="border-slate-600">
                                <TableCell className="text-white font-medium">{match.lobbyName}</TableCell>
                                <TableCell>
                                  <Badge variant={match.placement <= 4 ? 'default' : 'secondary'}>
                                    #{match.placement}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-white">{match.points}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{match.status}</Badge>
                                </TableCell>
                                <TableCell className="text-slate-400 text-sm">
                                  {new Date(match.playedAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Recent Transactions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center text-white">
                      <History className="mr-2 h-5 w-5" />
                      Recent Transactions
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          New Transaction
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                        <DropdownMenuItem
                          onClick={() => handleOpenTransactionModal('deposit')}
                          className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                        >
                          <ArrowDownRight className="mr-2 h-4 w-4 text-emerald-400" />
                          Deposit Funds
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenTransactionModal('withdraw')}
                          className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                        >
                          <ArrowUpRight className="mr-2 h-4 w-4 text-rose-400" />
                          Withdraw Funds
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-0">
                      {playerDetail.transactions && playerDetail.transactions.length > 0 ? (
                        <div className="space-y-0">
                          {playerDetail.transactions.map((transaction) => {
                            const isPositive = ['deposit', 'reward', 'refund'].includes(transaction.type);
                            return (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between p-4 border-b border-slate-600 last:border-b-0 hover:bg-slate-600/50 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-full ${isPositive
                                    ? 'bg-emerald-900/50 text-emerald-400'
                                    : 'bg-rose-900/50 text-rose-400'
                                    }`}>
                                    {isPositive ? (
                                      <ArrowDownRight className="h-4 w-4" />
                                    ) : (
                                      <ArrowUpRight className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-white capitalize">
                                        {transaction.type.replace('_', ' ')}
                                      </span>
                                      <Badge variant="outline" className={`
                                        ${['completed', 'success'].includes(transaction.status) ? 'border-emerald-600 text-emerald-400' : ''}
                                        ${transaction.status === 'pending' ? 'border-amber-600 text-amber-400' : ''}
                                        ${transaction.status === 'failed' ? 'border-rose-600 text-rose-400' : ''}
                                      `}>
                                        {transaction.status}
                                      </Badge>
                                    </div>
                                    {transaction.refId && (
                                      <p className="text-sm text-slate-400">Ref: {transaction.refId}</p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                      {new Date(transaction.createdAt).toLocaleDateString()} at {new Date(transaction.createdAt).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {isPositive ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <History className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                          <p className="text-slate-400">No transactions yet</p>
                          <p className="text-sm text-slate-500 mt-2">
                            Start by making a deposit or withdrawal
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Actions */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-700 bg-slate-900 p-4 rounded-lg">

                  <Button
                    variant="destructive"
                    onClick={handleDeleteInline}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Player
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-400">Failed to load player details</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Modal */}
      <Dialog open={openTransactionModal} onOpenChange={setOpenTransactionModal}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white">
              {transactionType === 'deposit' ? (
                <>
                  <ArrowDownRight className="mr-2 h-5 w-5 text-emerald-400" />
                  Deposit Funds
                </>
              ) : (
                <>
                  <ArrowUpRight className="mr-2 h-5 w-5 text-rose-400" />
                  Withdraw Funds
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player" className="text-slate-300">Player</Label>
              <div className="flex items-center space-x-2 p-3 bg-slate-700 rounded-lg border border-slate-600">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`/placeholder.svg`} />
                  <AvatarFallback className="text-xs bg-slate-600 text-white">
                    {selectedPlayer?.username ? selectedPlayer.username.slice(0, 2).toUpperCase() : 'PL'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-white">{selectedPlayer?.username}</span>
                <span className="text-sm text-slate-400 ml-auto">
                  Current Balance: ${playerDetail?.player.balance?.amount || 0}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-300">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Enter transaction description..."
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500"
              />
            </div>

            {transactionAmount && (
              <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-300">Transaction Type:</span>
                  <Badge variant={transactionType === 'deposit' ? 'default' : 'destructive'} className={transactionType === 'deposit' ? 'bg-emerald-800 text-emerald-200 border-emerald-600' : 'bg-rose-800 text-rose-200 border-rose-600'}>
                    {transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-medium text-slate-300">New Balance:</span>
                  <span className={`font-bold text-lg ${transactionType === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${transactionType === 'deposit'
                      ? ((playerDetail?.player.balance?.amount || 0) + parseFloat(transactionAmount)).toFixed(2)
                      : ((playerDetail?.player.balance?.amount || 0) - parseFloat(transactionAmount)).toFixed(2)
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTransactionModal(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </Button>
            <Button
              onClick={handleTransaction}
              disabled={!transactionAmount || parseFloat(transactionAmount) <= 0}
              className={transactionType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
            >
              {transactionType === 'deposit' ? (
                <>
                  <ArrowDownRight className="mr-2 h-4 w-4" />
                  Deposit
                </>
              ) : (
                <>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Withdraw
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Only Add Player Modal remains */}
      <AddPlayerModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onCreate={handleCreatePlayer}
      />
    </div>
  )
}