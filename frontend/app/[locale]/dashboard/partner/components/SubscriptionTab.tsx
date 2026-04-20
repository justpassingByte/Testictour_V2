"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Users, CheckCircle, Sparkles, Zap, Building2, Clock, CalendarDays, ArrowRight } from "lucide-react"
import api from "@/app/lib/apiConfig"

interface PartnerSubscription {
  id: string
  userId: string
  plan: string
  status: string
  startDate: string
  endDate?: string
  features: any
  monthlyPrice?: number
  annualPrice?: number
  autoRenew: boolean
  createdAt: string
  updatedAt: string
  currentUsage?: {
    activeLobbies: number
    activeTournaments: number
    tournamentsThisMonth: number
  }
}

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
  icon: any, color: string, border: string, bg: string, text: string, button: string, accent: string
}> = {
  STARTER: {
    icon: Zap, color: 'green', border: 'border-emerald-500/40', bg: 'from-emerald-500/10',
    text: 'text-emerald-400', button: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold', accent: 'text-emerald-400',
  },
  PRO: {
    icon: Crown, color: 'yellow', border: 'border-yellow-500/50', bg: 'from-yellow-500/10',
    text: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]',
    button: 'bg-yellow-500 hover:bg-yellow-600 text-black font-bold', accent: 'text-yellow-400',
  },
  ENTERPRISE: {
    icon: Building2, color: 'purple', border: 'border-purple-500/50', bg: 'from-purple-500/10',
    text: 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    button: 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)]', accent: 'text-purple-400',
  },
}

