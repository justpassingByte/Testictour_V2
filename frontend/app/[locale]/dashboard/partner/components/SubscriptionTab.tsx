"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    fetchSubscription()
  }, [partnerId])

  const fetchSubscription = async () => {
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
  }

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

    const merged = JSON.parse(JSON.stringify(PLAN_FEATURES)); // clone

    availablePlans.forEach(plan => {
      const planKey = plan.plan as keyof typeof merged;
      if (merged[planKey]) {
        merged[planKey] = {
          ...merged[planKey],
          ...(typeof plan.features === 'object' && plan.features ? plan.features : {}),
          maxLobbies: plan.maxLobbies,
          maxPlayers: plan.maxPlayersPerLobby
        };
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
              You don't have an active subscription. Contact your administrator to get access to premium features.
            </p>
            <Button onClick={() => alert('Contact support to activate your subscription')}>
              Request Access
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="mr-2 h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-6 rounded-lg border-2 ${getPlanColor(subscription.plan)}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getPlanIcon(subscription.plan)}
                    <div>
                      <h3 className="text-2xl font-bold">{subscription.plan}</h3>
                      <p className="text-sm text-muted-foreground">
                        {subscription.plan === 'FREE' ? 'Basic Plan' :
                          subscription.plan === 'PRO' ? 'Professional Plan' :
                            'Enterprise Plan'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(subscription.status)}
                  </div>
                </div>

                {subscription.monthlyPrice && (
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold">${subscription.monthlyPrice}</div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground mb-4">
                  Active since {new Date(subscription.startDate).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(ACTIVE_PLAN_FEATURES.FREE).map(([key, freeValue]) => {
                  const proFeatures = ACTIVE_PLAN_FEATURES.PRO;
                  const enterpriseFeatures = ACTIVE_PLAN_FEATURES.ENTERPRISE;
                  const currentPlanFeatures = ACTIVE_PLAN_FEATURES[subscription.plan as keyof typeof ACTIVE_PLAN_FEATURES] || ACTIVE_PLAN_FEATURES.FREE;
                  const currentValue = currentPlanFeatures[key as keyof typeof ACTIVE_PLAN_FEATURES.FREE];
                  const proValue = proFeatures[key as keyof typeof ACTIVE_PLAN_FEATURES.PRO];
                  const enterpriseValue = enterpriseFeatures[key as keyof typeof ACTIVE_PLAN_FEATURES.ENTERPRISE];

                  return (
                    <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-center">
                        {/* Free Plan */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          <div className="text-xs font-medium text-gray-600 mb-1">Free</div>
                          {freeValue ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {typeof freeValue === 'number' && freeValue !== -1 ? freeValue :
                              typeof freeValue === 'boolean' ? '' : freeValue}
                          </div>
                        </div>

                        {/* Pro Plan */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          <div className="text-xs font-medium text-yellow-600 mb-1">Pro</div>
                          {proValue ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {typeof proValue === 'number' && proValue !== -1 ? proValue :
                              typeof proValue === 'boolean' ? '' : proValue}
                          </div>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          <div className="text-xs font-medium text-purple-600 mb-1">Enterprise</div>
                          {enterpriseValue ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {typeof enterpriseValue === 'number' && enterpriseValue === -1 ? '∞' :
                              typeof enterpriseValue === 'boolean' ? '' : enterpriseValue}
                          </div>
                        </div>

                        {/* Current Plan Indicator */}
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div className="text-xs font-medium text-blue-600 mb-1">You</div>
                          <div className="text-xs font-medium">
                            {typeof currentValue === 'boolean' ? (
                              currentValue ? '✓' : '✗'
                            ) : (
                              typeof currentValue === 'number' && currentValue === -1 ? '∞' : currentValue
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Additional Pro/Enterprise Features */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-3 text-yellow-600">Pro Plan Additional Features:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Advanced Analytics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Custom Branding</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>API Access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Priority Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-3 w-3 text-blue-500" />
                    <span>Payment Gateway</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowUpCircle className="h-3 w-3 text-green-500" />
                    <span>Automatic Withdrawals</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowDownCircle className="h-3 w-3 text-blue-500" />
                    <span>Player Deposits</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-3 w-3 text-purple-500" />
                    <span>Withdrawal Management</span>
                  </div>
                </div>

                <div className="text-sm font-medium mb-3 mt-4 text-purple-600">Enterprise Plan Additional Features:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>White Label Solution</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Custom Integrations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Dedicated Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Unlimited Resources</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-3 w-3 text-blue-500" />
                    <span>Payment Gateway</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowUpCircle className="h-3 w-3 text-green-500" />
                    <span>Automatic Withdrawals</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowDownCircle className="h-3 w-3 text-blue-500" />
                    <span>Player Deposits</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-3 w-3 text-purple-500" />
                    <span>Withdrawal Management</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-3 w-3 text-orange-500" />
                    <span>Custom Payment Gateway</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Plan Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 border rounded-lg bg-muted/20">
                  <div className="text-xl font-bold text-blue-600">
                    {subscription.features.maxPlayers === -1 ? '∞' : subscription.features.maxPlayers || ACTIVE_PLAN_FEATURES.FREE.maxPlayers}
                  </div>
                  <div className="text-xs text-muted-foreground">Players</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-muted/20">
                  <div className="text-xl font-bold text-green-600">
                    {subscription.features.maxLobbies === -1 ? '∞' : subscription.features.maxLobbies || ACTIVE_PLAN_FEATURES.FREE.maxLobbies}
                  </div>
                  <div className="text-xs text-muted-foreground">Lobbies</div>
                </div>
              </div>

              {/* Plan Summary */}
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm font-medium mb-2">What's included in your plan:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ACTIVE_PLAN_FEATURES.FREE).map(([key, value]) => {
                    const currentPlanFeatures = ACTIVE_PLAN_FEATURES[subscription.plan as keyof typeof ACTIVE_PLAN_FEATURES] || ACTIVE_PLAN_FEATURES.FREE;
                    const currentValue = currentPlanFeatures[key as keyof typeof ACTIVE_PLAN_FEATURES.FREE];
                    const isIncluded = currentValue !== false && currentValue !== 0;

                    return (
                      <div key={key} className="flex items-center space-x-1 text-xs">
                        {isIncluded ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className={isIncluded ? 'text-green-700' : 'text-gray-500'}>
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Options */}
          {subscription.plan !== 'ENTERPRISE' && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrade Your Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {subscription.plan === 'FREE' && (
                    <div className="p-4 border rounded-lg text-center">
                      <Crown className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
                      <h3 className="text-lg font-medium mb-2">Upgrade to Pro</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get advanced analytics, custom branding, API access, and more
                      </p>
                      <div className="text-2xl font-bold mb-2">$29.99<span className="text-lg font-normal">/month</span></div>
                      <Button
                        onClick={() => handleUpgradePlan('PRO')}
                        className="w-full"
                      >
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}

                  {subscription.plan === 'PRO' && (
                    <div className="p-4 border rounded-lg text-center">
                      <Crown className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                      <h3 className="text-lg font-medium mb-2">Upgrade to Enterprise</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get white-label solution, custom integrations, dedicated support, and unlimited resources
                      </p>
                      <div className="text-2xl font-bold mb-2">$99.99<span className="text-lg font-normal">/month</span></div>
                      <Button
                        onClick={() => handleUpgradePlan('ENTERPRISE')}
                        className="w-full"
                      >
                        Upgrade to Enterprise
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
