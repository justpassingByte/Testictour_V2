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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Subscription</h1>
        <Button
          onClick={() => alert('Contact support to manage your subscription')}
          variant="outline"
        >
          <Settings className="mr-2 h-4 w-4" />
          Manage Subscription
        </Button>
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
          <div className="grid md:grid-cols-3 gap-6">
            {['FREE', 'PRO', 'ENTERPRISE'].map((planKey) => {
              const features = ACTIVE_PLAN_FEATURES[planKey as keyof typeof ACTIVE_PLAN_FEATURES] as any;
              const isCurrent = subscription.plan === planKey;
              const title = planKey === 'FREE' ? 'Basic Plan' : planKey === 'PRO' ? 'Professional' : 'Enterprise';
              const price = planKey === 'FREE' ? 0 : planKey === 'PRO' ? 29.99 : 99.99;
              
              return (
                <Card key={planKey} className={`relative flex flex-col ${isCurrent ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-card'}`}>
                  {isCurrent && (
                     <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 z-10">
                       <Badge className="bg-primary text-primary-foreground shadow-lg px-2 py-1 text-xs">Current Plan</Badge>
                     </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                       <div className={`p-2 rounded-lg ${getPlanColor(planKey)} border`}>
                         {getPlanIcon(planKey)}
                       </div>
                      {title}
                    </CardTitle>
                    <div className="mt-4">
                       <span className="text-3xl font-bold">${price}</span>
                       <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    {isCurrent && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {getStatusBadge(subscription.status)} Active since {new Date(subscription.startDate).toLocaleDateString()}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                     <div className="space-y-3 mb-6 bg-muted/40 p-3 rounded-lg">
                       <div className="flex justify-between text-sm items-center">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-4 w-4" /> Players</span>
                          <span className="font-bold text-blue-500">{features.maxPlayers === -1 ? 'Unlimited' : features.maxPlayers}</span>
                       </div>
                       <div className="flex justify-between text-sm items-center">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Crown className="h-4 w-4" /> Lobbies</span>
                          <span className="font-bold text-green-500">{features.maxLobbies === -1 ? 'Unlimited' : features.maxLobbies}</span>
                       </div>
                     </div>
                     
                     <div className="space-y-3 mb-6 flex-1">
                        {Object.entries(features).map(([key, value]) => {
                           if (key === 'maxPlayers' || key === 'maxLobbies' || key === 'supportLevel' || key === 'withdrawalProcessing') return null;
                           if (!value) return null; // Don't show inactive features
                           
                           return (
                             <div key={key} className="flex items-start gap-2 text-sm">
                               <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                               <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                             </div>
                           );
                        })}
                        <div className="flex items-start gap-2 text-sm">
                           <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                           <span className="text-muted-foreground capitalize">{features.supportLevel} Support</span>
                        </div>
                        {features.withdrawalProcessing && (
                           <div className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-muted-foreground capitalize">{features.withdrawalProcessing} Withdrawal</span>
                           </div>
                        )}
                     </div>

                     {!isCurrent && (
                        <div className="mt-auto pt-4">
                            {subscription.plan === 'ENTERPRISE' || (subscription.plan === 'PRO' && planKey === 'FREE') ? (
                              // Downgrade or lower tier
                              <Button disabled variant="outline" className="w-full">
                                Included in Your Plan
                              </Button>
                            ) : (
                              <Button 
                                className="w-full" 
                                variant={planKey === 'PRO' ? 'default' : 'outline'}
                                onClick={() => handleUpgradePlan(planKey)}
                              >
                                Upgrade to {title}
                              </Button>
                            )}
                        </div>
                     )}
                     {isCurrent && (
                        <div className="mt-auto pt-4">
                          <Button disabled variant="secondary" className="w-full opacity-75">
                            Your Active Plan
                          </Button>
                        </div>
                     )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
