"use client"

import { useState, useEffect } from "react"
import { ShieldCheck, Banknote, DollarSign, Clock, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Play, ExternalLink, Copy } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "next-intl"
import api from "@/app/lib/apiConfig"
import { IParticipant } from "@/app/types/tournament"
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate"

interface EscrowState {
  id: string
  status: string
  requiredAmount: number
  fundedAmount: number
  releasedAmount: number
  reconciliationStatus: string
}

interface EscrowManagementTabProps {
  tournamentId: string
  tournamentName: string
  tournamentStatus: string
  isCommunityMode: boolean
  participants: IParticipant[]
  isAdmin?: boolean
  prizeStructure?: string | any[] | Record<string, number> | null
}

export function EscrowManagementTab({ tournamentId, tournamentName, tournamentStatus, isCommunityMode, participants, isAdmin, prizeStructure }: EscrowManagementTabProps) {
  const t = useTranslations("Common")
  const { toast } = useToast()
  const { formatVndText } = useCurrencyRate()
  
  const [loading, setLoading] = useState(true)
  const [escrow, setEscrow] = useState<EscrowState | null>(null)
  
  // Funding state
  const [fundingLoading, setFundingLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("stripe")
  const [fundingAmount, setFundingAmount] = useState(0)
  
  // Payout state
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [adminPayoutLoading, setAdminPayoutLoading] = useState(false)

  const fetchEscrow = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/tournaments/${tournamentId}/escrow`)
      setEscrow(res.data.escrow)
      if (res.data.escrow) {
        setFundingAmount(res.data.escrow.requiredAmount - res.data.escrow.fundedAmount)
      }
    } catch (error) {
      console.error("Failed to load escrow:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCalculatedPayouts = () => {
    const activeParticipants = [...participants]
      .filter(p => (p.scoreTotal || 0) > 0)
      .sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0))

    let dist: number[] = []
    if (Array.isArray(prizeStructure)) {
      dist = prizeStructure.map(p => Number(p))
    } else if (typeof prizeStructure === 'object' && prizeStructure !== null) {
      const obj = prizeStructure as Record<string, number>
      const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b))
      dist = keys.map(k => obj[k])
    } else {
      const count = participants.length
      dist = count >= 8 ? [0.4, 0.3, 0.2, 0.1] : count >= 6 ? [0.5, 0.3, 0.2] : count >= 4 ? [0.6, 0.4] : [1.0]
    }

    const totalPool = escrow ? escrow.requiredAmount : 0
    const prizePool = totalPool * 0.9; // 10% host fee
    
    const results = []
    let currentRank = 1
    let previousScore: number | null = null
    let tiedRankCount = 0

    for (let i = 0; i < activeParticipants.length; i++) {
      const participant = activeParticipants[i]
      
      if (previousScore !== null && participant.scoreTotal! < previousScore) {
        currentRank += tiedRankCount
        tiedRankCount = 1
      } else if (previousScore === null || participant.scoreTotal === previousScore) {
        tiedRankCount++
      } else {
        tiedRankCount = 1
      }
      previousScore = participant.scoreTotal!

      const pPercentage = dist[currentRank - 1]
      let estimatedPayout = 0
      if (pPercentage !== undefined) {
        const ratio = pPercentage > 1 ? pPercentage / 100 : pPercentage
        estimatedPayout = prizePool * ratio
      }
      
      if (estimatedPayout > 0) {
        results.push({
          rank: currentRank,
          participant,
          estimatedPayout
        })
      }
    }
    return results
  }

  useEffect(() => {
    fetchEscrow()
  }, [tournamentId])

  const handleFund = async () => {
    setFundingLoading(true)
    try {
      const res = await api.post(`/tournaments/${tournamentId}/escrow/funding`, {
        amount: fundingAmount,
        method: selectedProvider,
        provider: selectedProvider,
      })
      if (res.data.paymentIntent?.checkoutUrl) {
        window.location.href = res.data.paymentIntent.checkoutUrl
      } else {
        toast({ title: "Đã tạo yêu cầu", description: "Vui lòng chờ hệ thống xác nhận." })
        await fetchEscrow()
      }
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.response?.data?.error || "Không thể nạp tiền", variant: "destructive" })
    } finally {
      setFundingLoading(false)
    }
  }

  const handleRequestPayout = async () => {
    setPayoutLoading(true)
    try {
      const activeParticipants = [...participants]
        .filter(p => (p.scoreTotal || 0) > 0)
        .sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0))

      let dist: number[] = []
      if (Array.isArray(prizeStructure)) {
        dist = prizeStructure.map(p => Number(p))
      } else if (typeof prizeStructure === 'object' && prizeStructure !== null) {
        // assume object like {"1": 0.5, "2": 0.3}
        const obj = prizeStructure as Record<string, number>
        const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b))
        dist = keys.map(k => obj[k])
      } else {
        const count = participants.length
        dist = count >= 8 ? [0.4, 0.3, 0.2, 0.1] : count >= 6 ? [0.5, 0.3, 0.2] : count >= 4 ? [0.6, 0.4] : [1.0]
      }

      // We treat escrow.requiredAmount as the Gross Pool
      const totalPool = escrow ? escrow.requiredAmount : 0
      const hostFeePercent = 0.1 // Default 10%
      const prizePool = totalPool * (1 - hostFeePercent)
      const hostFeeAmount = totalPool * hostFeePercent
      
      const winners: any[] = []
      let currentRank = 1
      let previousScore: number | null = null
      let tiedRankCount = 0

      for (let i = 0; i < activeParticipants.length; i++) {
        const participant = activeParticipants[i]
        
        if (previousScore !== null && participant.scoreTotal! < previousScore) {
          currentRank += tiedRankCount
          tiedRankCount = 1
        } else if (previousScore === null || participant.scoreTotal === previousScore) {
          tiedRankCount++
        } else {
          tiedRankCount = 1
        }
        previousScore = participant.scoreTotal!

        const pPercentage = dist[currentRank - 1]
        if (pPercentage !== undefined) {
          const ratio = pPercentage > 1 ? pPercentage / 100 : pPercentage
          const amount = prizePool * ratio
          if (amount > 0) {
            winners.push({
              participantId: participant.id,
              amount: amount
            })
          }
        }
      }

      // Add Host Fee payout for Organizer
      if (hostFeeAmount > 0) {
        winners.push({
          userId: (escrow as any)?.tournament?.organizerId || "SYSTEM_HOST_FEE",
          amount: hostFeeAmount,
          isHostFee: true
        })
      }
      
      const res = await api.post(`/tournaments/${tournamentId}/payouts/request-release`, {
        recipients: winners.length > 0 ? winners : [{ participantId: activeParticipants[0]?.id, amount: totalPool }], // Fallback to 1st place if logic fails
        note: "Organizer yêu cầu xuất quỹ",
      })
      toast({ title: "Thành công", description: "Đã gửi yêu cầu rút quỹ. Vui lòng chờ admin duyệt." })
      await fetchEscrow()
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.response?.data?.error || error?.response?.data?.message || "Không thể yêu cầu xuất quỹ", variant: "destructive" })
    } finally {
      setPayoutLoading(false)
    }
  }

  const handleAdminApprovePayout = async () => {
    setAdminPayoutLoading(true)
    try {
      const res = await api.post(`/admin/tournaments/${tournamentId}/payouts/release`, {
        paymentMethod: "gateway",
        note: "Admin duyệt trên UI"
      })
      toast({ title: "Thành công", description: "Đã duyệt và phát quỹ thành công." })
      await fetchEscrow()
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.response?.data?.error || "Không thể duyệt xuất quỹ", variant: "destructive" })
    } finally {
      setAdminPayoutLoading(false)
    }
  }

  if (isCommunityMode) {
    return (
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-orange-400">Chế độ Community (Không có Quỹ Escrow)</h3>
          <p className="text-sm text-zinc-400 mt-2 max-w-lg">
            Giải đấu này đang chạy ở chế độ Community. Hệ thống TesTicTour sẽ không bảo lãnh tiền thưởng. 
            Người tổ chức tự chịu trách nhiệm trao giải cho người chơi.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!escrow) {
    return (
      <Card className="border-dashed border-2 border-zinc-700/50 bg-zinc-900/30">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-10 w-10 text-zinc-500 mb-3" />
          <h3 className="text-lg font-semibold text-zinc-300">Không tìm thấy thông tin Quỹ</h3>
          <p className="text-sm text-zinc-500 mt-1">Escrow chưa được cấu hình cho giải đấu này.</p>
        </CardContent>
      </Card>
    )
  }

  const fillPercent = escrow.requiredAmount > 0 ? (escrow.fundedAmount / escrow.requiredAmount) * 100 : 0
  const isFullyFunded = escrow.fundedAmount >= escrow.requiredAmount && escrow.requiredAmount > 0
  const calculatedPayouts = getCalculatedPayouts()

  return (
    <div className="space-y-6">
      {/* TRẠNG THÁI TỔNG QUAN */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`border ${isFullyFunded ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
              Trạng thái Escrow
              <ShieldCheck className={`h-4 w-4 ${isFullyFunded ? 'text-emerald-500' : 'text-blue-500'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {escrow.status === 'init' && "Đang chờ nạp"}
              {escrow.status === 'funded' && "Đã nạp đủ"}
              {escrow.status === 'locked' && "Đang khóa (Thi đấu)"}
              {escrow.status === 'released' && "Đã phát thưởng"}
              {escrow.status === 'disputed' && "Đang tranh chấp"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Trạng thái đối soát: {escrow.reconciliationStatus}</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/50">
           <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
              Đã nạp (Quỹ bảo lãnh)
              <Banknote className="h-4 w-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className="text-2xl font-bold text-emerald-400">
                ${escrow.fundedAmount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ ${escrow.requiredAmount.toLocaleString()} USD</span>
              </div>
              <div className="text-[11px] text-emerald-400/70 mt-0.5">
                {formatVndText(escrow.fundedAmount)} <span className="opacity-70">/ {formatVndText(escrow.requiredAmount)}</span>
              </div>
            </div>
            <Progress value={fillPercent} className={`h-1.5 mt-2 ${isFullyFunded ? '[&>div]:bg-emerald-500' : '[&>div]:bg-blue-500'}`} />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/50">
           <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
              Đã phát thưởng
              <DollarSign className="h-4 w-4 text-violet-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-400 flex flex-col">
              <span>${escrow.releasedAmount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">USD</span></span>
              <span className="text-[11px] text-violet-400/70 font-normal mt-0.5">{formatVndText(escrow.releasedAmount)}</span>
            </div>
            {escrow.status === 'released' && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Đã hoàn tất</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* NẠP QUỸ (HÀNH ĐỘNG TRƯỚC HẠN) */}
        <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="w-5 h-5 text-blue-400" /> 1. Nạp Quỹ Bảo Lãnh
            </CardTitle>
            <CardDescription>
              Bạn cần nạp đủ <strong>${escrow.requiredAmount.toLocaleString()} USD ({formatVndText(escrow.requiredAmount)})</strong> vào quỹ Escrow trước khi giải đấu bắt đầu. Nếu quỹ trống, giải sẽ không thể <code>Bắt đầu (Start)</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isFullyFunded ? (
              <>
                <div className="space-y-2">
                   <Alert className="bg-orange-500/10 border-orange-500/30 text-orange-400">
                    <Clock className="h-4 w-4" />
                    <AlertTitle className="text-sm font-bold">Chưa nạp đủ quỹ</AlertTitle>
                    <AlertDescription className="text-xs">
                      Thiếu ${Math.max(0, escrow.requiredAmount - escrow.fundedAmount).toLocaleString()} USD ({formatVndText(Math.max(0, escrow.requiredAmount - escrow.fundedAmount))}). Hãy chọn phương thức thanh toán.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Hệ thống thanh toán</label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="bg-black/20 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe (Quốc tế)</SelectItem>
                      <SelectItem value="momo">MoMo (Việt Nam)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={handleFund} 
                  disabled={fundingLoading}
                >
                  {fundingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Thanh toán ngay (${fundingAmount.toLocaleString()} USD)
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-10 h-10 mb-2 opacity-80" />
                <h4 className="font-semibold">Đã Nạp Đủ Quỹ</h4>
                <p className="text-xs text-center mt-1 text-emerald-400/80">Quỹ đã an toàn. Bạn có thể Bắt đầu giải đấu khi đến giờ.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* YÊU CẦU PHÁT THƯỞNG (HÀNH ĐỘNG SAU KHI KẾT THÚC) */}
        <Card className="border-violet-500/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-400" /> 2. Rút Quỹ Phân Bổ (Payout)
            </CardTitle>
            <CardDescription>
              Sau khi giải kết thúc và có kết quả chung cuộc, Organizer có quyền trình dữ liệu nhận thưởng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournamentStatus !== "COMPLETED" ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-xl border border-white/10 text-muted-foreground">
                <Clock className="w-10 h-10 mb-2 opacity-30" />
                <h4 className="font-semibold text-sm">Chưa Thể Rút Quỹ</h4>
                <p className="text-xs text-center mt-1 w-3/4">
                  Giải đấu đang ở trạng thái <code>{tournamentStatus}</code>. Bạn chỉ có thể yêu cầu phát thưởng sau khi giải hoàn tất toàn bộ tiến trình.
                </p>
              </div>
            ) : escrow.status === "released" ? (
               <div className="flex flex-col items-center justify-center p-6 bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-400">
                <CheckCircle2 className="w-10 h-10 mb-2 opacity-80" />
                <h4 className="font-semibold">Đã Phát Thưởng</h4>
                <p className="text-xs text-center mt-1 text-violet-400/80">Quỹ Escrow đã được chuyển tới người chơi hoặc được đánh dấu là giải ngân. Xem Settlement Report để kiểm tra chi tiết.</p>
              </div>
            ) : (
              <>
                <Alert className="bg-violet-500/10 border-violet-500/30 text-violet-300">
                  <Play className="h-4 w-4" />
                  <AlertTitle className="text-sm font-bold">Lập lệnh Rút Quỹ</AlertTitle>
                  <AlertDescription className="text-xs">
                    Kiểm tra thật kỹ thứ hạng của người chơi trước khi xuất quỹ.
                    {isAdmin ? " Bạn là Admin, có thể Duyệt trực tiếp." : " Hành động này sẽ yêu cầu Admin kiểm duyệt xác nhận."}
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2 mt-4 flex-col sm:flex-row">
                  <Button 
                    className="flex-1 bg-violet-600 hover:bg-violet-700" 
                    onClick={handleRequestPayout}
                    disabled={payoutLoading || escrow.status === 'payout_requested'}
                  >
                    {payoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                    {escrow.status === 'payout_requested' ? "Đã Gửi Yêu Cầu Rút" : "Yêu Cầu Rút Quỹ"}
                  </Button>

                  {isAdmin && escrow.status === 'payout_requested' && (
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                      onClick={handleAdminApprovePayout}
                      disabled={adminPayoutLoading}
                    >
                      {adminPayoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Duyệt & Phát Thưởng
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DANH SÁCH PHÁT THƯỞNG */}
      <Card className="border-white/10 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Danh Sách Nhận Thưởng (Payout List)</CardTitle>
          <CardDescription>
            Danh sách người chơi và thông tin liên lạc (Email, Discord, Riot ID) để bạn dễ dàng phát phần thưởng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Hạng</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Discord</TableHead>
                  <TableHead>Riot ID (PUUID)</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Dự tính Thưởng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Chưa có người chơi nào đủ điều kiện nhận thưởng
                    </TableCell>
                  </TableRow>
                ) : (
                  calculatedPayouts.map((row) => {
                    const { user } = row.participant
                    const shortPuuid = user?.puuid ? `${user.puuid.substring(0, 4)}...${user.puuid.substring(user.puuid.length - 4)}` : "N/A"
                    return (
                      <TableRow key={row.participant.id}>
                        <TableCell className="font-semibold text-primary">#{row.rank}</TableCell>
                        <TableCell>
                          <div className="font-medium">{user?.riotGameName}</div>
                          <div className="text-xs text-muted-foreground">#{user?.riotGameTag}</div>
                        </TableCell>
                        <TableCell className="text-xs opacity-80">{user?.email || "N/A"}</TableCell>
                        <TableCell>
                          {user?.discordId ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#5865F2] font-semibold">{user.discordId}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => {
                                  navigator.clipboard.writeText(user.discordId || "");
                                  toast({
                                    title: "Đã copy",
                                    description: `Đã copy Discord ID: ${user.discordId}`,
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user?.puuid ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">{shortPuuid}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => {
                                  navigator.clipboard.writeText(user.puuid || "");
                                  toast({
                                    title: "Đã copy",
                                    description: "Đã copy PUUID",
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.participant.scoreTotal || 0}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-400 whitespace-nowrap">
                          {row.estimatedPayout > 0 ? (
                            <div className="flex flex-col items-end">
                              <span>${row.estimatedPayout.toLocaleString()} <span className="text-[10px] text-emerald-400/70 font-normal">USD</span></span>
                              <span className="text-[10px] text-emerald-400/50 font-normal">{formatVndText(row.estimatedPayout)}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
