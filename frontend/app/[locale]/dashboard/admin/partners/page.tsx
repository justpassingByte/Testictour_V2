"use client"
import { useState, useEffect } from "react"
import { useAdminUserStore } from "@/app/stores/adminUserStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search, Filter, ArrowUpDown, Plus, Loader2, Handshake, ExternalLink, RefreshCw,
  DollarSign, Users, Gamepad2, TrendingUp, X
} from "lucide-react"
import { PartnerData, MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import AddUserModal from "@/components/dashboard/admin/AddUserModal"
import { useTranslations } from "next-intl"

// Import partner components for the slide drawer
import { OverviewTabNew } from "../../partner/components/OverviewTabNew"
import { LobbiesTab, RevenueTab } from "../../partner/components/PartnerServerComponents"
import { AnalyticsTabNew } from "../../partner/components/AnalyticsTabNew"
import AdminPartnerSubscriptionTab from "../components/AdminPartnerSubscriptionTab"
import PartnerTransactionsTab from "../components/PartnerTransactionsTab"

export default function AdminPartnersPage() {
  const t = useTranslations("common")
  const users = useAdminUserStore((state) => state.users)
  const loading = useAdminUserStore((state) => state.loading)
  const fetchUsers = useAdminUserStore((state) => state.fetchUsers)
  const setRoleFilter = useAdminUserStore((state) => state.setRoleFilter)
  const createUser = useAdminUserStore((state) => state.createUser)
  const banUser = useAdminUserStore((state) => state.banUser)
  const fetchPartnerDetail = useAdminUserStore((state) => state.fetchPartnerDetail)
  const selectedPartnerDetail = useAdminUserStore((state) => state.selectedPartnerDetail)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("username")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [openAddUser, setOpenAddUser] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetPartnerId, setSheetPartnerId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setRoleFilter("partner")
  }, [setRoleFilter])

  const handleCreateUser = async (data: any) => {
    await createUser(data)
    setOpenAddUser(false)
  }

  const handlePartnerClick = async (id: string) => {
    setSheetOpen(true)
    setSheetPartnerId(id)
    setDetailLoading(true)
    try {
      await fetchPartnerDetail(id)
    } finally {
      setDetailLoading(false)
    }
  }

  const partners = users
    .filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch && user.role === 'partner'
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "username") comparison = a.username.localeCompare(b.username)
      else if (sortBy === "balance") comparison = (a.balance || 0) - (b.balance || 0)
      return sortOrder === "asc" ? comparison : -comparison
    })

  // Map partner detail to PartnerData for child components
  const partnerData: PartnerData | null = selectedPartnerDetail ? {
    id: selectedPartnerDetail.partner.id,
    username: selectedPartnerDetail.partner.username,
    email: selectedPartnerDetail.partner.email,
    monthlyRevenue: selectedPartnerDetail.stats.monthlyRevenue,
    totalRevenue: selectedPartnerDetail.stats.totalRevenue,
    totalPlayers: selectedPartnerDetail.stats.totalPlayers,
    totalLobbies: selectedPartnerDetail.stats.totalLobbies,
    activeLobbies: selectedPartnerDetail.stats.activeLobbies,
    balance: selectedPartnerDetail.stats.balance || 0,
    totalMatches: selectedPartnerDetail.stats.totalMatches || 0,
    revenueShare: 30,
    lobbyStatuses: selectedPartnerDetail.stats.lobbyStatuses,
  } as PartnerData : null

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("partners", { defaultValue: "Partners" })}</h1>
          <p className="text-muted-foreground text-sm">{t("manage_partner_accounts", { defaultValue: "Manage all partner accounts and their dashboards." })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("partners_count", { count: partners.length, defaultValue: `${partners.length} partners` })}</span>
          <Button onClick={() => setOpenAddUser(true)} className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700">
            <Plus className="mr-2 h-4 w-4" /> {t("add_partner", { defaultValue: "Add Partner" })}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input placeholder={t("search_partners", { defaultValue: "Search partners..." })} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center border rounded-md">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t("sort_by", { defaultValue: "Sort by" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="username">{t("username", { defaultValue: "Username" })}</SelectItem>
              <SelectItem value="balance">{t("balance", { defaultValue: "Balance" })}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? t("asc", { defaultValue: "ASC" }) : t("desc", { defaultValue: "DESC" })}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("no_partners_found", { defaultValue: "No partners found" })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("partner", { defaultValue: "Partner" })}</TableHead>
                  <TableHead>{t("email", { defaultValue: "Email" })}</TableHead>
                  <TableHead>{t("subscription", { defaultValue: "Subscription" })}</TableHead>
                  <TableHead className="text-right">{t("balance", { defaultValue: "Balance" })}</TableHead>
                  <TableHead className="text-right">{t("action", { defaultValue: "Actions" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((user) => (
                  <TableRow key={user.id} className="hover:bg-white/5 cursor-pointer" onClick={() => handlePartnerClick(user.id)}>
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
                      {user.subscriptionPlan ? (
                        <Badge variant="outline" className={`text-xs ${
                          user.subscriptionPlan === 'PRO' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          user.subscriptionPlan === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {user.subscriptionPlan}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      {user.balance?.toLocaleString()} đ
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        onClick={() => banUser(user.id)}>
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

      {/* Partner Detail Slide Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-white/10">
          {detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPartnerDetail && partnerData ? (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <SheetHeader>
                  <SheetTitle className="text-2xl flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{selectedPartnerDetail.partner.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {selectedPartnerDetail.partner.username}
                  </SheetTitle>
                  <SheetDescription>{selectedPartnerDetail.partner.email}</SheetDescription>
                </SheetHeader>

                {/* Tabbed Detail Sections */}
                <Tabs defaultValue="overview" className="space-y-4 pt-2">
                  <TabsList className="w-full justify-start overflow-x-auto no-scrollbar h-auto shrink-0">
                    <TabsTrigger value="overview">{t("overview", { defaultValue: "Overview" })}</TabsTrigger>
                    <TabsTrigger value="lobbies">{t("lobbies", { defaultValue: "Lobbies" })}</TabsTrigger>
                    <TabsTrigger value="transactions">{t("transactions", { defaultValue: "Transactions" })}</TabsTrigger>
                    <TabsTrigger value="subscription">{t("subscription", { defaultValue: "Subscription" })}</TabsTrigger>
                    <TabsTrigger value="revenue">{t("revenue", { defaultValue: "Revenue" })}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-0">
                    <div className="overflow-hidden">
                      <OverviewTabNew partnerData={partnerData as any} lobbies={(selectedPartnerDetail.lobbies || []) as any} />
                    </div>
                  </TabsContent>
                  <TabsContent value="lobbies" className="mt-0">
                    <div className="overflow-hidden">
                      <LobbiesTab lobbies={(selectedPartnerDetail.lobbies || []) as any} onLobbiesUpdate={() => sheetPartnerId && fetchPartnerDetail(sheetPartnerId)} />
                    </div>
                  </TabsContent>
                  <TabsContent value="transactions" className="mt-0">
                    <div className="overflow-hidden">
                      <PartnerTransactionsTab transactions={selectedPartnerDetail.transactions || []} partnerName={selectedPartnerDetail.partner.username} />
                    </div>
                  </TabsContent>
                  <TabsContent value="subscription" className="mt-0">
                    <div className="overflow-hidden">
                      <AdminPartnerSubscriptionTab
                        partnerId={selectedPartnerDetail.partner.id}
                        partnerName={selectedPartnerDetail.partner.username}
                        currentSubscription={selectedPartnerDetail.subscription}
                        partnerBalance={partnerData?.balance || 0}
                        onUpdate={() => sheetPartnerId && fetchPartnerDetail(sheetPartnerId)}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="revenue" className="mt-0">
                    <div className="overflow-hidden">
                      <RevenueTab 
                        partnerData={partnerData as any} 
                        lobbies={(selectedPartnerDetail.lobbies || []) as any} 
                        tournaments={selectedPartnerDetail.tournaments}
                        ledger={selectedPartnerDetail.ledger}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("no_partner_data", { defaultValue: "No partner data available." })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AddUserModal open={openAddUser} onClose={() => setOpenAddUser(false)} onCreate={handleCreateUser} />
    </div>
  )
}
