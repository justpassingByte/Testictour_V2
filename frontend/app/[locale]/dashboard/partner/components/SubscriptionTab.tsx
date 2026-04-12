"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Crown, Users, DollarSign, CheckCircle, XCircle, TrendingUp, Calendar, Settings, CreditCard, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react"
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
}

const PLAN_FEATURES = {
  FREE: {
    playerManagement: true,
    basicAnalytics: true,
    revenueTracking: true,
    csvExport: true,
    maxPlayers: 50,
    maxLobbies: 5,
    supportLevel: 'basic',
    paymentGateway: false,
    automaticWithdrawals: false,
    playerDeposits: false,
    withdrawalManagement: false
  },
  PRO: {
    playerManagement: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    revenueTracking: true,
    csvExport: true,
    customBranding: true,
    apiAccess: true,
    maxPlayers: 500,
    maxLobbies: 50,
    supportLevel: 'priority',
    withdrawalProcessing: 'fast',
    paymentGateway: true,
    automaticWithdrawals: true,
    playerDeposits: true,
    withdrawalManagement: true
  },
  ENTERPRISE: {
    playerManagement: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    revenueTracking: true,
    csvExport: true,
    customBranding: true,
    apiAccess: true,
    whiteLabel: true,
    customIntegrations: true,
    dedicatedSupport: true,
    maxPlayers: -1, // unlimited
    maxLobbies: -1, // unlimited
    supportLevel: 'dedicated',
    withdrawalProcessing: 'priority',
    paymentGateway: true,
    automaticWithdrawals: true,
    playerDeposits: true,
    withdrawalManagement: true,
    customPaymentGateway: true
  }
}

