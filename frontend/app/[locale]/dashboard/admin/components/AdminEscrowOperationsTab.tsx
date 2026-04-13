"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Loader2, Ban, PlayCircle, ChevronDown, ChevronUp,
  FileText, Eye, RotateCcw, DollarSign, Siren, Copy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import api from "@/app/lib/apiConfig";

// ---------- types ----------
interface PendingProof {
  id: string;
  type: string;
  amount: number;
  status: string;
  tournamentId: string;
  tournamentName?: string;
  createdAt: string;
  proofUrl?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
}

interface UnreconciledWebhook {
  id: string;
  type: string;
  amount: number;
  status: string;
  tournamentId: string;
  tournamentName?: string;
  createdAt: string;
  externalRefId?: string | null;
  paymentMethod?: string | null;
  lastRetryAt?: string | null;
  retryCount?: number;
}

interface PendingPayout {
  id: string;
  amount: number;
  status: string;
  tournamentId: string;
  tournamentName?: string;
  createdAt: string;
  proofUrl?: string | null;
  payoutMeta?: any;
  user?: {
    id: string;
    gameName?: string;
    displayName?: string;
    email?: string;
    discordId?: string;
    puuid?: string;
  };
}

interface DisputedEscrow {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  status: string;
  fundedAmount: number;
  requiredAmount: number;
  disputedAt?: string | null;
}

interface OperationQueues {
  pendingProofs: PendingProof[];
  unreconciled: UnreconciledWebhook[];
  pendingPayouts: PendingPayout[];
  disputed: DisputedEscrow[];
  history: PendingProof[];
}

// ---------- helpers ----------
const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const relTime = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

function statusBadge(s: string) {
  const c =
    s === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    s === "pending" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
    s === "disputed" ? "bg-red-500/15 text-red-400 border-red-500/30" :
    "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return <Badge variant="outline" className={`capitalize text-xs ${c}`}>{s}</Badge>;
}

// ---------- Review Modal ----------
type ReviewAction = "approved" | "rejected";

