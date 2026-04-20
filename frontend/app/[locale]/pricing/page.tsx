"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  CheckCircle, XCircle, Crown, Users, Zap, Building2,
  Sparkles, ArrowRight, Trophy, Shield, BarChart3, Gamepad2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface PlanConfig {
  plan: string
  displayName: string
  description: string
  monthlyPrice: number
  annualPrice: number
  earlyAccessPrice?: number | null
  maxLobbies: number
  maxTournamentSize: number
  maxTournamentsPerMonth: number
  platformFeePercent: number
  features: Record<string, boolean>
  sortOrder: number
}

const PLAN_STYLES: Record<string, {
  icon: any; gradient: string; border: string; text: string;
  button: string; cardBg: string; badge?: string; accent: string;
}> = {
  STARTER: {
    icon: Zap, gradient: "from-emerald-600/20 to-emerald-800/10", border: "border-emerald-500/30",
    text: "text-emerald-400", button: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold",
    cardBg: "bg-emerald-900/20", accent: "text-emerald-400",
  },
  PRO: {
    icon: Crown, gradient: "from-amber-500/20 to-yellow-700/10", border: "border-yellow-500/40",
    text: "text-yellow-400", button: "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold shadow-lg shadow-yellow-500/25",
    cardBg: "bg-yellow-900/10", badge: "Most Popular", accent: "text-yellow-400",
  },
  ENTERPRISE: {
    icon: Building2, gradient: "from-purple-600/20 to-violet-800/10", border: "border-purple-500/30",
    text: "text-purple-400", button: "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold shadow-lg shadow-purple-500/25",
    cardBg: "bg-purple-900/10", accent: "text-purple-400",
  },
}

