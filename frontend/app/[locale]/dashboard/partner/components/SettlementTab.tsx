"use client"

import { useState, useEffect } from "react"
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ShieldCheck, Clock, CheckCircle2, XCircle, Loader2,
  ArrowUpRight, ArrowDownRight, Banknote, Receipt,
  RefreshCw, ChevronDown, ChevronUp, FileText
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl";

// ---------- types ----------
interface SettlementReport {
  tournament: {
    id: string
    name: string
    status: string
    organizer: { id: string; username: string; email: string }
    registeredParticipants: number
    isCommunityMode: boolean
    escrowStatus: string | null
    escrowRequiredAmount: number
    communityThresholdSnapshot: number | null
  }
  escrow: {
    id: string
    status: string
    requiredAmount: number
    fundedAmount: number
    releasedAmount: number
    reconciliationStatus: string
    latestWebhookEventId: string | null
    lockedAt: string | null
    releasedAt: string | null
    cancelledAt: string | null
    disputedAt: string | null
  } | null
  summary: {
    organizerFunding: number
    organizerReturns: number
    participantFees: number
    refunds: number
    payouts: number
    platformFees: number
    pendingFunding: number
    pendingPayouts: number
    netPosition: number
  }
  sections: {
    organizerFunding: TransactionRow[]
    participantFees: TransactionRow[]
    refunds: TransactionRow[]
    payouts: TransactionRow[]
    organizerReturns: TransactionRow[]
  }
  outstandingIssues: OutstandingIssue[]
  generatedAt: string
}

interface TransactionRow {
  id: string
  type: string
  amount: number
  status: string
  createdAt: string
  refId?: string | null
  externalRefId?: string | null
  paymentMethod?: string | null
}

interface OutstandingIssue {
  kind: string
  transactionId: string
  type: string
  amount: number
  createdAt: string
}

interface TournamentOption {
  id: string
  name: string
  status: string
  escrowStatus: string | null
  isCommunityMode: boolean
}

// ---------- helpers ----------
const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function statusColor(s: string | null | undefined) {
  switch (s) {
    case "funded": case "locked": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "released": return "bg-blue-500/15 text-blue-400 border-blue-500/30"
    case "not_funded": case "partially_funded": return "bg-orange-500/15 text-orange-400 border-orange-500/30"
    case "cancelled": case "disputed": return "bg-red-500/15 text-red-400 border-red-500/30"
    default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
  }
}