export default function SubscriptionTab({ partnerId }: { partnerId?: string }) {
  const [subscription, setSubscription] = useState<PartnerSubscription | null>(null)
  const [availablePlans, setAvailablePlans] = useState<PlanConfig[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    try {
      let url = '/partner/subscription';
      if (partnerId) {
        url += `?targetPartnerId=${partnerId}`;
      }

      const response = await api.get(url)

      if (response.data && response.data.data) {
        setSubscription(response.data.data)
        if (response.data.availablePlans) {
          setAvailablePlans(response.data.availablePlans)
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const handleUpgradePlan = async (plan: string) => {
    try {
      const response = await api.post('/partner/subscription/upgrade', { plan });
      if (response.data && response.data.success) {
        if (response.data.data.requiresPayment && response.data.data.checkoutUrl) {
          window.location.href = response.data.data.checkoutUrl;
          return;
        }
        alert('Plan updated successfully');
        fetchSubscription();
      } else {
        alert('Failed to submit upgrade request');
      }
    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      alert(error.response?.data?.error || 'Error upgrading plan');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 border-t-transparent border-r-transparent mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading subscription information...</p>
      </div>
    )
  }

  // Build plan data from API — fully dynamic
  const plansToRender = availablePlans.length > 0
    ? [...availablePlans].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Calculate days remaining for current plan
  const daysRemaining = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">Review your active limits and upgrade your plan to scale your business.</p>
      </div>

      {/* Current Plan Status Card */}
      {subscription && (
        <Card className="bg-gradient-to-r from-primary/5 via-card/60 to-primary/5 border-primary/20 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  {(() => {
                    const style = PLAN_STYLES[subscription.plan] || PLAN_STYLES.STARTER;
                    const Icon = style.icon;
                    return <Icon className={`h-6 w-6 ${style.accent}`} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {availablePlans.find(p => p.plan === subscription.plan)?.displayName || subscription.plan}
                    <Badge className={`text-[10px] ${subscription.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                      {subscription.status}
                    </Badge>
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    {subscription.startDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Started: {new Date(subscription.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {subscription.endDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires: {new Date(subscription.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {daysRemaining !== null && subscription.plan !== 'STARTER' && (
                  <div className={`text-center px-4 py-2 rounded-lg border ${daysRemaining <= 7 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <div className="text-2xl font-bold">{daysRemaining}</div>
                    <div className="text-[10px] uppercase tracking-wider font-medium">Days Left</div>
                  </div>
                )}
                {subscription.autoRenew && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Auto-Renew
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Cards — Fully Dynamic */}
      {!subscription ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Subscription Found</h3>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have an active subscription. Contact your administrator to get access to premium features.
            </p>
            <Button onClick={() => alert('Contact support to activate your subscription')}>
              Request Access
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plansToRender.map((planConfig) => {
            const style = PLAN_STYLES[planConfig.plan] || PLAN_STYLES.STARTER;
            const Icon = style.icon;
            const isCurrent = subscription.plan === planConfig.plan;
            const features = planConfig.features || {};
            const isRecommended = planConfig.plan === 'PRO';

            return (
              <div key={planConfig.plan} className={`relative flex flex-col rounded-xl overflow-hidden backdrop-blur-xl border ${style.border} ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}>
                {isRecommended && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />
                )}
                <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} to-transparent z-0`}></div>
                <div className="relative z-10 p-5 flex flex-col h-full bg-card/40 hover:bg-card/60 transition-colors duration-300">
                  {isCurrent && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 shadow-lg px-2 py-0.5 font-semibold uppercase tracking-wider text-[9px]">
                        Active
                      </Badge>
                    </div>
                  )}
                  {isRecommended && !isCurrent && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-2 py-0.5 text-[9px] font-bold uppercase">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg bg-black/40 border border-white/10 ${style.text}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className={`text-lg font-black uppercase tracking-widest ${style.text}`}>
                        {planConfig.displayName || planConfig.plan}
                      </h3>
                    </div>
                    {planConfig.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{planConfig.description}</p>
                    )}
                    <div className="mt-3 flex items-end gap-1">
                      {planConfig.earlyAccessPrice ? (
                        <>
                          <span className="text-lg text-muted-foreground line-through">${planConfig.monthlyPrice}</span>
                          <span className={`text-3xl font-extrabold tracking-tight ${style.accent}`}>${planConfig.earlyAccessPrice}</span>
                        </>
                      ) : (
                        <span className="text-3xl font-extrabold tracking-tight">${planConfig.monthlyPrice}</span>
                      )}
                      <span className="text-xs text-muted-foreground font-medium pb-1">/mo</span>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="bg-black/30 border border-white/5 p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Max Players</span>
                      <span className="text-sm font-bold text-blue-400">{planConfig.maxTournamentSize === -1 ? '∞' : planConfig.maxTournamentSize}</span>
                    </div>

                    <div className="bg-black/30 border border-white/5 p-2.5 rounded-lg flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lobbies</span>
                        <span className="text-sm font-bold text-emerald-400">{planConfig.maxLobbies === -1 ? '∞' : planConfig.maxLobbies}</span>
                      </div>
                      {isCurrent && subscription?.currentUsage && planConfig.maxLobbies !== -1 && (
                        <div className="flex flex-col gap-0.5">
                          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${Math.min(100, (subscription.currentUsage.activeLobbies / planConfig.maxLobbies) * 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-right text-emerald-500 font-medium">{subscription.currentUsage.activeLobbies} / {planConfig.maxLobbies}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-black/30 border border-white/5 p-2.5 rounded-lg flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tournaments/Mo</span>
                        <span className="text-sm font-bold text-purple-400">{planConfig.maxTournamentsPerMonth === -1 ? '∞' : planConfig.maxTournamentsPerMonth}</span>
                      </div>
                      {isCurrent && subscription?.currentUsage && planConfig.maxTournamentsPerMonth !== -1 && (
                        <div className="flex flex-col gap-0.5">
                          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                            <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${Math.min(100, (subscription.currentUsage.tournamentsThisMonth / planConfig.maxTournamentsPerMonth) * 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-right text-purple-500 font-medium">{subscription.currentUsage.tournamentsThisMonth} / {planConfig.maxTournamentsPerMonth}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-black/30 border border-white/5 p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Platform Fee</span>
                      <span className="text-sm font-bold text-orange-400">{Math.round(planConfig.platformFeePercent * 100)}%</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-1.5 mb-6 flex-1">
                    {Object.entries(features)
                      .filter(([, value]) => value === true)
                      .map(([key]) => (
                        <div key={key} className="flex items-center gap-1.5 text-[11px]">
                          <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        </div>
                      ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto pt-2">
                    <Button
                      className={`w-full py-5 text-xs uppercase tracking-widest transition-transform hover:scale-[1.02] ${style.button}`}
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                      onClick={() => handleUpgradePlan(planConfig.plan)}
                    >
                      {isCurrent ? 'Current Plan' : (
                        <span className="flex items-center gap-2">
                          {planConfig.plan === 'STARTER' ? 'Downgrade' : 'Upgrade'}
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
