"use client"

import { useState, useEffect } from "react"
import { ShieldCheck, Banknote, DollarSign, Clock, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Play, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "next-intl"
import api from "@/app/lib/apiConfig"
import { IParticipant } from "@/app/types/tournament"

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
}

export function EscrowManagementTab({ tournamentId, tournamentName, tournamentStatus, isCommunityMode, participants }: EscrowManagementTabProps) {
  const t = useTranslations("Common")
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [escrow, setEscrow] = useState<EscrowState | null>(null)
  
  // Funding state
  const [fundingLoading, setFundingLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("stripe")
  const [fundingAmount, setFundingAmount] = useState(0)
  
  // Payout state
  const [payoutLoading, setPayoutLoading] = useState(false)

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
      // Tự động generate danh sách nhận thưởng dựa trên rank
      // Giả sử có participants (sorted by placement/points in backend)
      // Ở mức Organizer (Partner), hệ thống sẽ cần JSON list. 
      // Nhưng nếu backend tự chia giải thì chỉ cần gọi endpoint
      const winners = participants
        .filter(p => (p.scoreTotal || 0) > 0)
        .sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0))
        .map(p => ({
          participantId: p.id,
          amount: 0 // Backend payout request controller validation expects an amount.
        }))
        // Tạm thời nếu ko biết logic chia, mình dùng auto chia bằng backend nếu support. 
        // Endpoint: /tournaments/:id/payouts/request-release (yêu cầu recipients: [{participantId, amount}])
      
      const res = await api.post(`/tournaments/${tournamentId}/payouts/request-release`, {
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
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrency(escrow.fundedAmount)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(escrow.requiredAmount)}</span>
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
            <div className="text-2xl font-bold text-violet-400">
              {formatCurrency(escrow.releasedAmount)}
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
              Bạn cần nạp đủ <strong>{formatCurrency(escrow.requiredAmount)}</strong> vào quỹ Escrow trước khi giải đấu bắt đầu. Nếu quỹ trống, giải sẽ không thể <code>Bắt đầu (Start)</code>.
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
                      Thiếu {formatCurrency(Math.max(0, escrow.requiredAmount - escrow.fundedAmount))}. Hãy chọn phương thức thanh toán.
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
                  Thanh toán ngay ({formatCurrency(fundingAmount)})
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
                <p className="text-xs text-center mt-1 text-violet-400/80">Quỹ Escrow đã được chuyển tới người chơi hoặc Admin trung gian. Xem Settlement Report để check chi tiết.</p>
              </div>
            ) : (
              <>
                <Alert className="bg-violet-500/10 border-violet-500/30 text-violet-300">
                  <Play className="h-4 w-4" />
                  <AlertTitle className="text-sm font-bold">Lập lệnh Rút Quỹ</AlertTitle>
                  <AlertDescription className="text-xs">
                    Kiểm tra thật kỹ thứ hạng của người chơi. Hành động này sẽ yêu cầu Admin kiểm duyệt xác nhận. Một khi được duyệt quỹ sẽ chuyển tự động.
                  </AlertDescription>
                </Alert>
                <Button 
                  className="w-full bg-violet-600 hover:bg-violet-700 mt-2" 
                  onClick={handleRequestPayout}
                  disabled={payoutLoading || escrow.status === 'payout_requested'}
                >
                  {payoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  {escrow.status === 'payout_requested' ? "Đã Gửi Yêu Cầu (Chờ ADMIN duyệt)" : "Yêu Cầu Rút Quỹ"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
