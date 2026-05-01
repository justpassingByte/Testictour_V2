"use client"

import { useState, useEffect } from "react"
import {
  Receipt, Search, ArrowDownRight, ArrowUpRight, DollarSign,
  TrendingUp, Wallet, RefreshCw, Filter, MoreVertical, CheckCircle, XCircle
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from "@/app/lib/apiConfig"
import { useCurrency } from "@/app/contexts/currency-context"
import { formatCurrency } from "@/lib/utils"

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
  prize: { label: "Prize", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: "out" },
  escrow_fund: { label: "Escrow Fund", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", icon: "out" },
  escrow_release: { label: "Escrow Release", color: "bg-teal-500/10 text-teal-500 border-teal-500/20", icon: "in" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: "Success", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  paid: { label: "Paid", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  pending_payment: { label: "Pending Payment", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  matched_late: { label: "Matched Late", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  expired: { label: "Expired", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
}

export default function PartnerTransactionsPage() {
  const { currency, usdToVndRate } = useCurrency()
  const displayMoneyFromUsd = (amountUsd: number) => {
    const displayAmount = currency === "VND" ? amountUsd * usdToVndRate : amountUsd
    return formatCurrency(displayAmount, currency)
  }

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Record<string, { total: number; count: number }>>({})
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await api.get(`/partner/transactions?${params}`)
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

  const totalEntryFees = stats.entry_fee?.total || 0
  const totalRewards = stats.reward?.total || 0
  const totalEscrow = (stats.escrow_fund?.total || 0) + (stats.escrow_release?.total || 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Giao dịch</h1>
          <p className="text-muted-foreground text-sm">Quản lý tất cả giao dịch từ giải đấu của bạn.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards — partner-specific metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Tổng phí tham gia", value: totalEntryFees, icon: ArrowDownRight, color: "orange" },
          { label: "Tổng tiền thưởng", value: totalRewards, icon: ArrowUpRight, color: "purple" },
          { label: "Tổng Escrow", value: totalEscrow, icon: Wallet, color: "cyan" },
        ].map(card => (
          <Card key={card.label} className={`border-${card.color}-500/20 bg-${card.color}-500/5`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[11px] text-${card.color}-400 font-semibold uppercase tracking-wide`}>{card.label}</p>
                <card.icon className={`h-4 w-4 text-${card.color}-500`} />
              </div>
              <p className={`text-2xl font-bold text-${card.color}-500`}>{displayMoneyFromUsd(card.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Có <span className="font-semibold text-white">{total}</span> giao dịch
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Input
              placeholder="Tìm theo ID, user..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="pl-8 h-9 text-xs"
            />
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải giao dịch...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Chưa có giao dịch nào</p>
              <p className="text-xs mt-1">Khi người chơi đăng ký giải đấu có phí, giao dịch sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Ngày</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Giải đấu</TableHead>
                  <TableHead className="w-[80px]">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => {
                  const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, color: "bg-slate-500/10 text-slate-400", icon: "out" as const }
                  const statusConfig = STATUS_CONFIG[tx.status] || { label: tx.status, color: "bg-slate-500/10 text-slate-400" }
                  const isIn = typeConfig.icon === "in"

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </TableCell>
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
                        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${isIn ? "text-green-500" : "text-red-500"}`}>
                        {isIn ? "+" : "-"}{displayMoneyFromUsd(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {tx.tournament?.name || "—"}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">
                        {tx.id.substring(0, 8)}...
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
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">{total} giao dịch</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Trước
            </Button>
            <span className="text-sm">Trang {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