const FEATURE_LABELS: Record<string, string> = {
  basicBracket: "Tạo giải đấu nhanh",
  leaderboardRealtime: "Leaderboard realtime",
  manualResultEntry: "Nhập kết quả thủ công",
  autoScoring: "Tự động tính điểm",
  basicRegistration: "Đăng ký cơ bản",
  simpleCheckIn: "Check-in đơn giản",
  exportBracket: "Export bracket",
  bannerBranding: "Banner branding",
  manualEscrow: "Escrow thủ công",
  autoLobbyShuffleSplit: "Auto shuffle & split lobby",
  customBranding: "Custom branding",
  analyticsExport: "Analytics export",
  autoMatchResult: "Auto match result (API)",
  gateway: "Payment gateway",
  customRewards: "Custom rewards",
  reservePlayer: "Reserve player system",
  advancedAnalytics: "Advanced analytics",
  autoRoundProgression: "Auto round progression",
  revenueShare: "Revenue share",
  prioritySupport: "Priority support",
  discordIntegration: "Discord integration",
  autoEscrow: "Auto escrow",
  autoPayout: "Auto payout",
  autoRefund: "Auto refund",
  customRuleConfig: "Custom rule config",
  earlyAccessFeatures: "Early access features",
  unlimitedTournaments: "Unlimited tournaments",
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/plans`)
        const data = await res.json()
        if (data.plans) setPlans(data.plans)
      } catch (err) {
        console.error('Failed to fetch plans:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  // Gather all feature keys across all plans for comparison table
  const allFeatureKeys = Array.from(
    new Set(plans.flatMap(p => Object.keys(p.features || {})))
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-amber-600/10 rounded-full blur-[120px]" />
        
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <Badge className="bg-gradient-to-r from-violet-500/20 to-amber-500/20 border-violet-500/30 text-violet-300 px-4 py-1.5 mb-6 text-sm">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Early Access — Giảm giá đặc biệt
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Tổ chức giải đấu chuyên nghiệp
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Không cần Google Sheets 🚀
          </p>
          <p className="text-sm md:text-base text-muted-foreground/70 max-w-2xl mx-auto mb-8">
            Từ giải nhỏ đến hệ thống lớn — tự động hóa vận hành, giảm nhân lực, tăng trải nghiệm cho player.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-xl border border-white/10 rounded-full p-1 mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Annual
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5">-17%</Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative max-w-6xl mx-auto px-4 -mt-4 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[500px] rounded-2xl bg-card/40 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const style = PLAN_STYLES[plan.plan] || PLAN_STYLES.STARTER
              const Icon = style.icon
              const price = billingCycle === 'annual' && plan.annualPrice > 0
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice
              const hasEarlyAccess = plan.earlyAccessPrice && plan.earlyAccessPrice > 0
              const isPopular = plan.plan === 'PRO'

              return (
                <div
                  key={plan.plan}
                  className={`relative flex flex-col rounded-2xl overflow-hidden backdrop-blur-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${style.border} ${isPopular ? 'lg:-mt-4 lg:mb-4 ring-2 ring-yellow-500/30' : ''}`}
                >
                  {/* Badge */}
                  {style.badge && (
                    <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-center py-1 text-[11px] font-bold uppercase tracking-wider">
                      ⭐ {style.badge}
                    </div>
                  )}

                  <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} z-0`} />

                  <div className={`relative z-10 p-6 flex flex-col h-full ${style.cardBg} ${style.badge ? 'pt-10' : ''}`}>
                    {/* Header */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className={`p-2 rounded-xl bg-black/40 border border-white/10 ${style.text}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className={`text-xl font-black uppercase tracking-wider ${style.text}`}>
                          {plan.displayName || plan.plan}
                        </h3>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      {hasEarlyAccess ? (
                        <div className="flex items-end gap-2">
                          <span className="text-lg text-muted-foreground/60 line-through decoration-red-500/70 decoration-2">${plan.monthlyPrice}</span>
                          <span className={`text-4xl font-black tracking-tight ${style.accent}`}>${plan.earlyAccessPrice}</span>
                          <span className="text-xs text-muted-foreground pb-1">/mo</span>
                        </div>
                      ) : (
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-black tracking-tight">${price}</span>
                          <span className="text-xs text-muted-foreground pb-1">/mo</span>
                        </div>
                      )}
                      {hasEarlyAccess && (
                        <Badge className="mt-2 bg-red-500/10 text-red-400 border-red-500/20 text-[9px]">
                          🔥 Early Access Price
                        </Badge>
                      )}
                      {billingCycle === 'annual' && plan.annualPrice > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          ${plan.annualPrice.toLocaleString()}/year billed annually
                        </p>
                      )}
                    </div>

                    {/* Limits */}
                    <div className="space-y-2 mb-5">
                      <div className="bg-black/30 border border-white/5 px-3 py-2 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tournaments/Mo</span>
                        <span className={`text-sm font-bold ${style.accent}`}>
                          {plan.maxTournamentsPerMonth === -1 ? '∞' : plan.maxTournamentsPerMonth}
                        </span>
                      </div>
                      <div className="bg-black/30 border border-white/5 px-3 py-2 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Max Players</span>
                        <span className="text-sm font-bold text-blue-400">
                          {plan.maxTournamentSize === -1 ? '∞' : plan.maxTournamentSize}
                        </span>
                      </div>
                      <div className="bg-black/30 border border-white/5 px-3 py-2 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Active Lobbies</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {plan.maxLobbies === -1 ? '∞' : plan.maxLobbies}
                        </span>
                      </div>
                      <div className="bg-black/30 border border-white/5 px-3 py-2 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Platform Fee</span>
                        <span className="text-sm font-bold text-orange-400">{Math.round(plan.platformFeePercent * 100)}%</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-1.5 mb-6 flex-1">
                      {Object.entries(plan.features || {})
                        .filter(([, v]) => v === true)
                        .slice(0, 8)
                        .map(([key]) => (
                          <div key={key} className="flex items-center gap-1.5 text-[11px]">
                            <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="text-muted-foreground">{FEATURE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                          </div>
                        ))}
                      {Object.values(plan.features || {}).filter(v => v).length > 8 && (
                        <p className="text-[10px] text-muted-foreground/50 pl-4.5">
                          +{Object.values(plan.features).filter(v => v).length - 8} more features
                        </p>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button asChild className={`w-full py-6 text-sm uppercase tracking-wider transition-transform hover:scale-[1.02] ${style.button}`}>
                        <Link href={plan.plan === 'ENTERPRISE' ? '/organize' : '/organize'}>
                          {plan.plan === 'STARTER' ? 'Get Started Free' : plan.plan === 'ENTERPRISE' ? 'Contact Us' : (
                            <span className="flex items-center gap-2">
                              Start Now <ArrowRight className="h-4 w-4" />
                            </span>
                          )}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Feature Comparison Table */}
      {!loading && plans.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">So sánh chi tiết các gói</h2>
            <p className="text-muted-foreground text-sm">Xem đầy đủ tính năng mỗi gói</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground w-[240px]">Feature</th>
                  {plans.map(p => {
                    const style = PLAN_STYLES[p.plan] || PLAN_STYLES.STARTER
                    return (
                      <th key={p.plan} className={`py-3 px-4 text-center text-sm font-bold ${style.text}`}>
                        {p.displayName || p.plan}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Limits rows */}
                {[
                  { key: 'maxTournamentsPerMonth', label: 'Tournaments / Month' },
                  { key: 'maxTournamentSize', label: 'Max Players' },
                  { key: 'maxLobbies', label: 'Active Lobbies' },
                  { key: 'platformFeePercent', label: 'Platform Fee' },
                ].map(({ key, label }) => (
                  <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 text-sm text-muted-foreground">{label}</td>
                    {plans.map(p => {
                      const val = (p as any)[key]
                      let display: string
                      if (key === 'platformFeePercent') display = `${Math.round(val * 100)}%`
                      else display = val === -1 ? '∞ Unlimited' : String(val)
                      return (
                        <td key={p.plan} className="py-2.5 px-4 text-center text-sm font-medium">
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Feature rows */}
                {allFeatureKeys.map((featureKey) => (
                  <tr key={featureKey} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 text-sm text-muted-foreground">
                      {FEATURE_LABELS[featureKey] || featureKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </td>
                    {plans.map(p => {
                      const has = p.features?.[featureKey]
                      return (
                        <td key={p.plan} className="py-2.5 px-4 text-center">
                          {has ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500/30 mx-auto" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Why TesticTour */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Tại sao chọn TesticTour?</h2>
          <p className="text-muted-foreground text-sm">Nền tảng tổ chức giải đấu hàng đầu</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Zap, title: "Giảm 70-90% thao tác", desc: "Tự động chia lobby, shuffle player, lưu kết quả tự động, không cần làm tay", color: "violet" },
            { icon: Users, title: "Giảm Staff Vận Hành", desc: "Hệ thống tự lo workflow, bạn chỉ duyệt kết quả hoặc can thiệp edge case", color: "amber" },
            { icon: Sparkles, title: "Giữ Chân Player", desc: "Trải nghiệm player trơn tru, đi kèm Reserve và Custom Rewards hấp dẫn", color: "emerald" },
            { icon: BarChart3, title: "Dễ Scale & Mở Rộng", desc: "Tổ chức nhiều giải cùng lúc trên 1 dashboard dễ dàng, không sợ rối", color: "cyan" },
          ].map(card => (
            <Card key={card.title} className={`bg-gradient-to-br from-${card.color}-500/10 to-${card.color}-600/5 border-${card.color}-500/20 hover:border-${card.color}-500/40 transition-colors`}>
              <CardContent className="p-5">
                <div className={`h-10 w-10 rounded-xl bg-${card.color}-500/20 flex items-center justify-center mb-3`}>
                  <card.icon className={`h-5 w-5 text-${card.color}-400`} />
                </div>
                <h3 className="font-bold mb-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-900/10 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Bắt đầu tổ chức giải đấu ngay</h2>
          <p className="text-muted-foreground mb-8">
            Đăng ký miễn phí, nâng cấp khi bạn sẵn sàng scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-bold px-8 shadow-xl shadow-violet-500/20">
              <Link href="/organize">
                <Sparkles className="mr-2 h-4 w-4" />
                Try Early Access
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 px-8">
              <Link href="/organize">
                Liên hệ tư vấn
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