function txStatusIcon(s: string) {
  if (s === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  if (s === "pending") return <Clock className="h-3.5 w-3.5 text-orange-400" />
  return <XCircle className="h-3.5 w-3.5 text-red-400" />
}

// ---------- component ----------
export default function SettlementTab() {
  const t = useTranslations("Common");
  const [tournaments, setTournaments] = useState<TournamentOption[]>([])
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [report, setReport] = useState<SettlementReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [tourLoading, setTourLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // Fetch partner tournaments
  useEffect(() => {
    (async () => {
      try {
        setTourLoading(true)
        const res = await api.get("/partner/tournaments")
        const list: TournamentOption[] = (res.data.tournaments || res.data.data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          escrowStatus: t.escrowStatus,
          isCommunityMode: t.isCommunityMode,
        }))
        setTournaments(list)
        if (list.length > 0) setSelectedTourId(list[0].id)
      } catch {
        console.error("Failed to load tournaments")
      } finally {
        setTourLoading(false)
      }
    })()
  }, [])

  // Fetch report when tournament changes
  useEffect(() => {
    if (!selectedTourId) return
    fetchReport(selectedTourId)
  }, [selectedTourId])

  async function fetchReport(id: string) {
    try {
      setLoading(true)
      const res = await api.get(`/tournaments/${id}/settlement-report`)
      setReport(res.data.report)
    } catch {
      console.error("Failed to load settlement report")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ---------- Empty / Loading states ----------
  if (tourLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <Card className="border-dashed border-2 border-zinc-700/50 bg-zinc-900/30">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300">{t("no_tournaments_found")}</h3>
          <p className="text-sm text-zinc-500 mt-1">{t("create_a_tournament_first_to_view_settle_desc")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("settlement_reports")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t("financial_summary_and_transaction_ledger_desc")}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-zinc-900 border border-zinc-700/70 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[240px]"
            value={selectedTourId || ""}
            onChange={e => setSelectedTourId(e.target.value)}
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || !selectedTourId}
            onClick={() => selectedTourId && fetchReport(selectedTourId)}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{t("refresh")}</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !report ? (
        <Card className="border-dashed border-2 border-zinc-700/50 bg-zinc-900/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-orange-500 mb-3" />
            <h3 className="text-lg font-semibold text-zinc-300">{t("report_unavailable")}</h3>
            <p className="text-sm text-zinc-500 mt-1">{t("could_not_load_the_settlement_report_for_desc")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tournament + Escrow Meta */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />{t("tournament_info")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">{t("name")}</span><span className="font-medium">{report.tournament.name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">{t("status")}</span><Badge variant="outline" className="capitalize">{report.tournament.status}</Badge></div>
                <div className="flex justify-between"><span className="text-zinc-400">{t("participants")}</span><span>{report.tournament.registeredParticipants}</span></div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">{t("mode")}</span>
                  {report.tournament.isCommunityMode ? (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{t("community")}</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs"><ShieldCheck className="h-3 w-3 mr-1" />{t("escrow_secured")}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {report.escrow && (
              <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-xl border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />{t("escrow_status")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">{t("status")}</span>
                    <Badge variant="outline" className={`capitalize text-xs ${statusColor(report.escrow.status)}`}>{report.escrow.status}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-400">{t("funded")}</span>
                      <span className="font-mono text-xs">{fmt(report.escrow.fundedAmount)} / {fmt(report.escrow.requiredAmount)}</span>
                    </div>
                    <Progress value={report.escrow.requiredAmount > 0 ? (report.escrow.fundedAmount / report.escrow.requiredAmount) * 100 : 0} className="h-2" />
                  </div>
                  <div className="flex justify-between"><span className="text-zinc-400">{t("released")}</span><span className="font-mono text-xs">{fmt(report.escrow.releasedAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">{t("reconciliation")}</span><Badge variant="outline" className={`capitalize text-xs ${statusColor(report.escrow.reconciliationStatus)}`}>{report.escrow.reconciliationStatus}</Badge></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15"><ArrowUpRight className="h-5 w-5 text-emerald-400" /></div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{fmt(report.summary.organizerFunding)}</p>
                    <p className="text-xs text-zinc-400">{t("organizer_funding")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/15"><Banknote className="h-5 w-5 text-blue-400" /></div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{fmt(report.summary.participantFees)}</p>
                    <p className="text-xs text-zinc-400">{t("participant_entry_fees")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15"><ArrowDownRight className="h-5 w-5 text-amber-400" /></div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{fmt(report.summary.payouts)}</p>
                    <p className="text-xs text-zinc-400">{t("prize_payouts")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${report.summary.netPosition >= 0 ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" : "from-red-500/10 to-red-500/5 border-red-500/20"}`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${report.summary.netPosition >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                    {report.summary.netPosition >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{fmt(report.summary.netPosition)}</p>
                    <p className="text-xs text-zinc-400">{t("net_position")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Breakdown */}
          <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-xl border border-white/10">
            <CardHeader>
              <CardTitle className="text-base">{t("financial_summary")}</CardTitle>
              <CardDescription>{t("overview_of_all_financial_flows_for_this_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-400 flex items-center gap-2"><ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />{t("organizer_funding")}</span>
                  <span className="font-mono font-medium text-emerald-400">+ {fmt(report.summary.organizerFunding)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-400 flex items-center gap-2"><Banknote className="h-3.5 w-3.5 text-blue-400" />{t("participant_entry_fees")}</span>
                  <span className="font-mono font-medium text-blue-400">+ {fmt(report.summary.participantFees)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-400 flex items-center gap-2"><ArrowDownRight className="h-3.5 w-3.5 text-red-400" />{t("organizer_returns")}</span>
                  <span className="font-mono font-medium text-red-400">- {fmt(report.summary.organizerReturns)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-400 flex items-center gap-2"><ArrowDownRight className="h-3.5 w-3.5 text-red-400" />{t("refunds")}</span>
                  <span className="font-mono font-medium text-red-400">- {fmt(report.summary.refunds)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-400 flex items-center gap-2"><ArrowDownRight className="h-3.5 w-3.5 text-amber-400" />{t("prize_payouts")}</span>
                  <span className="font-mono font-medium text-amber-400">- {fmt(report.summary.payouts)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-400 flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-purple-400" />{t("platform_fees")}</span>
                  <span className="font-mono font-medium text-purple-400">- {fmt(report.summary.platformFees)}</span>
                </div>
                {report.summary.pendingFunding > 0 && (
                  <div className="flex justify-between py-2 border-b border-zinc-800/60">
                    <span className="text-zinc-400 flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-orange-400" />{t("pending_funding")}</span>
                    <span className="font-mono font-medium text-orange-400">{fmt(report.summary.pendingFunding)}</span>
                  </div>
                )}
                {report.summary.pendingPayouts > 0 && (
                  <div className="flex justify-between py-2 border-b border-zinc-800/60">
                    <span className="text-zinc-400 flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-orange-400" />{t("pending_payouts")}</span>
                    <span className="font-mono font-medium text-orange-400">{fmt(report.summary.pendingPayouts)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 mt-1 rounded-lg bg-white/5 px-3">
                  <span className="font-semibold flex items-center gap-2">
                    {report.summary.netPosition >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}{t("net_position")}</span>
                  <span className={`font-mono font-bold text-lg ${report.summary.netPosition >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmt(report.summary.netPosition)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collapsible Transaction Sections */}
          {(["organizerFunding", "participantFees", "payouts", "refunds", "organizerReturns"] as const).map(key => {
            const rows = report.sections[key]
            if (!rows || rows.length === 0) return null

            const labels: Record<string, string> = {
              organizerFunding: "Organizer Funding Transactions",
              participantFees: "Participant Entry Fees",
              payouts: "Prize Payouts",
              refunds: "Refunds",
              organizerReturns: "Organizer Returns",
            }
            const isOpen = !!expandedSections[key]

            return (
              <Card key={key} className="bg-card/60 dark:bg-card/40 backdrop-blur-xl border border-white/10">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors rounded-t-xl"
                  onClick={() => toggleSection(key)}
                >
                  <span className="font-semibold text-sm">{labels[key]} ({rows.length})</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </button>
                {isOpen && (
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800/60">
                          <TableHead className="text-xs">{t("date")}</TableHead>
                          <TableHead className="text-xs">{t("amount")}</TableHead>
                          <TableHead className="text-xs">{t("status")}</TableHead>
                          <TableHead className="text-xs">{t("method")}</TableHead>
                          <TableHead className="text-xs">{t("reference")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(tx => (
                          <TableRow key={tx.id} className="border-zinc-800/40">
                            <TableCell className="text-xs text-zinc-400 font-mono">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-mono text-sm">{fmt(tx.amount)}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-xs">
                                {txStatusIcon(tx.status)}
                                <span className="capitalize">{tx.status}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-zinc-400">{tx.paymentMethod || "—"}</TableCell>
                            <TableCell className="text-xs text-zinc-500 font-mono max-w-[140px] truncate">{tx.externalRefId || tx.refId || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Outstanding Issues */}
          {report.outstandingIssues.length > 0 && (
            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Outstanding Issues ({report.outstandingIssues.length})
                </CardTitle>
                <CardDescription>{t("transactions_that_require_attention")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-red-500/20">
                      <TableHead className="text-xs">{t("issue")}</TableHead>
                      <TableHead className="text-xs">{t("type")}</TableHead>
                      <TableHead className="text-xs">{t("amount")}</TableHead>
                      <TableHead className="text-xs">{t("date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.outstandingIssues.map(issue => (
                      <TableRow key={issue.transactionId} className="border-red-500/10">
                        <TableCell>
                          <Badge variant="outline" className={issue.kind === "failed_transaction" ? "bg-red-500/15 text-red-400 border-red-500/30 text-xs" : "bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs"}>
                            {issue.kind === "failed_transaction" ? "Failed" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize">{issue.type.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(issue.amount)}</TableCell>
                        <TableCell className="text-xs text-zinc-400 font-mono">{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Generated At Footer */}
          <p className="text-xs text-zinc-600 text-right">
            Report generated at {new Date(report.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  )
}
