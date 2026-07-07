"use client"
import { useEffect, useState } from "react"
import { useAdminUserStore } from "@/app/stores/adminUserStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ArrowUpDown, Loader2, Users, Trophy, Target, TrendingUp, Wallet, History, Coins, Plus, UserPlus, Gamepad2 } from "lucide-react"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"
import AddUserModal, { AddUserData } from "@/components/dashboard/admin/AddUserModal"
import { toast } from "@/components/ui/use-toast"

interface PlayerDetail {
  id: string
  username: string
  email: string
  role: string
  riotGameName?: string
  riotGameTag?: string
  region?: string
  rank?: string
  isActive: boolean
  createdAt: string
  balance?: number | { amount: number; coins?: number }
  coins?: number
  totalMatchesPlayed: number
  averagePlacement: number
  topFourRate: number
  firstPlaceRate: number
  tournamentsPlayed?: number
  tournamentsWon?: number
  transactions?: any[]
}

export default function AdminPlayersPage() {
  const t = useTranslations("common")
  const users = useAdminUserStore((s) => s.users)
  const loading = useAdminUserStore((s) => s.loading)
  const setRoleFilter = useAdminUserStore((s) => s.setRoleFilter)
  const banUser = useAdminUserStore((s) => s.banUser)
  const updateUser = useAdminUserStore((s) => s.updateUser)
  const createUser = useAdminUserStore((s) => s.createUser)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("username")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [openAddUser, setOpenAddUser] = useState(false)

  // Player detail sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [balanceCurrency, setBalanceCurrency] = useState<"vnd" | "coins">("vnd")
  const [balanceType, setBalanceType] = useState<"deposit" | "withdraw">("deposit")
  const [balanceAmount, setBalanceAmount] = useState("")
  const [balanceUpdating, setBalanceUpdating] = useState(false)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [lobbies, setLobbies] = useState<any[]>([])
  const [assignmentOptionsLoading, setAssignmentOptionsLoading] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const [selectedLobbyId, setSelectedLobbyId] = useState("")
  const [joinAsReserve, setJoinAsReserve] = useState(false)
  const [assigningTournament, setAssigningTournament] = useState(false)
  const [assigningLobby, setAssigningLobby] = useState(false)

  useEffect(() => {
    setRoleFilter("")
  }, [setRoleFilter])

  useEffect(() => {
    if (!sheetOpen) return

    const fetchAssignmentOptions = async () => {
      setAssignmentOptionsLoading(true)
      try {
        const [tournamentRes, lobbyRes] = await Promise.all([
          api.get("/tournaments"),
          api.get("/minitour-lobbies"),
        ])
        setTournaments(tournamentRes.data?.tournaments || [])
        setLobbies(lobbyRes.data?.data || [])
      } catch (error) {
        console.error("Failed to fetch assignment options:", error)
        toast({ title: "Load failed", description: "Could not load tournaments or lobbies.", variant: "destructive" })
      } finally {
        setAssignmentOptionsLoading(false)
      }
    }

    fetchAssignmentOptions()
  }, [sheetOpen])

  const handleCreatePlayer = async (data: AddUserData) => {
    await createUser({ ...data, role: data.role || "user" })
    setOpenAddUser(false)
    toast({ title: "Player created", description: `${data.riotGameName || data.username} has been created.` })
  }

  const handlePlayerClick = async (id: string) => {
    setSheetOpen(true)
    setSelectedPlayer(null)
    setIsEditing(false)
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/users/${id}`)
      setSelectedPlayer(res.data)
      setEditForm(res.data)
    } catch (error) {
      console.error('Failed to fetch player detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSaveBasicInfo = async () => {
    if (!selectedPlayer) return;
    try {
      await updateUser(selectedPlayer.id, {
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
        riotGameName: editForm.riotGameName,
        riotGameTag: editForm.riotGameTag,
        region: editForm.region,
      });
      const res = await api.get(`/admin/users/${selectedPlayer.id}`);
      setSelectedPlayer(res.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update basic info:', error);
    }
  }

  const getVndBalance = (player: PlayerDetail | null) => {
    if (!player) return 0
    return typeof player.balance === "number" ? player.balance : player.balance?.amount || 0
  }
  const getCoinBalance = (player: PlayerDetail | null) => {
    if (!player) return 0
    return typeof player.balance === "number" ? player.coins || 0 : player.balance?.coins ?? player.coins ?? 0
  }
  const formatVnd = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value)
  const formatBalanceAmount = (value: number, currency: "vnd" | "coins") =>
    currency === "coins" ? `${value.toLocaleString("vi-VN")} Coin` : formatVnd(value)

  const handleBalanceUpdate = async () => {
    if (!selectedPlayer) return
    const amount = Number(balanceAmount)
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setBalanceUpdating(true)
    try {
      await api.post(`/admin/users/${selectedPlayer.id}/deposit`, {
        amount,
        currency: balanceCurrency,
        type: balanceType,
      })
      const res = await api.get(`/admin/users/${selectedPlayer.id}`)
      setSelectedPlayer(res.data)
      setBalanceAmount("")
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to update balance")
    } finally {
      setBalanceUpdating(false)
    }
  }

  const handleAssignTournament = async () => {
    if (!selectedPlayer || !selectedTournamentId) return

    setAssigningTournament(true)
    try {
      await api.post(`/tournaments/${selectedTournamentId}/assign-player`, {
        userId: selectedPlayer.id,
        joinAsReserve,
      })
      toast({ title: "Assigned", description: `${selectedPlayer.username} has been assigned to the tournament.` })
      setSelectedTournamentId("")
      setJoinAsReserve(false)
    } catch (error: any) {
      toast({
        title: "Assign failed",
        description: error?.message || "Could not assign player to tournament.",
        variant: "destructive",
      })
    } finally {
      setAssigningTournament(false)
    }
  }

  const handleAssignLobby = async () => {
    if (!selectedPlayer || !selectedLobbyId) return

    setAssigningLobby(true)
    try {
      await api.post(`/minitour-lobbies/${selectedLobbyId}/assign-player`, { userId: selectedPlayer.id })
      toast({ title: "Assigned", description: `${selectedPlayer.username} has been assigned to the lobby.` })
      setSelectedLobbyId("")
    } catch (error: any) {
      toast({
        title: "Assign failed",
        description: error?.message || "Could not assign player to lobby.",
        variant: "destructive",
      })
    } finally {
      setAssigningLobby(false)
    }
  }

  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "username":
          cmp = a.username.localeCompare(b.username);
          break;
        case "balance":
          cmp = (a.balance || 0) - (b.balance || 0);
          break;
        case "tournamentsPlayed":
          cmp = (a.tournamentsPlayed || 0) - (b.tournamentsPlayed || 0);
          break;
        case "tournamentsWon":
          cmp = (a.tournamentsWon || 0) - (b.tournamentsWon || 0);
          break;
        case "performance":
          cmp = (a.topFourRate || 0) - (b.topFourRate || 0);
          if (cmp === 0) {
            cmp = (a.firstPlaceRate || 0) - (b.firstPlaceRate || 0);
          }
          break;
        default:
          cmp = 0;
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

  const statCards = selectedPlayer ? [
    { label: "VND Balance", value: formatVnd(getVndBalance(selectedPlayer)), icon: Wallet, color: "emerald" },
    { label: "Coin Balance", value: `${getCoinBalance(selectedPlayer).toLocaleString("vi-VN")} Coin`, icon: Coins, color: "amber" },
    { label: t("matches", { defaultValue: "Matches" }), value: selectedPlayer.totalMatchesPlayed || 0, icon: Target, color: "blue" },
    { label: t("avg_placement", { defaultValue: "Avg Place" }), value: selectedPlayer.averagePlacement || "N/A", icon: TrendingUp, color: "amber" },
    { label: t("first_place_rate", { defaultValue: "1st Rate" }), value: `${selectedPlayer.firstPlaceRate || 0}%`, icon: Trophy, color: "violet" },
  ] : []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("players_and_users", { defaultValue: "Players & Users" })}</h1>
          <p className="text-muted-foreground text-sm">{t("manage_user_accounts", { defaultValue: "Manage all user accounts. Click a row to view details." })}</p>
        </div>
        <Button onClick={() => setOpenAddUser(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Player
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input placeholder={t("search_users", { defaultValue: "Search users..." })} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center border rounded-md">
          <Select value={sortBy} onValueChange={(val) => {
            setSortBy(val)
            if (val !== "username" && val !== "balance") {
              setSortOrder("desc")
            }
          }}>
            <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0">
              <ArrowUpDown className="mr-2 h-4 w-4 shrink-0" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="username">{t("username", { defaultValue: "Username" })}</SelectItem>
              <SelectItem value="balance">{t("balance", { defaultValue: "Balance" })}</SelectItem>
              <SelectItem value="tournamentsPlayed">Số giải tham gia</SelectItem>
              <SelectItem value="tournamentsWon">Số giải thắng</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setSortOrder(s => s === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? t("asc", { defaultValue: "ASC" }) : t("desc", { defaultValue: "DESC" })}
          </Button>
        </div>
      </div>

      <Card className="bg-card/60 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t("no_users_found", { defaultValue: "No users found." })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("user", { defaultValue: "User" })}</TableHead>
                  <TableHead>{t("email", { defaultValue: "Email" })}</TableHead>
                  <TableHead>{t("role", { defaultValue: "Role" })}</TableHead>
                  <TableHead>Hiệu suất</TableHead>
                  <TableHead className="text-right">{t("balance", { defaultValue: "Balance" })}</TableHead>
                  <TableHead className="text-right">{t("action", { defaultValue: "Actions" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-white/5 cursor-pointer"
                    onClick={() => handlePlayerClick(user.id)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium hover:text-violet-400 transition-colors">{user.username}</div>
                          <div className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          user.role === 'partner' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs gap-1">
                        <span className="text-muted-foreground whitespace-nowrap">
                          Giải: <span className="text-foreground font-medium">{user.tournamentsPlayed || 0}</span> (Thắng <span className="text-emerald-400 font-medium">{user.tournamentsWon || 0}</span>)
                        </span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          Top 4: <span className="text-violet-400 font-medium">{user.topFourRate || 0}%</span> | Top 1: <span className="text-amber-400 font-medium">{user.firstPlaceRate || 0}%</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      {(user.balance || 0).toLocaleString()} đ
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        onClick={() => banUser(user.id)}
                      >
                        {user.isActive === false ? t("unban", { defaultValue: "Unban" }) : t("ban", { defaultValue: "Ban" })}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Player Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-background/95 backdrop-blur-xl border-white/10">
          {detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPlayer ? (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white/10">
                      <AvatarFallback className="text-lg">{selectedPlayer.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl">{selectedPlayer.username}</SheetTitle>
                      <SheetDescription>{selectedPlayer.email}</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {isEditing ? (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sửa thông tin cơ bản</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Username</label>
                        <Input value={editForm.username || ''} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Email</label>
                        <Input value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Riot Name</label>
                        <Input value={editForm.riotGameName || ''} onChange={e => setEditForm({...editForm, riotGameName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Riot Tag</label>
                        <Input value={editForm.riotGameTag || ''} onChange={e => setEditForm({...editForm, riotGameTag: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Region</label>
                        <Input value={editForm.region || ''} onChange={e => setEditForm({...editForm, region: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v})}>
                          <SelectTrigger className="w-full text-left"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Player</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleSaveBasicInfo}>Lưu thay đổi</Button>
                      <Button variant="outline" className="flex-1" onClick={() => { setIsEditing(false); setEditForm(selectedPlayer); }}>Hủy bỏ</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Status badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={
                    selectedPlayer.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      selectedPlayer.role === 'partner' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }>{selectedPlayer.role}</Badge>
                  <Badge variant="outline" className={selectedPlayer.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {selectedPlayer.isActive ? t("active", { defaultValue: "Active" }) : t("banned", { defaultValue: "Banned" })}
                  </Badge>
                  {selectedPlayer.rank && (
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20">{selectedPlayer.rank}</Badge>
                  )}
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {statCards.map((s) => (
                    <Card key={s.label} className={`bg-gradient-to-br from-${s.color}-500/10 to-${s.color}-600/5 border-${s.color}-500/20`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-[10px] text-${s.color}-400 font-medium uppercase`}>{s.label}</p>
                            <p className="text-lg font-bold">{s.value}</p>
                          </div>
                          <s.icon className={`h-5 w-5 text-${s.color}-400`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Info */}
                <Card className="bg-card/60 border-white/10">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("account_info", { defaultValue: "Account Info" })}</h4>
                    {[
                      { label: "Riot ID", value: selectedPlayer.riotGameName && selectedPlayer.riotGameTag ? `${selectedPlayer.riotGameName}#${selectedPlayer.riotGameTag}` : "N/A" },
                      { label: t("region", { defaultValue: "Region" }), value: selectedPlayer.region || "N/A" },
                      { label: t("top_4_rate", { defaultValue: "Top 4 Rate" }), value: `${selectedPlayer.topFourRate || 0}%` },
                      { label: t("tournaments", { defaultValue: "Tournaments" }), value: selectedPlayer.tournamentsPlayed || 0 },
                      { label: t("wins", { defaultValue: "Wins" }), value: selectedPlayer.tournamentsWon || 0 },
                      { label: t("joined", { defaultValue: "Joined" }), value: new Date(selectedPlayer.createdAt).toLocaleDateString() },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{String(item.value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-card/60 border-white/10">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Balance Update</h4>
                      <p className="text-xs text-muted-foreground">
                        Current: {formatVnd(getVndBalance(selectedPlayer))} / {getCoinBalance(selectedPlayer).toLocaleString("vi-VN")} Coin
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={balanceCurrency} onValueChange={(value: "vnd" | "coins") => setBalanceCurrency(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vnd">VND</SelectItem>
                          <SelectItem value="coins">Coin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={balanceType} onValueChange={(value: "deposit" | "withdraw") => setBalanceType(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Add</SelectItem>
                          <SelectItem value="withdraw">Subtract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder={balanceCurrency === "coins" ? "Coin amount" : "VND amount"}
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                      />
                      <Button onClick={handleBalanceUpdate} disabled={balanceUpdating || !balanceAmount}>
                        {balanceUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                      </Button>
                    </div>
                    {balanceAmount && (
                      <p className="text-xs text-muted-foreground">
                        {balanceType === "deposit" ? "Add" : "Subtract"} {formatBalanceAmount(Number(balanceAmount) || 0, balanceCurrency)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/60 border-white/10">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assignments</h4>
                      <p className="text-xs text-muted-foreground">Assign this player to active tournaments or MiniTour lobbies.</p>
                    </div>
                    {assignmentOptionsLoading ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading options...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Trophy className="h-3.5 w-3.5" /> Tournament
                          </label>
                          <div className="flex gap-2">
                            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                              <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Select tournament" /></SelectTrigger>
                              <SelectContent>
                                {tournaments.map((tournament) => (
                                  <SelectItem key={tournament.id} value={tournament.id}>
                                    {tournament.name} ({tournament.registered || tournament.actualParticipantsCount || 0}/{tournament.maxPlayers})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleAssignTournament} disabled={!selectedTournamentId || assigningTournament}>
                              {assigningTournament ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            </Button>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={joinAsReserve} onChange={(e) => setJoinAsReserve(e.target.checked)} /> Assign as reserve
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Gamepad2 className="h-3.5 w-3.5" /> MiniTour Lobby
                          </label>
                          <div className="flex gap-2">
                            <Select value={selectedLobbyId} onValueChange={setSelectedLobbyId}>
                              <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Select lobby" /></SelectTrigger>
                              <SelectContent>
                                {lobbies.map((lobby) => (
                                  <SelectItem key={lobby.id} value={lobby.id}>
                                    {lobby.name} ({lobby.currentPlayers}/{lobby.maxPlayers})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleAssignLobby} disabled={!selectedLobbyId || assigningLobby}>
                              {assigningLobby ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Transactions */}
                {selectedPlayer.transactions && selectedPlayer.transactions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" /> {t("recent_transactions", { defaultValue: "Recent Transactions" })}
                    </h4>
                    <div className="space-y-2">
                      {selectedPlayer.transactions.slice(0, 8).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-medium capitalize">{tx.type.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground ml-2">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                          {(() => {
                            // Amount may already be negative (debit) in DB
                            const raw = tx.amount
                            const isCredit = tx.type === 'deposit' || tx.type === 'reward' || tx.type === 'prize' || tx.type === 'refund'
                            const txCurrency = tx.currency === 'coins' ? 'coins' : 'vnd'
                            return (
                              <span className={isCredit ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                {isCredit ? '+' : '-'}{formatBalanceAmount(Math.abs(raw), txCurrency)}
                              </span>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("admin_actions", { defaultValue: "Admin Actions" })}</h4>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Sửa thông tin cơ bản</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive" size="sm" className="w-full"
                      onClick={() => { banUser(selectedPlayer.id); setSheetOpen(false) }}
                    >
                      {selectedPlayer.isActive ? t("ban_user", { defaultValue: "Ban User" }) : t("unban_user", { defaultValue: "Unban User" })}
                    </Button>
                  </div>
                </div>
              </>
              )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("failed_to_load_player_details", { defaultValue: "Failed to load player details." })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AddUserModal
        open={openAddUser}
        onClose={() => setOpenAddUser(false)}
        onCreate={handleCreatePlayer}
      />
    </div>
  )
}
