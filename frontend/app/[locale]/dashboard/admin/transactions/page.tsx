"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Receipt, Search, ArrowDownRight, ArrowUpRight, DollarSign,
  TrendingUp, Wallet, RefreshCw, Filter, Users, MoreVertical, CheckCircle, XCircle
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import api from "@/app/lib/apiConfig"

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  createdAt: string
  refId?: string
  user?: { id: string; username: string; email: string; role: string }
  tournament?: { id: string; name: string }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: "in" | "out" }> = {
  deposit: { label: "Deposit", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: "in" },
  withdraw: { label: "Withdraw", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: "out" },
  refund: { label: "Refund", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: "in" },
  entry_fee: { label: "Entry Fee", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: "out" },
  reward: { label: "Reward", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: "in" },
  revenue_share: { label: "Revenue Share", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: "in" },
  prize: { label: "Prize", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: "out" },
  subscription_payment: { label: "Subscription", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: "out" },
  escrow_fund: { label: "Escrow Fund", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", icon: "out" },
  escrow_release: { label: "Escrow Release", color: "bg-teal-500/10 text-teal-500 border-teal-500/20", icon: "in" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: "Success", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Record<string, { total: number; count: number }>>({})
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await api.get(`/admin/settings/transactions?${params}`)
      if (res.data) {
        setTransactions(res.data.data || [])
        setTotalPages(res.data.pagination?.totalPages || 1)
        setTotal(res.data.pagination?.total || 0)
        setStats(res.data.stats || {})
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTransactions() }, [page, typeFilter, statusFilter])

  const handleSearch = () => { setPage(1); fetchTransactions() }

  const handleUpdateStatus = async (id: string, status: string) => {
    const note = window.prompt("Enter a review note or reason (optional):");
    if (note === null) return; // user cancelled
    setLoading(true);
    try {
      await api.put(`/admin/transactions/${id}/status`, { status, note });
      await fetchTransactions();
    } catch (err: any) {
      console.error(err);
      alert("Failed to update transaction status.");
      setLoading(false);
    }
  }

  // Filter by tab category
  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return transactions
    if (activeTab === 'partner') return transactions.filter(t => ['revenue_share', 'subscription_payment', 'withdraw'].includes(t.type))
    if (activeTab === 'player') return transactions.filter(t => ['entry_fee', 'reward', 'refund', 'deposit', 'prize'].includes(t.type))
    if (activeTab === 'escrow') return transactions.filter(t => t.type.startsWith('escrow') || t.tournament)
    return transactions
  }, [transactions, activeTab])

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const formatAmount = (amount: number, type: string) => {
    const isIn = TYPE_CONFIG[type]?.icon === "in"
    return `${isIn ? "+" : "-"}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  // Summary cards
  const totalDeposits = stats.deposit?.total || 0
  const totalWithdrawals = stats.withdraw?.total || 0
  const totalSubscriptions = stats.subscription_payment?.total || 0
  const totalPrizes = stats.prize?.total || 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm">Global view of all partner, player, and escrow transactions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Deposits", value: totalDeposits, icon: ArrowDownRight, color: "green" },
          { label: "Total Withdrawals", value: Math.abs(totalWithdrawals), icon: ArrowUpRight, color: "red" },
          { label: "Subscription Revenue", value: Math.abs(totalSubscriptions), icon: DollarSign, color: "indigo" },
          { label: "Prizes Distributed", value: Math.abs(totalPrizes), icon: Wallet, color: "purple" },
        ].map(card => (
          <Card key={card.label} className={`border-${card.color}-500/20 bg-${card.color}-500/5`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[11px] text-${card.color}-400 font-semibold uppercase tracking-wide`}>{card.label}</p>
                <card.icon className={`h-4 w-4 text-${card.color}-500`} />
              </div>
              <p className={`text-2xl font-bold text-${card.color}-500`}>${card.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Filters + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All ({total})</TabsTrigger>
            <TabsTrigger value="partner" className="text-xs">Partner</TabsTrigger>
            <TabsTrigger value="player" className="text-xs">Player</TabsTrigger>
            <TabsTrigger value="escrow" className="text-xs">Escrow</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Input placeholder="Search by ID, user..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-8 h-9 text-xs" />
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-card/60 border-white/10">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading transactions...</div>
            ) : filteredByTab.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredByTab.map(tx => {
                    const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, color: "bg-slate-500/10 text-slate-400", icon: "out" as const }
                    const statusConfig = STATUS_CONFIG[tx.status] || { label: tx.status, color: "bg-slate-500/10 text-slate-400" }
                    const isIn = typeConfig.icon === "in"

                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                        <TableCell>
                          {tx.user ? (
                            <div>
                              <p className="text-xs font-medium">{tx.user.username}</p>
                              <p className="text-[10px] text-muted-foreground">{tx.user.role}</p>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                            {isIn ? <ArrowDownRight className="h-3 w-3 mr-1" /> : <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold text-sm ${isIn ? "text-green-500" : "text-red-500"}`}>
                          {formatAmount(tx.amount, tx.type)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.tournament?.name ? tx.tournament.name.substring(0, 20) : "—"}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-mono">{tx.id.substring(0, 8)}...</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUpdateStatus(tx.id, 'paid')} className="text-green-500">
                                <CheckCircle className="mr-2 h-4 w-4" /> Force SUCCESS (Paid)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(tx.id, 'failed')} className="text-red-500">
                                <XCircle className="mr-2 h-4 w-4" /> Force FAILED
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(tx.id, 'pending')} className="text-yellow-500">
                                <RefreshCw className="mr-2 h-4 w-4" /> Set to PENDING
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">{total} transactions total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  )
}
