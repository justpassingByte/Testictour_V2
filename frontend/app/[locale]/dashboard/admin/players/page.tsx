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
import { Search, ArrowUpDown, Loader2, Users, Trophy, Target, TrendingUp, Wallet, History, DollarSign } from "lucide-react"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"

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
  balance?: { amount: number }
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

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setLocalRoleFilter] = useState("all")
  const [sortBy, setSortBy] = useState("username")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Player detail sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setRoleFilter("")
  }, [setRoleFilter])

  const handlePlayerClick = async (id: string) => {
    setSheetOpen(true)
    setSelectedPlayer(null)
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/users/${id}`)
      setSelectedPlayer(res.data)
    } catch (error) {
      console.error('Failed to fetch player detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = roleFilter === "all" || u.role === roleFilter
      return matchesSearch && matchesRole
    })
    .sort((a, b) => {
      const cmp = sortBy === "username"
        ? a.username.localeCompare(b.username)
        : (a.balance || 0) - (b.balance || 0)
      return sortOrder === "asc" ? cmp : -cmp
    })

  const statCards = selectedPlayer ? [
    { label: t("balance", { defaultValue: "Balance" }), value: `${(selectedPlayer.balance?.amount || 0).toLocaleString()} đ`, icon: Wallet, color: "emerald" },
    { label: t("matches", { defaultValue: "Matches" }), value: selectedPlayer.totalMatchesPlayed || 0, icon: Target, color: "blue" },
    { label: t("avg_placement", { defaultValue: "Avg Place" }), value: selectedPlayer.averagePlacement || "N/A", icon: TrendingUp, color: "amber" },
    { label: t("first_place_rate", { defaultValue: "1st Rate" }), value: `${selectedPlayer.firstPlaceRate || 0}%`, icon: Trophy, color: "violet" },
  ] : []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("players_and_users", { defaultValue: "Players & Users" })}</h1>
        <p className="text-muted-foreground text-sm">{t("manage_user_accounts", { defaultValue: "Manage all user accounts. Click a row to view details." })}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input placeholder={t("search_users", { defaultValue: "Search users..." })} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={roleFilter} onValueChange={setLocalRoleFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("role", { defaultValue: "Role" })} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_roles", { defaultValue: "All Roles" })}</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="user">{t("player", { defaultValue: "Player" })}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-md">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] border-none shadow-none focus:ring-0">
              <ArrowUpDown className="mr-2 h-4 w-4" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="username">{t("username", { defaultValue: "Username" })}</SelectItem>
              <SelectItem value="balance">{t("balance", { defaultValue: "Balance" })}</SelectItem>
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
                            const isCredit = tx.type === 'deposit' || tx.type === 'reward' || tx.type === 'prize' || raw > 0
                            return (
                              <span className={isCredit ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                {isCredit ? '+' : '-'}{Math.abs(raw).toLocaleString()} đ
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
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("admin_actions", { defaultValue: "Admin Actions" })}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive" size="sm" className="w-full"
                      onClick={() => { banUser(selectedPlayer.id); setSheetOpen(false) }}
                    >
                      {selectedPlayer.isActive ? t("ban_user", { defaultValue: "Ban User" }) : t("unban_user", { defaultValue: "Unban User" })}
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("failed_to_load_player_details", { defaultValue: "Failed to load player details." })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
