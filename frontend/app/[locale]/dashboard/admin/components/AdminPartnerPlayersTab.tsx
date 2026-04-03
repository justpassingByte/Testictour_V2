"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Users, Edit, Trash2, Upload, Plus, DollarSign, X, Calendar, Trophy, Target, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, History, Loader2, ChevronDown, Search, Filter, ArrowUpDown } from "lucide-react"
import api from "@/app/lib/apiConfig"

// Simplified interface for the list
interface PartnerPlayer {
    id: string
    username: string
    email: string
    riotGameName: string
    riotGameTag: string
    totalPoints: number
    lobbiesPlayed: number
    lastPlayed: string | Date
}

// Detailed interface matching /admin/users/:id response roughly
interface AdminUserDetail {
    id: string
    username: string
    email: string
    riotGameName: string
    riotGameTag: string
    region: string
    balance: { amount: number }
    createdAt: string
    isActive: boolean
    role: string
    rank?: string
    totalMatchesPlayed: number
    averagePlacement: number
    topFourRate: number
    firstPlaceRate: number
    // ... other fields
    transactions?: any[]
    // matchHistory?: any[] // If available
}

interface AdminPartnerPlayersTabProps {
    players: PartnerPlayer[]
}

export default function AdminPartnerPlayersTab({ players: initialPlayers }: AdminPartnerPlayersTabProps) {
    const [localPlayers, setLocalPlayers] = useState<PartnerPlayer[]>(initialPlayers)
    const [selectedPlayer, setSelectedPlayer] = useState<PartnerPlayer | null>(null)
    const [playerDetail, setPlayerDetail] = useState<AdminUserDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<string>("username")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [filterStatus, setFilterStatus] = useState<string>("all")

    // Sync with prop from parent
    useEffect(() => {
        setLocalPlayers(initialPlayers)
    }, [initialPlayers])

    const handleViewPlayer = async (player: PartnerPlayer) => {
        setSelectedPlayer(player)
        setDetailLoading(true)
        setPlayerDetail(null)

        try {
            // Use Admin API to get user details
            const response = await api.get(`/admin/users/${player.id}`)
            if (response.data) {
                setPlayerDetail(response.data)
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
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Associated Players</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                        Total Players: {localPlayers.length}
                    </span>
                    {/* Admin actions could go here, e.g. Export */}
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
                                    <SelectItem value="points">Total Points (Partner)</SelectItem>
                                    <SelectItem value="lobbies">Lobbies (Partner)</SelectItem>
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
                                <TableHead>Total Points (Partner)</TableHead>
                                <TableHead>Lobbies Played (Partner)</TableHead>
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

            {/* Enhanced Player Detail View (Admin Version) */}
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
                                <span className="ml-3 text-slate-400">Loading user details...</span>
                            </div>
                        ) : playerDetail ? (
                            <>
                                {/* Stats Overview Cards (Global Stats) */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card className="bg-gradient-to-br from-emerald-800 to-emerald-900 border-emerald-700 text-white">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-emerald-200 font-medium">Balance</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        ${(playerDetail.balance?.amount || 0).toLocaleString()}
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
                                                        {playerDetail.totalMatchesPlayed}
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
                                                    <p className="text-sm text-violet-200 font-medium">1st Place Rate</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        {playerDetail.firstPlaceRate}%
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
                                                        {playerDetail.averagePlacement || 'N/A'}
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
                                                <span className="text-sm">{playerDetail.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Email:</span>
                                                <span className="text-sm">{playerDetail.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Riot Game Name:</span>
                                                <span className="text-sm">{playerDetail.riotGameName || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Riot Tag:</span>
                                                <span className="text-sm">{playerDetail.riotGameTag || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Rank:</span>
                                                <Badge variant="outline">{playerDetail.rank || 'Unranked'}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Role:</span>
                                                <span className="text-sm capitalize">{playerDetail.role}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Status:</span>
                                                <Badge variant={playerDetail.isActive ? 'default' : 'destructive'}>
                                                    {playerDetail.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
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
                                                    ${(playerDetail.balance?.amount || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Account Created:</span>
                                                <span className="text-sm">
                                                    {playerDetail.createdAt ? new Date(playerDetail.createdAt).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Transactions */}
                                {playerDetail.transactions && playerDetail.transactions.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center">
                                            <History className="mr-2 h-4 w-4" />
                                            Recent Transactions
                                        </h3>
                                        <Card className="bg-slate-700 border-slate-600">
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-slate-600">
                                                            <TableHead className="text-slate-300">Date</TableHead>
                                                            <TableHead className="text-slate-300">Type</TableHead>
                                                            <TableHead className="text-slate-300">Amount</TableHead>
                                                            <TableHead className="text-slate-300">Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {playerDetail.transactions.slice(0, 10).map((tx: any) => (
                                                            <TableRow key={tx.id} className="border-slate-600">
                                                                <TableCell className="text-slate-300">
                                                                    {new Date(tx.createdAt).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-slate-300 capitalize">{tx.type}</TableCell>
                                                                <TableCell className={tx.type === 'deposit' || tx.type === 'reward' ? 'text-green-400' : 'text-red-400'}>
                                                                    {tx.type === 'deposit' || tx.type === 'reward' ? '+' : '-'}
                                                                    ${tx.amount.toLocaleString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={tx.status === 'success' ? 'default' : tx.status === 'pending' ? 'outline' : 'destructive'}>
                                                                        {tx.status}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-red-400">Failed to load user detail.</div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
