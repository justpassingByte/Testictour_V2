"use client"

import { useState, useEffect } from "react"
import { Loader2, UserPlus, UserMinus, Crown, Clock, AlertCircle, RefreshCw, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { ReservePlayerAPI } from "@/app/services/ParticipantService"

interface ReserveManagementTabProps {
  tournamentId: string
  lobbies?: any[] // Flat list of lobbies from all phases/rounds 
  onRefresh?: () => void
}

export default function ReserveManagementTab({ tournamentId, lobbies = [], onRefresh }: ReserveManagementTabProps) {
  const [reserves, setReserves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [selectedLobby, setSelectedLobby] = useState<string>("")
  const [selectedReserve, setSelectedReserve] = useState<string>("")

  const fetchReserves = async () => {
    setLoading(true)
    try {
      const data = await ReservePlayerAPI.listReserves(tournamentId)
      setReserves(data)
    } catch (err) {
      console.error("Failed to fetch reserves:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReserves() }, [tournamentId])

  const handleKickPlayer = async (lobbyId: string, targetUserId: string, playerName: string) => {
    const key = `kick-${lobbyId}-${targetUserId}`
    if (!window.confirm(`Kick "${playerName}" from this lobby? Reserve players will be notified.`)) return
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      const result = await ReservePlayerAPI.kickPlayer(lobbyId, targetUserId)
      toast({
        title: "✅ Player Kicked",
        description: result.message || `${playerName} removed. ${result.reserveCount} reserves notified.`,
      })
      onRefresh?.()
      await fetchReserves()
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.response?.data?.message || err.message || "Could not kick player.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleAssignReserve = async () => {
    if (!selectedLobby || !selectedReserve) {
      toast({ title: "Missing Selection", description: "Select both a lobby and a reserve player.", variant: "destructive" })
      return
    }
    const key = `assign-${selectedLobby}-${selectedReserve}`
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      const result = await ReservePlayerAPI.assignReserve(selectedLobby, selectedReserve)
      toast({
        title: "✅ Reserve Assigned",
        description: result.message || "Reserve player has been assigned to the lobby.",
      })
      setSelectedReserve("")
      onRefresh?.()
      await fetchReserves()
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.response?.data?.message || err.message || "Could not assign reserve.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  // Filter lobbies that are in manageable states
  const managableLobbies = lobbies.filter(l =>
    ['ADMIN_INTERVENTION', 'READY_CHECK', 'WAITING', 'GRACE_PERIOD'].includes(l.state)
  )

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wide">Reserve Queue</p>
            <p className="text-2xl font-bold mt-1 text-amber-400">{reserves.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Players waiting for a slot</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wide">Stuck Lobbies</p>
            <p className="text-2xl font-bold mt-1 text-red-400">{managableLobbies.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Lobbies available for intervention</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide">Total Lobbies</p>
            <p className="text-2xl font-bold mt-1 text-blue-400">{lobbies.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Across all rounds</p>
          </CardContent>
        </Card>
      </div>

      {/* Assign Reserve to Lobby */}
      {reserves.length > 0 && managableLobbies.length > 0 && (
        <Card className="bg-card/60 border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-400" />
              Assign Reserve to Lobby
            </CardTitle>
            <CardDescription>Pick a reserve player and assign them to a lobby that needs players.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={selectedLobby} onValueChange={setSelectedLobby}>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue placeholder="Select Lobby..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managableLobbies.map(lobby => (
                      <SelectItem key={lobby.id} value={lobby.id}>
                        {lobby.name || `Lobby ${lobby.id.slice(-6)}`} — <span className="text-amber-400">{lobby.state}</span> ({(lobby.participants as string[])?.length || 0} players)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={selectedReserve} onValueChange={setSelectedReserve}>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue placeholder="Select Reserve Player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reserves.map(r => (
                      <SelectItem key={r.userId} value={r.userId}>
                        {r.user?.riotGameName || r.user?.username || r.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAssignReserve}
                disabled={!selectedLobby || !selectedReserve || actionLoading[`assign-${selectedLobby}-${selectedReserve}`]}
                className="bg-amber-600 hover:bg-amber-700 shrink-0"
              >
                {actionLoading[`assign-${selectedLobby}-${selectedReserve}`]
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <UserPlus className="mr-2 h-4 w-4" />
                }
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reserve Queue Table */}
      <Card className="bg-card/60 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Reserve Queue ({reserves.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchReserves} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reserves.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reserve players registered.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Riot ID</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reserves.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.user?.username || 'Unknown'}</TableCell>
                    <TableCell className="text-sm">
                      {r.user?.riotGameName ? (
                        <span className="text-primary">{r.user.riotGameName}#{r.user.riotGameTag || ''}</span>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{r.user?.rank || 'Unranked'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.joinedAt ? new Date(r.joinedAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.paid ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}>
                        {r.paid ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lobby Player Management — Kick players from specific lobbies */}
      {managableLobbies.length > 0 && (
        <Card className="bg-card/60 border-red-500/15">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-red-400" />
              Lobby Player Management
            </CardTitle>
            <CardDescription>Remove absent players from stuck lobbies. Reserve players will be notified automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {managableLobbies.map(lobby => (
              <div key={lobby.id} className="border border-white/10 rounded-lg p-3 bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{lobby.name || `Lobby ${lobby.id.slice(-6)}`}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">{lobby.state}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{(lobby.participants as string[])?.length || 0} players</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {((lobby.participants as string[]) || []).map((userId: string) => (
                    <Button
                      key={userId}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-colors"
                      disabled={actionLoading[`kick-${lobby.id}-${userId}`]}
                      onClick={() => handleKickPlayer(lobby.id, userId, userId.slice(0, 8))}
                    >
                      {actionLoading[`kick-${lobby.id}-${userId}`]
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <UserMinus className="h-3 w-3" />
                      }
                      {userId.slice(0, 8)}...
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No manageable lobbies info */}
      {managableLobbies.length === 0 && reserves.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-blue-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>No lobbies are currently in a state that allows intervention (ADMIN_INTERVENTION, READY_CHECK, WAITING). Reserve assignments can only be made when a lobby is waiting for players.</span>
        </div>
      )}
    </div>
  )
}