export default function SubscriptionTab({ partnerId }: { partnerId?: string }) {
  const [subscription, setSubscription] = useState<PartnerSubscription | null>(null)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
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
      } else {
        console.error('Failed to fetch subscription')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Unknown</Badge>
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'ENTERPRISE':
        return <Crown className="h-4 w-4 text-purple-500" />
      default:
        return <Users className="h-4 w-4 text-gray-500" />
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'ENTERPRISE':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const handleUpgradePlan = async (plan: string) => {
    try {
      const response = await fetch('/api/partner/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan })
      })

      if (response.ok) {
        alert('Upgrade request submitted successfully')
        fetchSubscription()
      } else {
        alert('Failed to submit upgrade request')
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
      alert('Error upgrading plan')
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

  // Merge dynamic DB config over the static PLAN_FEATURES skeleton
  const ACTIVE_PLAN_FEATURES = (() => {
    if (!availablePlans || availablePlans.length === 0) return PLAN_FEATURES;

    const merged: Record<string, any> = {};

    ['FREE', 'PRO', 'ENTERPRISE'].forEach(planKey => {
      const plan = availablePlans.find((p: any) => p.plan === planKey);
      const defaultFeatures = (PLAN_FEATURES as any)[planKey] || {};
      
      merged[planKey] = { ...defaultFeatures };
      
      // Remove all boolean keys from default features so deleted features don't show up
      Object.keys(merged[planKey]).forEach(key => {
          if (typeof merged[planKey][key] === 'boolean') {
              delete merged[planKey][key];
          }
      });

      if (plan) {
          // Add back the dynamically configured boolean features from DB
          if (typeof plan.features === 'object' && plan.features) {
              Object.assign(merged[planKey], plan.features);
          }

          if (plan.maxLobbies !== undefined) merged[planKey].maxLobbies = plan.maxLobbies;
          if (plan.maxPlayersPerLobby !== undefined) merged[planKey].maxPlayers = plan.maxPlayersPerLobby;
      }
    });

    return merged as typeof PLAN_FEATURES;
  })();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">Review your active limits and upgrade your plan to scale your business.</p>
      </div>

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
        <>
          <div className="flex flex-col gap-6">
            {['FREE', 'PRO', 'ENTERPRISE'].map((planKey) => {
              const features = ACTIVE_PLAN_FEATURES[planKey as keyof typeof ACTIVE_PLAN_FEATURES] as any;
              const isCurrent = subscription.plan === planKey;
              const title = planKey === 'FREE' ? 'Basic' : planKey === 'PRO' ? 'Professional' : 'Enterprise';
              const price = planKey === 'FREE' ? 0 : planKey === 'PRO' ? 29.99 : 99.99;
              
              const borderColors = planKey === 'FREE' ? 'border-slate-500/30' : planKey === 'PRO' ? 'border-yellow-500/50' : 'border-purple-500/50';
              const bgGlow = planKey === 'FREE' ? 'from-slate-500/5' : planKey === 'PRO' ? 'from-yellow-500/10' : 'from-purple-500/10';
              const textGlow = planKey === 'FREE' ? 'text-slate-200' : planKey === 'PRO' ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]';
              const buttonTheme = planKey === 'FREE' ? 'bg-slate-700 hover:bg-slate-600' : planKey === 'PRO' ? 'bg-yellow-500 hover:bg-yellow-600 text-black font-bold' : 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)]';

              return (
                <div key={planKey} className={`relative flex flex-col rounded-xl overflow-hidden backdrop-blur-xl border ${borderColors} ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${bgGlow} to-transparent z-0`}></div>
                  <div className="relative z-10 p-6 flex flex-col h-full bg-card/40 hover:bg-card/60 transition-colors duration-300">
                  {isCurrent && (
                     <div className="absolute top-4 right-4">
                       <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 shadow-lg px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">
                         Active Plan
                       </Badge>
                     </div>
                  )}
                  <div className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className={`p-2 rounded-lg bg-black/40 border border-white/10 ${textGlow}`}>
                         {getPlanIcon(planKey)}
                       </div>
                       <h3 className={`text-2xl font-black uppercase tracking-widest ${textGlow}`}>{title}</h3>
                    </div>
                    <div className="mt-4 flex items-end gap-1">
                       <span className="text-4xl font-extrabold tracking-tight">${price}</span>
                       <span className="text-sm text-muted-foreground font-medium pb-1">/month</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                     <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold text-blue-400">{features.maxPlayers === -1 ? '∞' : features.maxPlayers}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Players</span>
                       </div>
                       <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold text-emerald-400">{features.maxLobbies === -1 ? '∞' : features.maxLobbies}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Lobbies / M</span>
                       </div>
                     </div>
                     <div className="space-y-3 mb-8 flex-1 grid grid-cols-2 gap-x-2 gap-y-3">
                        {Object.entries(features).map(([key, value]) => {
                           if (key === 'maxPlayers' || key === 'maxLobbies' || key === 'supportLevel' || key === 'withdrawalProcessing') return null;
                           if (!value) return null; // Don't show inactive features
                           
                           return (
                             <div key={key} className="flex items-center gap-2 text-xs">
                               <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                               <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                             </div>
                           );
                        })}
                        <div className="flex items-center gap-2 text-xs">
                           <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                           <span className="text-muted-foreground capitalize">{features.supportLevel} Support</span>
                        </div>
                        {features.withdrawalProcessing && (
                           <div className="flex items-center gap-2 text-xs">
                             <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                             <span className="text-muted-foreground capitalize">{features.withdrawalProcessing} Withdrawals</span>
                           </div>
                        )}
                     </div>
                     <div className="mt-auto pt-4">
                       <Button 
                         className={`w-full py-6 text-sm uppercase tracking-widest transition-transform hover:scale-[1.02] ${buttonTheme}`}
                         variant={isCurrent ? "outline" : "default"}
                         disabled={isCurrent}
                         onClick={() => handleUpgradePlan(planKey)}
                       >
                         {isCurrent ? 'Current Plan' : `Select ${title}`}
                       </Button>
                     </div>
                  </div>
                 </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