function ReviewModal({
  tx, open, onClose, onDone
}: { tx: PendingProof | PendingPayout | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState<ReviewAction>("approved");
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!tx) return;
    try {
      setLoading(true); setError(null);
      await api.post(`/admin/escrow/transactions/${tx.id}/review`, { approved: action === "approved", note, proofUrl });
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Review Proof
          </DialogTitle>
          <DialogDescription>
            {tx?.tournamentName && `Tournament: ${tx.tournamentName} · `}
            Amount: {fmt(tx?.amount ?? 0)}
          </DialogDescription>
        </DialogHeader>
        {tx?.proofUrl && (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <a href={tx.proofUrl.startsWith('http') ? tx.proofUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}${tx.proofUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 text-sm text-blue-400 transition-colors">
              <Eye className="h-4 w-4" /> View Proof Document
            </a>
          </div>
        )}
        <div className="flex gap-3">
          {(["approved", "rejected"] as ReviewAction[]).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                action === a
                  ? a === "approved" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-red-500/20 border-red-500/50 text-red-300"
                  : "bg-zinc-900 border-zinc-700/60 text-zinc-400"
              }`}
            >
              {a === "approved" ? <><CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />Approve</> : <><XCircle className="inline h-3.5 w-3.5 mr-1" />Reject</>}
            </button>
          ))}
        </div>
        {action === "approved" && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Proof of Payment URL (Optional)</span>
            <input
              type="text"
              placeholder="https://.../receipt.jpg"
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-md p-2 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        )}
        <Textarea
          placeholder="Internal review note (optional)…"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="bg-zinc-900/80 border-zinc-700/60 resize-none text-sm"
          rows={3}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Component ----------
export default function AdminEscrowOperationsTab() {
  const [queues, setQueues] = useState<OperationQueues | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [reviewTx, setReviewTx] = useState<PendingProof | PendingPayout | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const fetchQueues = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await api.get("/admin/escrow/queues");
      setQueues(res.data.queues || res.data.data || res.data);
    } catch {
      setError("Failed to load operational queues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  async function retryTransaction(txId: string) {
    setActionLoading(p => ({ ...p, [txId]: true }));
    try {
      await api.post(`/admin/escrow/transactions/${txId}/retry`);
      await fetchQueues();
    } catch { /* silently show stale state */ }
    finally { setActionLoading(p => ({ ...p, [txId]: false })); }
  }

  async function releasePayout(txId: string, tournamentId: string) {
    setActionLoading(p => ({ ...p, [txId]: true }));
    try {
      await api.post(`/admin/tournaments/${tournamentId}/payouts/release`);
      await fetchQueues();
    } catch { } finally { setActionLoading(p => ({ ...p, [txId]: false })); }
  }

  async function markDisputed(tournamentId: string) {
    setActionLoading(p => ({ ...p, [tournamentId]: true }));
    try {
      await api.post(`/admin/tournaments/${tournamentId}/dispute`);
      await fetchQueues();
    } catch { } finally { setActionLoading(p => ({ ...p, [tournamentId]: false })); }
  }

  async function cancelEscrow(tournamentId: string) {
    setActionLoading(p => ({ ...p, [tournamentId]: true }));
    try {
      await api.post(`/admin/tournaments/${tournamentId}/escrow/cancel`);
      await fetchQueues();
    } catch { } finally { setActionLoading(p => ({ ...p, [tournamentId]: false })); }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="flex justify-between"><Skeleton className="h-8 w-64" /><Skeleton className="h-8 w-24" /></div>
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  const proofs = queues?.pendingProofs ?? [];
  const unreconciled = queues?.unreconciled ?? [];
  const payouts = queues?.pendingPayouts ?? [];
  const disputed = queues?.disputed ?? [];
  const history = queues?.history ?? [];
  const totalIssues = proofs.length + unreconciled.length + payouts.length + disputed.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Siren className="h-5 w-5 text-orange-400" /> Escrow Operations
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review proofs, handle disputes, approve payouts, and retry failed webhooks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalIssues > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {totalIssues} item{totalIssues !== 1 ? "s" : ""} need attention
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={fetchQueues} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pending Proofs", count: proofs.length, icon: FileText, color: "orange" },
          { label: "Unreconciled Webhooks", count: unreconciled.length, icon: RotateCcw, color: "yellow" },
          { label: "Pending Payouts", count: payouts.length, icon: DollarSign, color: "blue" },
          { label: "Disputed Escrows", count: disputed.length, icon: ShieldAlert, color: "red" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className={`bg-${color}-500/5 border-${color}-500/15`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-${color}-500/15`}>
                <Icon className={`h-4 w-4 text-${color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="proofs">
        <TabsList className="bg-zinc-900/50 border border-white/10">
          <TabsTrigger value="proofs" className="gap-2 data-[state=active]:bg-primary/20">
            <FileText className="h-3.5 w-3.5" /> Pending Proofs
            {proofs.length > 0 && <Badge className="h-4 text-[10px] bg-orange-500/30 text-orange-300 ml-1">{proofs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2 data-[state=active]:bg-primary/20">
            <RotateCcw className="h-3.5 w-3.5" /> Unreconciled
            {unreconciled.length > 0 && <Badge className="h-4 text-[10px] bg-yellow-500/30 text-yellow-300 ml-1">{unreconciled.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="payouts" className="gap-2 data-[state=active]:bg-primary/20">
            <DollarSign className="h-3.5 w-3.5" /> Payout Release
            {payouts.length > 0 && <Badge className="h-4 text-[10px] bg-blue-500/30 text-blue-300 ml-1">{payouts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-2 data-[state=active]:bg-primary/20">
            <ShieldAlert className="h-3.5 w-3.5" /> Disputes
            {disputed.length > 0 && <Badge className="h-4 text-[10px] bg-red-500/30 text-red-300 ml-1">{disputed.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary/20">
            <Clock className="h-3.5 w-3.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* ── Pending Proofs ─────────────────────────────────────── */}
        <TabsContent value="proofs" className="mt-4">
          <Card className="bg-card/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Manual Proof Review Queue</CardTitle>
              <CardDescription className="text-xs">Organizers who submitted bank transfer / manual payment proof awaiting admin review.</CardDescription>
            </CardHeader>
            <CardContent>
              {proofs.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" /> No pending proofs — you&apos;re all caught up!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/60">
                      <TableHead className="text-xs">Tournament</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Submitted</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proofs.map(tx => (
                      <TableRow key={tx.id} className="border-zinc-800/40">
                        <TableCell className="text-sm">{tx.tournamentName || tx.tournamentId.slice(0,8)+"…"}</TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">{tx.type.replace(/_/g," ")}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(tx.amount)}</TableCell>
                        <TableCell>{statusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{relTime(tx.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setReviewTx(tx)}>
                            <Eye className="h-3 w-3" /> Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Unreconciled Webhooks ──────────────────────────────── */}
        <TabsContent value="webhooks" className="mt-4">
          <Card className="bg-card/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Unreconciled Webhook Events</CardTitle>
              <CardDescription className="text-xs">Transactions whose payment provider callbacks were received but not yet matched or confirmed. Retry to re-attempt reconciliation.</CardDescription>
            </CardHeader>
            <CardContent>
              {unreconciled.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" /> No unreconciled webhooks.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/60">
                      <TableHead className="text-xs">Tournament</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Provider</TableHead>
                      <TableHead className="text-xs">Retries</TableHead>
                      <TableHead className="text-xs">Age</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unreconciled.map(tx => (
                      <TableRow key={tx.id} className="border-zinc-800/40">
                        <TableCell className="text-sm">{tx.tournamentName || tx.tournamentId.slice(0,8)+"…"}</TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">{tx.type.replace(/_/g," ")}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(tx.amount)}</TableCell>
                        <TableCell className="text-xs">{tx.paymentMethod || "—"}</TableCell>
                        <TableCell className="text-xs text-center">
                          <Badge variant="outline" className={`text-xs ${(tx.retryCount ?? 0) > 2 ? "text-red-400 border-red-500/30" : "text-zinc-400 border-zinc-600"}`}>
                            {tx.retryCount ?? 0}×
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{relTime(tx.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm" variant="outline" className="gap-1 h-7 text-xs"
                            disabled={!!actionLoading[tx.id]}
                            onClick={() => retryTransaction(tx.id)}
                          >
                            {actionLoading[tx.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            Retry
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pending Payout Release ─────────────────────────────── */}
        <TabsContent value="payouts" className="mt-4">
          <Card className="bg-card/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pending Payout Approval</CardTitle>
              <CardDescription className="text-xs">Tournament prize payouts awaiting final admin sign-off before funds are disbursed.</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" /> No pending payouts.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/60">
                      <TableHead className="text-xs">Tournament</TableHead>
                      <TableHead className="text-xs">Recipient</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Submitted</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map(tx => (
                      <TableRow key={tx.id} className="border-zinc-800/40">
                        <TableCell className="text-sm">{tx.tournamentName || tx.tournamentId.slice(0,8)+"…"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-zinc-300 font-medium">
                              {tx.user?.gameName || tx.user?.displayName || "Unknown Player"}
                            </span>
                            <span className="text-xs text-muted-foreground">{tx.user?.email || "—"}</span>
                            <div className="flex items-center gap-3 mt-1">
                              {tx.user?.discordId && (
                                <div className="flex items-center gap-1 cursor-pointer group" onClick={() => {
                                  navigator.clipboard.writeText(tx.user!.discordId!);
                                  toast({ description: "Đã copy Discord ID" });
                                }}>
                                  <span className="font-mono text-[10px] text-[#5865F2] px-1.5 py-0.5 rounded bg-[#5865F2]/10 border border-[#5865F2]/20">Discord: {tx.user.discordId}</span>
                                  <Copy className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                              {tx.user?.puuid && (
                                <div className="flex items-center gap-1 cursor-pointer group" onClick={() => {
                                  navigator.clipboard.writeText(tx.user!.puuid!);
                                  toast({ description: "Đã copy PUUID" });
                                }}>
                                  <span className="font-mono text-[10px] text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">PUUID: {tx.user.puuid.slice(0, 4)}...{tx.user.puuid.slice(-4)}</span>
                                  <Copy className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-blue-400">{fmt(tx.amount)}</TableCell>
                        <TableCell>{statusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{relTime(tx.createdAt)}</TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button
                            size="sm" className="gap-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setReviewTx(tx)}
                          >
                            <PlayCircle className="h-3 w-3" />
                            Manual Review
                          </Button>
                          <Button
                            title="Release ALL payouts for this tournament via API/Gateway"
                            size="sm" variant="outline" className="gap-1 h-7 text-xs border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                            disabled={!!actionLoading["release_"+tx.tournamentId]}
                            onClick={() => releasePayout("release_"+tx.tournamentId, tx.tournamentId)}
                          >
                            <Loader2 className={`h-3 w-3 ${actionLoading["release_"+tx.tournamentId] ? 'animate-spin' : 'hidden'}`} />
                            Release All (API)
                          </Button>
                          <Button
                            size="sm" variant="outline" className="gap-1 h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                            disabled={!!actionLoading[tx.tournamentId]}
                            onClick={() => markDisputed(tx.tournamentId)}
                          >
                            <Ban className="h-3 w-3" /> Dispute
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Disputes ──────────────────────────────────────────── */}
        <TabsContent value="disputes" className="mt-4">
          <Card className="bg-red-500/5 border-red-500/15">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                <ShieldAlert className="h-4 w-4" /> Disputed Escrows
              </CardTitle>
              <CardDescription className="text-xs">Escrows frozen due to disputes. Funds are locked until admin resolution.</CardDescription>
            </CardHeader>
            <CardContent>
              {disputed.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" /> No active disputes.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-red-500/20">
                      <TableHead className="text-xs">Tournament</TableHead>
                      <TableHead className="text-xs">Escrow Status</TableHead>
                      <TableHead className="text-xs">Funded</TableHead>
                      <TableHead className="text-xs">Required</TableHead>
                      <TableHead className="text-xs">Disputed</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputed.map(e => (
                      <TableRow key={e.id} className="border-red-500/10">
                        <TableCell className="text-sm">{e.tournamentName || e.tournamentId.slice(0,8)+"…"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-xs capitalize">{e.status}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-emerald-400">{fmt(e.fundedAmount)}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(e.requiredAmount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.disputedAt ? relTime(e.disputedAt) : "—"}</TableCell>
                        <TableCell className="text-right flex gap-2 justify-end">
                          <Button
                            size="sm" className="gap-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            disabled={!!actionLoading[e.tournamentId]}
                            onClick={() => releasePayout(e.id, e.tournamentId)}
                          >
                            {actionLoading[e.tournamentId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
                            Resolve &amp; Release
                          </Button>
                          <Button
                            size="sm" variant="outline" className="gap-1 h-7 text-xs"
                            disabled={!!actionLoading["cancel_" + e.id]}
                            onClick={() => cancelEscrow(e.tournamentId)}
                          >
                            <Ban className="h-3 w-3" /> Cancel Escrow
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ──────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-card/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Transaction History</CardTitle>
              <CardDescription className="text-xs">Recently resolved, approved, and rejected escrow transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" /> No history available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/60">
                      <TableHead className="text-xs">Tournament</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Reviewed Note</TableHead>
                      <TableHead className="text-xs text-right">Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map(tx => (
                      <TableRow key={tx.id} className="border-zinc-800/40 opacity-70">
                        <TableCell className="text-sm">{tx.tournamentName || tx.tournamentId.slice(0,8)+"…"}</TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">{tx.type.replace(/_/g," ")}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(tx.amount)}</TableCell>
                        <TableCell>{statusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={tx.reviewNotes || "—"}>{tx.reviewNotes || "—"}</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">{relTime(tx.reviewedAt || tx.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <ReviewModal
        tx={reviewTx}
        open={reviewTx !== null}
        onClose={() => setReviewTx(null)}
        onDone={fetchQueues}
      />
    </div>
  );
}
