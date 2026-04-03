"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Plus, Users, Trophy, Target, TrendingUp, History, Loader2,
    ChevronDown, Search, Filter, ArrowUpDown, MoreHorizontal,
    Play, RefreshCw, Edit, Trash2, X, Star, Coins, UserPlus, Info
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import api from "@/app/lib/apiConfig"
import { MiniTourLobby, MiniTourMatch, MiniTourLobbyParticipant, useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { AssignPlayersDialog } from "./AssignPlayersDialog"
import { toast } from "@/components/ui/use-toast"
import { MatchResultDetail } from "./MatchResultDetail"

interface LobbiesTabClientProps {
    initialLobbies: MiniTourLobby[]
    onLobbiesUpdate?: (lobbies: MiniTourLobby[]) => void
}

export default function LobbiesTabClient({ initialLobbies, onLobbiesUpdate }: LobbiesTabClientProps) {
    const router = useRouter()
    const { lobby: storeLobby, startLobby, syncMatch, deleteLobby, submitManualResult, isProcessingAction, syncingMatchId } = useMiniTourLobbyStore()

    const [localLobbies, setLocalLobbies] = useState<MiniTourLobby[]>(initialLobbies)
    const [selectedLobby, setSelectedLobby] = useState<MiniTourLobby | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<string>("name")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [isAssignPlayersDialogOpen, setIsAssignPlayersDialogOpen] = useState(false)

    // Sync selectedLobby with storeLobby if they refer to the same lobby
    useEffect(() => {
        if (storeLobby && selectedLobby && storeLobby.id === selectedLobby.id) {
            setSelectedLobby(storeLobby)
        }
    }, [storeLobby, selectedLobby])

    // Sync with prop from parent
    useEffect(() => {
        setLocalLobbies(initialLobbies)
    }, [initialLobbies])

    const refreshLobbies = async () => {
        try {
            const response = await api.get('/minitour-lobbies')
            if (response.data?.data) {
                setLocalLobbies(response.data.data)
                if (onLobbiesUpdate) {
                    onLobbiesUpdate(response.data.data)
                }

                // If we have a selected lobby, refresh its details too
                if (selectedLobby) {
                    const updatedSelected = response.data.data.find((l: MiniTourLobby) => l.id === selectedLobby.id)
                    // Only update if we don't have the more detailed version from storeLobby
                    if (updatedSelected && (!storeLobby || storeLobby.id !== updatedSelected.id)) {
                        setSelectedLobby(updatedSelected)
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing lobbies:', error)
        }
    }

    const handleViewLobby = async (lobby: MiniTourLobby) => {
        setSelectedLobby(lobby)
        setDetailLoading(true)

        try {
            const response = await api.get(`/minitour-lobbies/${lobby.id}`)
            if (response.data?.data) {
                setSelectedLobby(response.data.data)
            }
        } catch (error) {
            console.error('Error fetching lobby detail:', error)
            toast({
                title: "Error",
                description: "Failed to fetch lobby details.",
                variant: "destructive"
            })
        } finally {
            setDetailLoading(false)
        }
    }

    const handleCloseDetail = () => {
        setSelectedLobby(null)
    }

    const handleStartLobby = async (lobbyId: string) => {
        try {
            await startLobby(lobbyId)
            refreshLobbies()
        } catch (error) {
            console.error('Error starting lobby:', error)
        }
    }

    const handleSyncMatches = async (lobbyId: string) => {
        try {
            await syncMatch(lobbyId)
            refreshLobbies()
        } catch (error) {
            console.error('Error syncing matches:', error)
        }
    }

    const handleManualResultSubmit = async (lobbyId: string, placements: { userId: string; placement: number }[]) => {
        try {
            await submitManualResult(lobbyId, placements)
            refreshLobbies()
        } catch (error) {
            console.error('Error submitting manual results:', error)
        }
    }

    const handleDeleteLobby = async (lobbyId: string) => {
        if (window.confirm("Are you sure you want to delete this lobby? This action cannot be undone.")) {
            try {
                await deleteLobby(lobbyId, router, onLobbiesUpdate)
                setSelectedLobby(null)
                refreshLobbies()
            } catch (error) {
                console.error("Failed to delete lobby:", error)
            }
        }
    }

    const filteredLobbies = localLobbies
        .filter(lobby => {
            const matchesSearch = lobby.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lobby.gameMode.toLowerCase().includes(searchQuery.toLowerCase())

            if (filterStatus === "all") return matchesSearch
            return matchesSearch && lobby.status === filterStatus
        })
        .sort((a, b) => {
            let comparison = 0
            if (sortBy === "name") comparison = a.name.localeCompare(b.name)
            else if (sortBy === "entryFee") comparison = a.entryFee - b.entryFee
            else if (sortBy === "prizePool") comparison = a.prizePool - b.prizePool
            else if (sortBy === "players") comparison = a.currentPlayers - b.currentPlayers
            else if (sortBy === "date") comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

            return sortOrder === "asc" ? comparison : -comparison
        })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Lobbies</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                        Total Lobbies: {localLobbies.length}
                    </span>
                    <Link href="/dashboard/partner/lobbies">
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Lobby
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center">
                        <Trophy className="mr-2 h-5 w-5" />
                        Lobby List
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="relative w-64">
                            <Input
                                placeholder="Search lobbies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[140px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="WAITING">Waiting</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center border rounded-md">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0">
                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="entryFee">Entry Fee</SelectItem>
                                    <SelectItem value="prizePool">Prize Pool</SelectItem>
                                    <SelectItem value="players">Players</SelectItem>
                                    <SelectItem value="date">Created Date</SelectItem>
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
                                <TableHead>Lobby Name</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Players</TableHead>
                                <TableHead className="text-center">Entry Fee</TableHead>
                                <TableHead className="text-center">Prize Pool</TableHead>
                                <TableHead className="text-center">Game Mode</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLobbies.map((lobby) => (
                                <TableRow key={lobby.id}>
                                    <TableCell>
                                        <div
                                            className="font-medium cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => handleViewLobby(lobby)}
                                        >
                                            {lobby.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(lobby.createdAt).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className={`
                        ${lobby.status === "WAITING" ? "bg-green-500/20 text-green-500" : ""}
                        ${lobby.status === "IN_PROGRESS" ? "bg-yellow-500/20 text-yellow-500" : ""}
                        ${(lobby.status === "COMPLETED" || lobby.status === "CANCELLED") ? "bg-red-500/20 text-red-500" : ""}
                      `}
                                        >
                                            {lobby.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {lobby.currentPlayers}/{lobby.maxPlayers}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center">
                                            <Coins className="mr-1 h-3 w-3" />
                                            {lobby.entryFee}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center">
                                            <Coins className="mr-1 h-3 w-3" />
                                            {lobby.prizePool}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary">{lobby.gameMode}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredLobbies.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No lobbies found matching your criteria
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Lobby Detail View */}
            {selectedLobby && (
                <Card className="border-2 shadow-xl bg-slate-800 text-white">
                    <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-slate-600 rounded-lg">
                                    <Trophy className="h-8 w-8 text-yellow-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center">
                                        {selectedLobby.name}
                                        <Badge
                                            className="ml-3 bg-white/20 text-white border-white/30"
                                            variant="outline"
                                        >
                                            {selectedLobby.status}
                                        </Badge>
                                    </CardTitle>
                                    <p className="text-slate-300 mt-1">
                                        {selectedLobby.gameMode} • {selectedLobby.skillLevel}
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
                                <span className="ml-3 text-slate-400">Loading lobby details...</span>
                            </div>
                        ) : (
                            <>
                                {/* Lobby Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card className="bg-gradient-to-br from-blue-800 to-blue-900 border-blue-700 text-white">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-blue-200 font-medium">Players</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        {selectedLobby.currentPlayers} / {selectedLobby.maxPlayers}
                                                    </p>
                                                </div>
                                                <Users className="h-8 w-8 text-blue-400" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-emerald-800 to-emerald-900 border-emerald-700 text-white">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-emerald-200 font-medium">Prize Pool</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        {selectedLobby.prizePool}
                                                    </p>
                                                </div>
                                                <Coins className="h-8 w-8 text-emerald-400" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-violet-800 to-violet-900 border-violet-700 text-white">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-violet-200 font-medium">Entry Fee</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        {selectedLobby.entryFee}
                                                    </p>
                                                </div>
                                                <Target className="h-8 w-8 text-violet-400" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-amber-800 to-amber-900 border-amber-700 text-white">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-amber-200 font-medium">Matches</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        {selectedLobby.matches?.length || 0}
                                                    </p>
                                                </div>
                                                <History className="h-8 w-8 text-amber-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Basic Info */}
                                    <div className="md:col-span-1 space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center">
                                            <Info className="mr-2 h-4 w-4" />
                                            Lobby Information
                                        </h3>
                                        <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Created:</span>
                                                <span className="text-sm">{new Date(selectedLobby.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Game:</span>
                                                <span className="text-sm">{selectedLobby.gameMode}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Region:</span>
                                                <span className="text-sm">Vietnam</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-400">Auto Start:</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {selectedLobby.settings?.autoStart ? "Enabled" : "Disabled"}
                                                </Badge>
                                            </div>
                                            <div className="pt-2">
                                                <span className="text-sm text-slate-400 block mb-1">Description:</span>
                                                <p className="text-sm text-slate-200 line-clamp-3">
                                                    {selectedLobby.description || "No description provided."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => handleStartLobby(selectedLobby.id)}
                                                disabled={selectedLobby.status !== "WAITING" || isProcessingAction}
                                            >
                                                <Play className="mr-2 h-4 w-4" /> Start Lobby
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600"
                                                onClick={() => handleSyncMatches(selectedLobby.id)}
                                                disabled={selectedLobby.status === "WAITING" || isProcessingAction}
                                            >
                                                <RefreshCw className={`mr-2 h-4 w-4 ${isProcessingAction ? 'animate-spin' : ''}`} /> Fetch Results
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Participants */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <Users className="mr-2 h-4 w-4" />
                                                Participants ({selectedLobby.currentPlayers})
                                            </h3>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-primary hover:text-primary-foreground"
                                                onClick={() => setIsAssignPlayersDialogOpen(true)}
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" /> Assign Player
                                            </Button>
                                        </div>
                                        <Card className="bg-slate-700 border-slate-600">
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-slate-600">
                                                            <TableHead className="text-slate-300">Player</TableHead>
                                                            <TableHead className="text-slate-300">Game Name</TableHead>
                                                            <TableHead className="text-slate-300">Joined At</TableHead>
                                                            <TableHead className="text-right text-slate-300">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedLobby.participants?.map((p) => (
                                                            <TableRow key={p.id} className="border-slate-600">
                                                                <TableCell>
                                                                    <div className="flex items-center space-x-2">
                                                                        <Avatar className="h-6 w-6">
                                                                            <AvatarFallback className="text-[10px] bg-slate-500">
                                                                                {p.user?.username ? p.user.username.slice(0, 2).toUpperCase() : "??"}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="text-sm font-medium">{p.user?.username || "Unknown Player"}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-sm text-slate-300">
                                                                    {p.user?.riotGameName && p.user?.riotGameTag
                                                                        ? `${p.user.riotGameName}#${p.user.riotGameTag}`
                                                                        : "N/A"
                                                                    }
                                                                </TableCell>
                                                                <TableCell className="text-sm text-slate-400">
                                                                    {new Date(p.joinedAt).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-900/20">
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(!selectedLobby.participants || selectedLobby.participants.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                                                                    No players assigned yet.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Match History */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <History className="mr-2 h-4 w-4" />
                                        Match History ({selectedLobby.matches?.length || 0})
                                    </h3>
                                    {selectedLobby.matches && selectedLobby.matches.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedLobby.matches.map((match) => (
                                                <MatchResultDetail
                                                    key={match.id}
                                                    match={match}
                                                    lobby={selectedLobby}
                                                    onSync={handleSyncMatches}
                                                    onManualSubmit={handleManualResultSubmit}
                                                    isSyncing={syncingMatchId === match.id}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <Card className="bg-slate-700 border-slate-600">
                                            <CardContent className="p-8 text-center">
                                                <p className="text-slate-400">No matches have been played in this lobby yet.</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Enhanced Actions */}
                                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-700 bg-slate-900 p-4 rounded-lg">
                                    <Link href={`/dashboard/partner/lobbies/${selectedLobby.id}`}>
                                        <Button variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
                                            <Edit className="mr-2 h-4 w-4" /> Full Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDeleteLobby(selectedLobby.id)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Lobby
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <AssignPlayersDialog
                lobbyId={selectedLobby?.id || ""}
                isOpen={isAssignPlayersDialogOpen}
                onOpenChange={setIsAssignPlayersDialogOpen}
                onSuccess={refreshLobbies}
            />
        </div>
    )
}
