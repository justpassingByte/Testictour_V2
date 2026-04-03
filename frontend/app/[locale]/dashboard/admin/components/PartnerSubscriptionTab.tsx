"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Crown, Settings, Users, DollarSign, CheckCircle, XCircle } from "lucide-react"

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
  partner: {
    id: string
    username: string
    email: string
    createdAt: string
  }
}

interface SubscriptionModalProps {
  open: boolean
  onClose: () => void
  subscription?: PartnerSubscription | null
}

const PLAN_FEATURES = {
  FREE: {
    playerManagement: true,
    basicAnalytics: true,
    revenueTracking: true,
    csvExport: true,
    maxPlayers: 50,
    maxLobbies: 5,
    supportLevel: 'basic'
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
    withdrawalProcessing: 'fast'
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
    withdrawalProcessing: 'priority'
  }
}

export default function PartnerSubscriptionTab() {
  const [subscriptions, setSubscriptions] = useState<PartnerSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSubscription, setEditingSubscription] = useState<PartnerSubscription | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions')
      const data = await response.json()
      setSubscriptions(data.data)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSubscription = async (subscriptionData: any) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionData.partnerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      })

      if (response.ok) {
        alert('Subscription updated successfully')
        setModalOpen(false)
        fetchSubscriptions()
      } else {
        alert('Failed to update subscription')
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      alert('Error updating subscription')
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
        return 'text-yellow-600 bg-yellow-50'
      case 'ENTERPRISE':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Partner Subscriptions</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Configure New Subscription
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading subscriptions...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Partner Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPlanIcon(subscription.plan)}
                        <div>
                          <div className="font-medium">{subscription.partner.username}</div>
                          <div className="text-sm text-muted-foreground">{subscription.partner.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center space-x-2 px-2 py-1 rounded ${getPlanColor(subscription.plan)}`}>
                        {getPlanIcon(subscription.plan)}
                        <span className="font-medium">{subscription.plan}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(subscription.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {Object.entries(subscription.features).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            {value ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {subscription.monthlyPrice && (
                          <div>${subscription.monthlyPrice}/month</div>
                        )}
                        {subscription.annualPrice && (
                          <div>${subscription.annualPrice}/year</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingSubscription(subscription)
                            setModalOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this subscription?')) {
                              try {
                                const response = await fetch(`/api/admin/subscriptions/${subscription.partnerId}`, {
                                  method: 'DELETE'
                                })
                                if (response.ok) {
                                  alert('Subscription deleted successfully')
                                  fetchSubscriptions()
                                } else {
                                  alert('Failed to delete subscription')
                                }
                              } catch (error) {
                                console.error('Error deleting subscription:', error)
                                alert('Error deleting subscription')
                              }
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Configuration Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? 'Edit Subscription' : 'Configure New Subscription'}
            </DialogTitle>
          </DialogHeader>
          <SubscriptionModal 
            open={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setEditingSubscription(null)
            }}
            subscription={editingSubscription}
            onSave={handleUpdateSubscription}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SubscriptionModal({ open, onClose, subscription, onSave }: SubscriptionModalProps) {
  const [formData, setFormData] = useState({
    partnerId: subscription?.partnerId || '',
    plan: subscription?.plan || 'FREE',
    features: subscription?.features || {},
    status: subscription?.status || 'ACTIVE'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: enabled
      }
    }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        {subscription && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="partnerId">Partner</Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {subscription.partner.username} ({subscription.partner.email})
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="plan">Subscription Plan</Label>
          <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Free - Basic Features</span>
                </div>
              </SelectItem>
              <SelectItem value="PRO">
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Pro - Advanced Features</span>
                </div>
              </SelectItem>
              <SelectItem value="ENTERPRISE">
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-purple-500" />
                  <span>Enterprise - Full Access</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-4">
          <Label>Features</Label>
          <div className="mt-2 space-y-3">
            {Object.entries(PLAN_FEATURES[formData.plan as keyof typeof PLAN_FEATURES]).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.features[key] || false}
                    onCheckedChange={(checked) => handleFeatureToggle(key, checked)}
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {typeof value === 'boolean' ? (
                    value ? 'Enabled' : 'Disabled'
                  ) : (
                    typeof value === 'number' && value === -1 ? 'Unlimited' : value.toString()
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {subscription ? 'Update Subscription' : 'Create Subscription'}
          </Button>
        </DialogFooter>
      </div>
    </form>
  )
}
