"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Loader2, Zap, AlertCircle, FlaskConical, Database, FileDigit,
  PlaySquare, Bot, Key, ExternalLink, ShieldCheck, ArrowRight,
  CheckCircle2, XCircle, Clock, DollarSign, Lock, Unlock,
  AlertTriangle, RefreshCw, Activity, ChevronRight, Terminal,
  Banknote, Send, ShieldAlert, Users
} from "lucide-react";
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RegionSelector } from "@/components/ui/RegionSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCompPanel } from "@/components/match/MatchCompPanel";
import { GrimoireMatchData } from "@/app/types/riot";
import api from "@/app/lib/apiConfig";

const REGIONS = ["sea", "asia", "europe", "americas"];

// ─── Types ───────────────────────────────────────────────────────────────────

type EscrowStep =
  | "idle"
  | "init"
  | "not_funded"
  | "partially_funded"
  | "funding_submitted"
  | "webhook_funded"
  | "funded"
  | "locked"
  | "payout_requested"
  | "payout_released"
  | "released"
  | "disputed"
  | "dispute_resolved"
  | "cancelled"
  | string;

interface LogEntry {
  time: string;
  level: "info" | "success" | "error" | "warn";
  message: string;
  data?: any;
}

interface EscrowState {
  tournamentId: string | null;
  escrowId: string | null;
  transactionId: string | null;
  status: EscrowStep;
  fundedAmount: number;
  requiredAmount: number;
  isCommunityMode: boolean;
  lastEscrow: any;
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ step }: { step: EscrowStep }) {
  const t = useTranslations("common");
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: t("not_started"), color: "border-white/20 text-muted-foreground bg-white/5", icon: <Clock className="w-3 h-3" /> },
    init: { label: t("initialized"), color: "border-blue-500/40 text-blue-400 bg-blue-500/10", icon: <ShieldCheck className="w-3 h-3" /> },
    not_funded: { label: t("not_funded"), color: "border-orange-500/40 text-orange-400 bg-orange-500/10", icon: <ShieldCheck className="w-3 h-3" /> },
    partially_funded: { label: t("partially_funded"), color: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10", icon: <ShieldAlert className="w-3 h-3" /> },
    funding_submitted: { label: t("funding_submitted"), color: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10", icon: <Clock className="w-3 h-3" /> },
    webhook_funded: { label: "Đã nạp tiền (Sim)", color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    funded: { label: t("funded"), color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    locked: { label: "Đã khóa (Đang thi đấu)", color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10", icon: <Lock className="w-3 h-3" /> },
    payout_requested: { label: t("payout_requested"), color: "border-violet-500/40 text-violet-400 bg-violet-500/10", icon: <DollarSign className="w-3 h-3" /> },
    payout_released: { label: t("payout_released"), color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    released: { label: t("released"), color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    disputed: { label: t("disputed"), color: "border-red-500/40 text-red-400 bg-red-500/10", icon: <AlertTriangle className="w-3 h-3" /> },
    dispute_resolved: { label: t("dispute_resolved"), color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    cancelled: { label: t("cancelled"), color: "border-red-500/40 text-red-400 bg-red-500/10", icon: <XCircle className="w-3 h-3" /> },
  };

  const c = config[step] || { label: step || "Unknown", color: "border-slate-500/40 text-slate-400 bg-slate-500/10", icon: <Clock className="w-3 h-3" /> };
  return (
    <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium ${c.color}`}>
      {c.icon} {c.label}
    </Badge>
  );
}

// ─── Log viewer ──────────────────────────────────────────────────────────────

function LogViewer({ logs }: { logs: LogEntry[] }) {
  const t = useTranslations("common");
  const color = (l: LogEntry["level"]) =>
    l === "success" ? "text-emerald-400" : l === "error" ? "text-red-400" : l === "warn" ? "text-yellow-400" : "text-blue-300";
  return (
    <div className="font-mono text-xs space-y-1 min-h-[180px]">
      {logs.length === 0 && (
        <p className="text-muted-foreground/30">Nhật ký hoạt động sẽ hiển thị ở đây...</p>
      )}
      {logs.map((log, i) => (
        <div key={i} className={`flex gap-2 ${color(log.level)}`}>
          <span className="text-muted-foreground/40 shrink-0">{log.time}</span>
          <span className="shrink-0 opacity-60">[{log.level.toUpperCase()}]</span>
          <span className="whitespace-pre-wrap">{log.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Flow diagram ────────────────────────────────────────────────────────────

// FLOW_STEPS moved to component

function FlowDiagram({ current }: { current: EscrowStep }) {
  const t = useTranslations("common");
  const FLOW_STEPS = [
    { id: "init", label: t("init_escrow"), icon: ShieldCheck },
    { id: "funding_submitted", label: t("submit_funding"), icon: Banknote },
    { id: "webhook_funded", label: t("webhook_confirm"), icon: Zap },
    { id: "locked", label: t("lock_on_start"), icon: Lock },
    { id: "payout_requested", label: t("request_payout"), icon: DollarSign },
    { id: "payout_released", label: t("admin_approve_and_payout"), icon: Send },
    { id: "webhook_confirmed", label: t("webhook_confirm_payout"), icon: CheckCircle2 },
  ];
  const order: EscrowStep[] = ["init", "funding_submitted", "webhook_funded", "locked", "payout_requested", "payout_released"];
  const currentIdx = order.indexOf(current);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {FLOW_STEPS.map((step, i) => {
        const stepOrder = order.indexOf(step.id as EscrowStep);
        const done = stepOrder >= 0 && stepOrder < currentIdx;
        const active = step.id === current || (step.id === "locked" && current === "payout_requested");
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${done ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
              active ? "border-blue-500/40 text-blue-300 bg-blue-500/15 ring-1 ring-blue-500/30" :
                "border-white/10 text-muted-foreground/40 bg-white/[0.03]"
              }`}>
              <Icon className="w-3 h-3" />
              <span className="hidden sm:block">{step.label}</span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <ChevronRight className={`w-3 h-3 shrink-0 ${done ? "text-emerald-500/60" : "text-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DevToolsPage() {
  const t = useTranslations("common");
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("sea");
  const [matchCount, setMatchCount] = useState("4");

  const [loading1, setLoading1] = useState(false);
  const [matchData, setMatchData] = useState<GrimoireMatchData | null>(null);
  const [error1, setError1] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);

  const [loading2, setLoading2] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [error2, setError2] = useState<string | null>(null);

  // Automation states
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [seededTournamentId, setSeededTournamentId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState("");
  const [userId, setUserId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [lobbyType, setLobbyType] = useState("minitour");

  const [simGameName, setSimGameName] = useState("");
  const [simTagLine, setSimTagLine] = useState("");
  const [simGameName2, setSimGameName2] = useState("");
  const [simTagLine2, setSimTagLine2] = useState("");
  const [simGameName3, setSimGameName3] = useState("");
  const [simTagLine3, setSimTagLine3] = useState("");
  const [simGameName4, setSimGameName4] = useState("");
  const [simTagLine4, setSimTagLine4] = useState("");
  const [simRegion, setSimRegion] = useState("sea");
  const [simTourPlayers, setSimTourPlayers] = useState("16");
  const [simPhasesConfigRaw, setSimPhasesConfigRaw] = useState(JSON.stringify([
    { name: "Vòng Sơ Loại (BO1)", type: "elimination", matchesPerRound: 1, lobbySize: 8 },
    { name: "Vòng Bảng Tính Điểm (BO2)", type: "points", matchesPerRound: 2, lobbySize: 8 },
    { name: "Vòng Bảng Thụy Sĩ", type: "swiss", matchesPerRound: 3, lobbySize: 8 }
  ], null, 2));

  const getRiotRegion = (r: string) => {
    const rLower = r.toLowerCase();
    if (rLower === 'amer') return 'americas';
    if (rLower === 'emea') return 'europe';
    if (rLower === 'apac') return 'asia';
    return rLower;
  };

  // ─── Escrow Simulator State ─────────────────────────────────────────────────
  const [escrowState, setEscrowState] = useState<EscrowState>({
    tournamentId: null, escrowId: null, transactionId: null,
    status: "idle", fundedAmount: 0, requiredAmount: 0,
    isCommunityMode: false, lastEscrow: null,
  });
  const [escrowLogs, setEscrowLogs] = useState<LogEntry[]>([]);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowTournamentId, setEscrowTournamentId] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("500");
  const [escrowProvider, setEscrowProvider] = useState("manual_proof");
  const [escrowProofUrl, setEscrowProofUrl] = useState("https://proof.example.com/receipt.png");
  const [escrowTransactionId, setEscrowTransactionId] = useState("");
  const [escrowPayoutRecipients, setEscrowPayoutRecipients] = useState("[]");
  const [escrowDisputeReason, setEscrowDisputeReason] = useState("Kết quả thi đấu bị tranh chấp");
  const [escrowResolution, setEscrowResolution] = useState("refund_organizer");
  const [escrowNote, setEscrowNote] = useState("");

  const { fetchLobby: refreshLobbyStore } = useMiniTourLobbyStore();
  const STATE_CHANGING_ENDPOINTS = ['auto-start', 'simulate-match', 'seed-env', 'ready-toggle'];

  function addLog(level: LogEntry["level"], message: string, data?: any) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setEscrowLogs(prev => [...prev, { time, level, message, data }]);
  }

  function resetEscrowSimulator() {
    setEscrowState({ tournamentId: null, escrowId: null, transactionId: null, status: "idle", fundedAmount: 0, requiredAmount: 0, isCommunityMode: false, lastEscrow: null });
    setEscrowLogs([]);
    setEscrowTransactionId("");
    addLog("info", "🔄 Đã reset trạng thái Escrow Simulator");
  }

  async function escrowCall<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setEscrowLoading(true);
    addLog("info", `⏳ ${label}...`);
    try {
      const result = await fn();
      return result;
    } catch (e: any) {
      const msg = e.response?.data?.error ?? e.response?.data?.message ?? e.message;
      addLog("error", `❌ ${label} thất bại: ${msg}`);
      return null;
    } finally {
      setEscrowLoading(false);
    }
  }

  // Step 1 – Xem trạng thái escrow của tournament
  async function stepViewEscrow() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Nhập Tournament ID trước"); return; }

    const result = await escrowCall(t("get_escrow_info"), () =>
      api.get(`/tournaments/${tid}/escrow`).then(r => r.data)
    );
    if (!result) return;

    const e = result.escrow;
    setEscrowState(prev => ({
      ...prev,
      tournamentId: tid,
      escrowId: e?.id ?? null,
      status: (e?.status ?? "init") as EscrowStep,
      fundedAmount: e?.fundedAmount ?? 0,
      requiredAmount: e?.requiredAmount ?? 0,
      isCommunityMode: result.tournament?.isCommunityMode ?? false,
      lastEscrow: e,
    }));
    addLog("success", `✅ Lấy escrow thành công — Trạng thái: ${e?.status}, Mode: ${result.tournament?.isCommunityMode ? "Community" : "Escrow-backed"}`);
    addLog("info", `💰 Required: $${e?.requiredAmount ?? 0} | Funded: $${e?.fundedAmount ?? 0} | Reconciliation: ${e?.reconciliationStatus}`);
  }

  // Step 2 – Gửi funding (manual_proof không cần checkout URL)
  async function stepSubmitFunding() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Nhập Tournament ID trước"); return; }

    const result = await escrowCall(t("send_escrow_funding_request"), () =>
      api.post(`/tournaments/${tid}/escrow/funding`, {
        amount: parseFloat(escrowAmount),
        method: escrowProvider,
        provider: escrowProvider === "manual_proof" ? "manual" : escrowProvider,
        proofUrl: escrowProvider === "manual_proof" ? escrowProofUrl : undefined,
        note: "Nạp tiền từ Escrow Simulator",
      }).then(r => r.data)
    );
    if (!result) return;

    const txId = result.transaction?.id;
    setEscrowTransactionId(txId ?? "");
    setEscrowState(prev => ({ ...prev, tournamentId: tid, transactionId: txId, status: "funding_submitted" }));

    if (escrowProvider === "manual_proof") {
      addLog("success", `✅ Đã gửi yêu cầu nạp $${escrowAmount} qua manual_proof. Transaction ID: ${txId}`);
      addLog("warn", `⏳ Cần Admin review thủ công. Dùng "Admin Duyệt Proof" bên dưới để xác nhận.`);
    } else {
      addLog("success", `✅ Payment intent tạo thành công. Checkout URL: ${result.paymentIntent?.checkoutUrl ?? "N/A"}`);
      addLog("info", `ℹ️ Trong production, user sẽ redirect đến cổng thanh toán. Dev: dùng t("simulate_webhook") để xác nhận.`);
    }
  }

  // Step 3 – Admin duyệt manual proof (dev/admin mode)
  async function stepAdminApproveProof() {
    const txId = escrowTransactionId.trim();
    if (!txId) { addLog("error", "⚠️ Cần Transaction ID. Thực hiện bước Submit Funding trước"); return; }

    const result = await escrowCall(t("admin_approve_manual_proof"), () =>
      api.post(`/admin/escrow/transactions/${txId}/review`, {
        approved: true,
        proofUrl: escrowProofUrl,
        note: "Đã xác minh qua Escrow Simulator (dev)",
      }).then(r => r.data)
    );
    if (!result) return;

    const e = result.escrow;
    setEscrowState(prev => ({
      ...prev, status: "webhook_funded",
      fundedAmount: e?.fundedAmount ?? prev.fundedAmount, lastEscrow: e,
    }));
    addLog("success", `✅ Admin đã duyệt — Escrow funded: $${e?.fundedAmount ?? 0}/$${e?.requiredAmount ?? 0}`);
    addLog("info", `💡 Trong production luồng này chạy tự động qua Stripe/MoMo webhook`);
  }

  // Step 3B – Giả lập webhook thay cho màn hình thanh toán
  async function stepSimulateWebhook(eventType: "funding.succeeded" | "payout.succeeded") {
    const txId = escrowTransactionId.trim();
    if (!txId) { addLog("error", "⚠️ Cần Transaction ID"); return; }

    const result = await escrowCall(`Giả lập Webhook (${eventType})`, () =>
      api.post(`/dev/escrow/simulate-webhook`, {
        transactionId: txId,
        eventType,
        providerEventId: `sim_${Date.now()}`,
      }).then(r => r.data)
    );
    if (!result) return;

    if (eventType === "funding.succeeded") {
      setEscrowState(prev => ({ ...prev, status: "webhook_funded" }));
      addLog("success", `✅ Webhook funding.succeeded — Escrow đã được xác nhận!`);
    } else {
      setEscrowState(prev => ({ ...prev, status: "payout_released" }));
      addLog("success", `✅ Webhook payout.succeeded — Phần thưởng đã phát!`);
    }
  }

  // Step 4 – Lock (khi tournament bắt đầu) – gọi qua dev endpoint
  async function stepLockEscrow() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Cần Tournament ID"); return; }

    const result = await escrowCall(t("lock_escrow_tournament_start"), () =>
      api.post(`/dev/escrow/assert-start`, { tournamentId: tid }).then(r => r.data)
    );
    if (!result) return;

    setEscrowState(prev => ({ ...prev, status: "locked" }));
    addLog("success", `✅ Escrow đã khóa — Tournament có thể bắt đầu thi đấu`);
    addLog("info", `🔒 Trong production, lock tự động khi autoAdvance gọi assertTournamentCanStart()`);
  }

  // Step 5 – Yêu cầu phát thưởng
  async function stepRequestPayout() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Cần Tournament ID"); return; }

    let recipients: any[];
    try {
      recipients = JSON.parse(escrowPayoutRecipients);
      if (!Array.isArray(recipients) || recipients.length === 0) throw new Error(t("at_least_1_recipient_required"));
    } catch (e: any) {
      addLog("error", `⚠️ JSON recipients không hợp lệ: ${e.message}`);
      return;
    }

    const result = await escrowCall(t("organizer_request_payout_label"), () =>
      api.post(`/tournaments/${tid}/payouts/request-release`, {
        recipients,
        note: t("payout_from_escrow_emulator"),
      }).then(r => r.data)
    );
    if (!result) return;

    const txIds = result.transactions?.map((t: any) => t.id).join(", ");
    setEscrowState(prev => ({ ...prev, status: "payout_requested" }));
    addLog("success", `✅ Đã tạo ${result.transactions?.length ?? 0} payout transactions. IDs: ${txIds}`);
    addLog("warn", `⏳ Cần Admin duyệt để phát tiền thật sự. Dùng "Admin Duyệt Payout" bên dưới.`);
  }

  // Step 6 – Admin duyệt payout
  async function stepAdminApprovePayout() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Cần Tournament ID"); return; }

    const result = await escrowCall(t("admin_approve_and_distribute"), () =>
      api.post(`/admin/tournaments/${tid}/payouts/release`, {
        paymentMethod: "gateway",
        note: "Admin duyệt qua Escrow Simulator (dev)",
      }).then(r => r.data)
    );
    if (!result) return;

    setEscrowState(prev => ({ ...prev, status: "payout_released" }));
    addLog("success", `✅ Payout đã phát! Escrow status: ${result.escrow?.status}`);
    addLog("info", `💡 Trong production, cần webhook payout.succeeded để cập nhật reward.status = completed`);
  }

  // Admin Freeze/Dispute
  async function stepMarkDisputed() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Cần Tournament ID"); return; }

    const result = await escrowCall("Admin đánh dấu tranh chấp (Freeze)", () =>
      api.post(`/admin/tournaments/${tid}/dispute`, { reason: escrowDisputeReason }).then(r => r.data)
    );
    if (!result) return;

    setEscrowState(prev => ({ ...prev, status: "disputed" }));
    addLog("warn", `⚠️ Escrow bị đóng băng! Lý do: ${escrowDisputeReason}`);
    addLog("info", `🔒 Tất cả payout và funding đều bị chặn khi đang tranh chấp`);
  }

  // Admin Resolve Dispute
  async function stepResolveDispute() {
    const tid = escrowTournamentId.trim();
    if (!tid) { addLog("error", "⚠️ Cần Tournament ID"); return; }

    const result = await escrowCall(`Giải quyết tranh chấp (${escrowResolution})`, () =>
      api.post(`/admin/tournaments/${tid}/dispute/resolve`, {
        resolution: escrowResolution,
        note: escrowNote || `Giải quyết qua Escrow Simulator\nChiến lược: ${escrowResolution}`,
      }).then(r => r.data)
    );
    if (!result) return;

    setEscrowState(prev => ({ ...prev, status: "dispute_resolved" }));
    addLog("success", `✅ Tranh chấp đã giải quyết. Chiến lược: ${escrowResolution}`);
    addLog("info", `📊 Escrow cuối: ${result.escrow?.status}`);
  }

  // Get health
  async function stepGetHealth() {
    const result = await escrowCall(t("get_reconciliation_health"), () =>
      api.get(`/admin/escrow/health`).then(r => r.data)
    );
    if (!result) return;
    const h = result.health;
    addLog(h.status === "healthy" ? "success" : h.status === "warning" ? "warn" : "error",
      `📊 Health Score: ${h.score}/100 (${h.status.toUpperCase()}) | Pending: ${result.summary.totalPending} | Failed: ${result.summary.totalFailed} | Disputed: ${result.summary.disputedEscrows}`
    );
  }

  // Bulk retry
  async function stepBulkRetry() {
    const result = await escrowCall(t("bulk_retry_stale_transactions"), () =>
      api.post(`/admin/escrow/bulk-retry`, {}).then(r => r.data)
    );
    if (!result) return;
    addLog("success", `✅ Đã retry ${result.processed} transactions`);
    result.results?.forEach((r: any) => addLog(r.status === "retried" ? "info" : "warn", `  → ${r.transactionId}: ${r.status}${r.reason ? ` (${r.reason})` : ""}`));
  }

  // Standard automation handler
  async function handleAutomation(endpoint: string, payload: any) {
    setAutomationLoading(true);
    setAutomationError(null);
    setAutomationResult(null);
    try {
      const res = await api.post(`/dev/automation/${endpoint}`, payload);
      if (res.data.success) {
        setAutomationResult(res.data);
        if (res.data.tournamentId) setSeededTournamentId(res.data.tournamentId);
        if (STATE_CHANGING_ENDPOINTS.includes(endpoint) && res.data.lobbyId) {
          try { await refreshLobbyStore(res.data.lobbyId); } catch (e) { console.warn('[DevTools] Could not auto-refresh lobby store:', e); }
        }
      } else {
        setAutomationError(res.data.error || "Action failed");
      }
    } catch (e: any) {
      setAutomationError(e.response?.data?.error ?? e.message);
    } finally {
      setAutomationLoading(false);
    }
  }

  async function fetchSingleMatch() {
    setLoading1(true); setError1(null); setMatchData(null);
    try {
      const body: Record<string, string> = { region: getRiotRegion(region) };
      if (gameName) body.gameName = gameName;
      if (tagLine) body.tagLine = tagLine;
      const res = await api.post("/dev/test-riot-match", body);
      if (res.data.success && res.data.match) setMatchData(res.data.match);
      else setError1(res.data.error || "No match found");
    } catch (e: any) { setError1(e.response?.data?.error ?? e.message); } finally { setLoading1(false); }
  }

  async function seedFullTournament() {
    setLoading2(true); setError2(null); setSeedResult(null);
    try {
      const body: Record<string, any> = { region: getRiotRegion(region), matchCount: parseInt(matchCount) };
      if (gameName) body.gameName = gameName;
      if (tagLine) body.tagLine = tagLine;
      const res = await api.post("/dev/seed-full-tournament", body);
      if (res.data.success) setSeedResult(res.data);
      else setError2(res.data.error || "Seeding failed");
    } catch (e: any) { setError2(e.response?.data?.error ?? e.message); } finally { setLoading2(false); }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
          <Database className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dev Tools</h1>
          <p className="text-sm text-muted-foreground">Test integrations, seed mock data & simulate Escrow flows</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400">
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Development Environment Only</p>
          <p className="text-red-400/80 leading-relaxed">
            All actions on this page <strong>mutate real database records</strong>. <strong>Never run these in production.</strong>{' '}
            For production incidents, use <strong>Admin → Tournaments → Round Control</strong>.
          </p>
        </div>
      </div>

      <Tabs defaultValue="escrow" className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="escrow" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Escrow Simulator
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Automation Flow
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: ESCROW SIMULATOR
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="escrow" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">

          {/* Header card */}
          <Card className="border-violet-500/20 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-violet-300">
                    <ShieldCheck className="w-5 h-5" />
                    Escrow Flow Simulator
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Mô phỏng toàn bộ vòng đời thanh toán Escrow — từ khởi tạo đến phát thưởng hoặc tranh chấp.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge step={escrowState.status} />
                  {escrowState.isCommunityMode && (
                    <Badge variant="outline" className="border-yellow-500/40 text-yellow-400 bg-yellow-500/10 text-xs">
                      Community Mode
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={resetEscrowSimulator}
                    className="h-7 text-xs gap-1 border-white/20 hover:bg-white/10">
                    <RefreshCw className="w-3 h-3" /> Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <FlowDiagram current={escrowState.status} />
            </CardContent>
          </Card>

          {/* Activity Log - Moved higher up */}
          <Card className="border-white/10 bg-black/40">
            <CardHeader className="py-3 px-4 border-b border-white/10 flex flex-row items-center justify-between">
              <CardTitle className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                <Loader2 className={`w-3 h-3 ${escrowLoading ? 'animate-spin text-blue-400' : 'opacity-0'}`} />
                Nhật ký hoạt động (Activity Log)
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:bg-white/10"
                onClick={() => setEscrowLogs([])}>
                <RefreshCw className="w-3 h-3" />
                Xóa log
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-auto max-h-48 scrollbar-thin scrollbar-thumb-white/10">
              <LogViewer logs={escrowLogs} />
            </CardContent>
          </Card>

          {/* Target tournament */}
          <Card className="border-white/10 bg-card/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" /> Tournament Target
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Tournament ID</Label>
                <Input
                  placeholder={t("tournament_id_placeholder")}
                  value={escrowTournamentId}
                  onChange={e => setEscrowTournamentId(e.target.value)}
                  className="bg-black/30 border-white/10 font-mono text-xs h-9"
                />
              </div>
              <Button onClick={stepViewEscrow} disabled={escrowLoading} size="sm" className="gap-2 h-9">
                {escrowLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                Kiểm tra Escrow
              </Button>
              {escrowState.lastEscrow && (
                <div className="md:col-span-3 grid grid-cols-3 gap-2 mt-1">
                  {[
                    { label: "Required", val: `$${escrowState.lastEscrow.requiredAmount ?? 0}`, color: "text-yellow-400" },
                    { label: "Funded", val: `$${escrowState.lastEscrow.fundedAmount ?? 0}`, color: "text-emerald-400" },
                    { label: "Released", val: `$${escrowState.lastEscrow.releasedAmount ?? 0}`, color: "text-blue-400" },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className={`text-sm font-bold ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* LEFT: Organizer Flow */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Banknote className="w-4 h-4" /> 1. Partner/Organizer Actions
              </p>

              {/* Submit Funding */}
              <Card className="border-emerald-500/20 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Bước 1 – Nạp tiền Escrow
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Số tiền (USD)</Label>
                      <Input value={escrowAmount} onChange={e => setEscrowAmount(e.target.value)}
                        className="bg-black/30 border-white/10 h-8 text-xs" placeholder="500" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Phương thức</Label>
                      <Select value={escrowProvider} onValueChange={setEscrowProvider}>
                        <SelectTrigger className="bg-black/30 border-white/10 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual_proof">Manual Proof (Dev)</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="momo">MoMo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {escrowProvider === "manual_proof" && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Proof URL</Label>
                      <Input value={escrowProofUrl} onChange={e => setEscrowProofUrl(e.target.value)}
                        className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                  )}
                  <Button onClick={stepSubmitFunding} disabled={escrowLoading || !escrowTournamentId} size="sm"
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {escrowLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                    Gửi yêu cầu nạp tiền
                  </Button>

                  {escrowTransactionId && (
                    <div className="text-[10px] font-mono text-muted-foreground bg-black/20 px-3 py-2 rounded border border-white/5 break-all">
                      Transaction ID: <span className="text-yellow-400">{escrowTransactionId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Request Payout */}
              <Card className="border-violet-500/20 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-violet-400 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Bước 4 – Yêu cầu phát thưởng
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Recipients JSON — <span className="text-yellow-400">cần participantId thực</span>
                    </Label>
                    <textarea
                      value={escrowPayoutRecipients}
                      onChange={e => setEscrowPayoutRecipients(e.target.value)}
                      rows={4}
                      className="w-full bg-black/30 border border-white/10 rounded-md text-[10px] font-mono p-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                      placeholder={'[{"participantId":"xxx","amount":100}]'}
                    />
                  </div>
                  <Button onClick={stepRequestPayout} disabled={escrowLoading || !escrowTournamentId} size="sm"
                    className="w-full gap-2 border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20" variant="outline">
                    <DollarSign className="w-3 h-3" /> Organizer gửi yêu cầu phát thưởng
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Admin Flow */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 2. Admin Actions
              </p>

              {/* Dev helpers */}
              <Card className="border-yellow-500/20 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-yellow-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Bước 2 – Xác nhận thanh toán
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-0.5">
                    Chọn một trong hai: duyệt thủ công (manual_proof) hoặc giả lập webhook (gateway)
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <Button onClick={stepAdminApproveProof} disabled={escrowLoading || !escrowTransactionId} size="sm"
                    className="w-full gap-2 border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20" variant="outline">
                    <CheckCircle2 className="w-3 h-3" /> [manual_proof] Admin duyệt Proof
                  </Button>
                  <Button onClick={() => stepSimulateWebhook("funding.succeeded")} disabled={escrowLoading || !escrowTransactionId} size="sm"
                    className="w-full gap-2 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" variant="outline">
                    <Zap className="w-3 h-3" /> [webhook] Giả lập Stripe/MoMo báo đã nhận tiền
                  </Button>
                </CardContent>
              </Card>

              {/* Lock */}
              <Card className="border-cyan-500/20 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-cyan-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Bước 3 – Khóa Escrow (Tournament Start)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Button onClick={stepLockEscrow} disabled={escrowLoading || !escrowTournamentId} size="sm"
                    className="w-full gap-2 border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20" variant="outline">
                    <Lock className="w-3 h-3" /> Gọi assertTournamentCanStart()
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Trong production, bước này tự động khi RoundService.autoAdvance() khởi động vòng đầu tiên.
                  </p>
                </CardContent>
              </Card>

              {/* Admin payout */}
              <Card className="border-emerald-500/20 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Bước 5 – Admin duyệt phát thưởng
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <Button onClick={stepAdminApprovePayout} disabled={escrowLoading || !escrowTournamentId} size="sm"
                    className="w-full gap-2 bg-emerald-700 hover:bg-emerald-600 text-white">
                    <CheckCircle2 className="w-3 h-3" /> Admin duyệt & release escrow
                  </Button>
                  <Button onClick={() => stepSimulateWebhook("payout.succeeded")} disabled={escrowLoading || !escrowTransactionId} size="sm"
                    className="w-full gap-2 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" variant="outline">
                    <Zap className="w-3 h-3" /> [webhook] Giả lập xác nhận payout thành công
                  </Button>
                </CardContent>
              </Card>

              {/* Dispute */}
              <Card className="border-red-500/20 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nhánh Tranh chấp (Dispute)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Lý do tranh chấp</Label>
                    <Input value={escrowDisputeReason} onChange={e => setEscrowDisputeReason(e.target.value)}
                      className="bg-black/30 border-white/10 h-8 text-xs" />
                  </div>
                  <Button onClick={stepMarkDisputed} disabled={escrowLoading || !escrowTournamentId} size="sm"
                    variant="outline" className="w-full gap-2 border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20">
                    <AlertTriangle className="w-3 h-3" /> Đánh dấu Tranh chấp / Đóng băng
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Chiến lược giải quyết</Label>
                      <Select value={escrowResolution} onValueChange={setEscrowResolution}>
                        <SelectTrigger className="bg-black/30 border-white/10 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refund_organizer">Hoàn tiền cho Organizer</SelectItem>
                          <SelectItem value="release_payouts">Phát thưởng cho người chơi</SelectItem>
                          <SelectItem value="partial_refund">Hoàn một phần</SelectItem>
                          <SelectItem value="custom">Tùy chỉnh (thủ công)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Ghi chú</Label>
                      <Input value={escrowNote} onChange={e => setEscrowNote(e.target.value)}
                        className="bg-black/30 border-white/10 h-8 text-xs" placeholder="Tùy chọn" />
                    </div>
                  </div>
                  <Button onClick={stepResolveDispute} disabled={escrowLoading || !escrowTournamentId} size="sm"
                    className="w-full gap-2 border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20" variant="outline">
                    <Unlock className="w-3 h-3" /> Giải quyết Tranh chấp
                  </Button>
                </CardContent>
              </Card>

              {/* Monitoring */}
              <Card className="border-white/10 bg-card/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Monitoring & Retry
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <Button onClick={stepGetHealth} disabled={escrowLoading} size="sm"
                    className="w-full gap-2 border-white/20 hover:bg-white/10" variant="outline">
                    <Activity className="w-3 h-3" /> Xem Reconciliation Health Score
                  </Button>
                  <Button onClick={stepBulkRetry} disabled={escrowLoading} size="sm"
                    className="w-full gap-2 border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20" variant="outline">
                    <RefreshCw className="w-3 h-3" /> Bulk Retry stale transactions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>


        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: AUTOMATION FLOW
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="automation" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {/* Real Players PUUID Seeding */}
          <div className="flex flex-col gap-4 p-4 bg-background/40 border border-white/10 rounded-xl">
            <h3 className="text-sm font-semibold text-muted-foreground border-b border-white/5 pb-2">Real Players (Used for Seeding & Simulating Matches)</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Player 1</Label>
                <div className="flex gap-2">
                  <Input placeholder="Name" value={simGameName} onChange={e => setSimGameName(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                  <Input placeholder="Tag" value={simTagLine} onChange={e => setSimTagLine(e.target.value)} className="w-16 bg-black/30 border-white/10 h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Player 2</Label>
                <div className="flex gap-2">
                  <Input placeholder="Name" value={simGameName2} onChange={e => setSimGameName2(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                  <Input placeholder="Tag" value={simTagLine2} onChange={e => setSimTagLine2(e.target.value)} className="w-16 bg-black/30 border-white/10 h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Player 3</Label>
                <div className="flex gap-2">
                  <Input placeholder="Name" value={simGameName3} onChange={e => setSimGameName3(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                  <Input placeholder="Tag" value={simTagLine3} onChange={e => setSimTagLine3(e.target.value)} className="w-16 bg-black/30 border-white/10 h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Player 4</Label>
                <div className="flex gap-2">
                  <Input placeholder="Name" value={simGameName4} onChange={e => setSimGameName4(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                  <Input placeholder="Tag" value={simTagLine4} onChange={e => setSimTagLine4(e.target.value)} className="w-16 bg-black/30 border-white/10 h-8 text-xs" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-[180px]">
                <RegionSelector value={simRegion} onChange={setSimRegion} allowSubRegion />
              </div>
              <p className="text-[10px] text-muted-foreground flex-1">
                Mỗi player sẽ được dùng để lấy 1 trận gần nhất (gồm 8 người chơi thật). 4 players = 4 trận = 32 PUUID thật rải vào tournament.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 bg-background/40 border border-white/10 rounded-xl">
            <div className="flex flex-wrap gap-4 items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground mr-2">Quick Setup</h3>
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 h-8"
                  onClick={() => handleAutomation('clear-env', {})}>🗑 Clear All Data</Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Flow:</Label>
                <Select value={lobbyType} onValueChange={setLobbyType}>
                  <SelectTrigger className="w-[140px] h-8 bg-black/30 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minitour">MiniTour</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">🎯 Target Tournament ID</Label>
                <Input placeholder="Auto-detect latest if empty" value={seededTournamentId || ""} onChange={e => setSeededTournamentId(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">🎯 Target Round ID</Label>
                <Input placeholder="Auto-detect latest if empty" value={roundId} onChange={e => setRoundId(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">🎯 Target Lobby ID</Label>
                <Input placeholder="Auto-detect latest if empty" value={lobbyId} onChange={e => setLobbyId(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs font-mono" />
              </div>
            </div>
            {lobbyType === 'tournament' && (
              <div className="pt-2 border-t border-white/5">
                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                  onClick={() => handleAutomation('seed-tournament-participants', { tournamentId: seededTournamentId })}>
                  <Users className="w-3 h-3 mr-2" />
                  Seed Tournament Participants (Leave 1 slot)
                </Button>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              {lobbyType === 'minitour' ? (
                <Card className="border-emerald-500/20 bg-card/60 backdrop-blur-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> MiniTour Lifecycle
                    </CardTitle>
                    <CardDescription>Full MiniTour lobby lifecycle — seed → start → simulate → complete</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    {[
                      { label: "1. Seed Users + MiniTour Lobby (7/8)", color: "emerald", payload: { type: 'minitour', gameName: simGameName || undefined, tagLine: simTagLine || undefined, gameName2: simGameName2 || undefined, tagLine2: simTagLine2 || undefined, gameName3: simGameName3 || undefined, tagLine3: simTagLine3 || undefined, gameName4: simGameName4 || undefined, tagLine4: simTagLine4 || undefined, region: getRiotRegion(simRegion) }, ep: 'seed-env' },
                      { label: "2. Force Start (WAITING → IN_PROGRESS)", color: "white", payload: { type: 'minitour', lobbyId: lobbyId || undefined }, ep: 'auto-start' },
                      { label: "3. Simulate Match Results (Riot Data)", color: "blue", payload: { type: 'minitour', lobbyId: lobbyId || undefined, gameName: simGameName || undefined, tagLine: simTagLine || undefined, region: getRiotRegion(simRegion) }, ep: 'simulate-match' },
                    ].map(a => (
                      <Button key={a.label} size="sm" variant="outline"
                        className={`w-full justify-start border-${a.color}-500/30 text-${a.color}-400 bg-${a.color}-500/10 hover:bg-${a.color}-500/20`}
                        onClick={() => handleAutomation(a.ep, a.payload)}>{a.label}</Button>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-purple-500/20 bg-card/60 backdrop-blur-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-purple-400 flex items-center gap-2">
                      <PlaySquare className="w-4 h-4" /> Tournament Lobby & Match
                    </CardTitle>
                    <CardDescription>Auto-targets the latest WAITING or IN_PROGRESS Tournament Lobby</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <div className="space-y-2 mb-4 p-3 bg-black/20 border border-white/5 rounded-md">
                      <Label className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Tournament Config</Label>
                      <div className="flex gap-2">
                        <Select value={simTourPlayers} onValueChange={setSimTourPlayers}>
                          <SelectTrigger className="w-[120px] bg-black/30 border-white/10 h-8 text-xs shrink-0"><SelectValue /></SelectTrigger>
                          <SelectContent>{["8", "16", "24", "32", "64", "128"].map(v => <SelectItem key={v} value={v}>{v} Players</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 mt-2">
                        <Label className="text-[10px] text-muted-foreground flex justify-between">
                          <span>Phases Configuration (JSON)</span>
                          <span onClick={() => {
                            setSimPhasesConfigRaw(JSON.stringify([
                              { name: "Sơ Loại 1", type: "elimination", matchesPerRound: 1, lobbySize: 8 },
                              { name: "Sơ Loại 2", type: "elimination", matchesPerRound: 1, lobbySize: 8 },
                              { name: "Swiss Chung Kết", type: "swiss", matchesPerRound: 3, lobbySize: 8 }
                            ], null, 2))
                          }} className="text-purple-400 hover:text-purple-300 cursor-pointer underline">Reset</span>
                        </Label>
                        <textarea 
                          value={simPhasesConfigRaw}
                          onChange={(e) => setSimPhasesConfigRaw(e.target.value)}
                          rows={6}
                          className="w-full bg-black/40 border border-white/10 rounded-md p-2 font-mono text-[10px] text-purple-200 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                          placeholder={'[\n  { "type": "elimination", "matchesPerRound": 1 }\n]'}
                        />
                      </div>
                      <Button size="sm" variant="outline" className="w-full justify-start border-purple-500/40 text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 mt-2"
                        onClick={() => {
                          let parsedPhases = undefined;
                          try {
                            parsedPhases = JSON.parse(simPhasesConfigRaw);
                          } catch (e) {
                            addLog('error', 'Invalid JSON config in Phases Configuration.');
                            return;
                          }
                          handleAutomation('seed-env', { 
                            type: 'tournament', gameName: simGameName || undefined, tagLine: simTagLine || undefined, 
                            gameName2: simGameName2 || undefined, tagLine2: simTagLine2 || undefined, 
                            region: getRiotRegion(simRegion), numPlayers: parseInt(simTourPlayers),
                            phasesConfig: parsedPhases
                          });
                        }}>
                        1. Seed Configured Tournament (Pending)
                      </Button>
                    </div>
                    {[
                      { label: "2. Pre-assign Groups (Phase 1)", color: "yellow", onClick: () => handleAutomation('pre-assign-groups', { tournamentId: seededTournamentId }) },
                      { label: "3. Start Tournament (Phase 1)", color: "green", onClick: () => handleAutomation('assign-lobby', { tournamentId: seededTournamentId, lobbyId }) },
                      { label: "4. Toggle Ready", color: "white", onClick: () => handleAutomation('ready-toggle', { lobbyId }) },
                      { label: "5. Auto Advance (Next Round/Phase)", color: "pink", onClick: () => handleAutomation('advance-round', { roundId }) },
                      { label: "6. Simulate Match (via Grimoire/Riot API)", color: "blue", onClick: () => handleAutomation('simulate-match', { type: 'tournament', gameName: simGameName || undefined, tagLine: simTagLine || undefined, region: getRiotRegion(simRegion), lobbyId: lobbyId || undefined }) },
                    ].map(a => (
                      <Button key={a.label} size="sm" variant="outline" className={`w-full justify-start border-${a.color}-500/30 text-${a.color}-400 bg-${a.color}-500/10 hover:bg-${a.color}-500/20`} onClick={a.onClick}>{a.label}</Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 font-semibold"
                      onClick={() => handleAutomation('simulate-match-mock', {})}
                    >
                      🎲 6b. Simulate Match (Mock — No Riot API)
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
            <Card className="border-white/10 bg-black/40 shadow-inner h-full flex flex-col min-h-[400px]">
              <CardHeader className="py-3 px-4 border-b border-white/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Loader2 className={`w-3 h-3 ${automationLoading ? 'animate-spin opacity-100' : 'opacity-0'}`} />
                  Execution Result
                </CardTitle>
                <div className="flex items-center gap-2">
                  {seededTournamentId && (
                    <div className="flex items-center gap-1.5">
                      <Link href={`/dashboard/admin/tournaments/${seededTournamentId}`}>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-violet-500/40 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20">
                          <ExternalLink className="w-2.5 h-2.5" /> Admin Manage
                        </Button>
                      </Link>
                      <Link href={`/tournaments/${seededTournamentId}`} target="_blank">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20">
                          <ExternalLink className="w-2.5 h-2.5" /> View Tournament
                        </Button>
                      </Link>
                    </div>
                  )}
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">{lobbyType === 'minitour' ? 'MiniTour' : 'Tournament'} Mode</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-auto font-mono text-xs flex-1">
                {automationError ? (
                  <div className="text-red-400">{automationError}</div>
                ) : automationResult ? (
                  <pre className="text-emerald-400/90 whitespace-pre-wrap">{JSON.stringify(automationResult, null, 2)}</pre>
                ) : (
                  <div className="text-muted-foreground/30">Select an action to view the result payload here.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
