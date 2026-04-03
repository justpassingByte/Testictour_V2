"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Crown, CheckCircle2 } from "lucide-react"
import api from "@/app/lib/apiConfig"

interface SubscriptionData {
    id?: string
    plan: string
    status: string
    monthlyPrice?: number
    annualPrice?: number
    autoRenew: boolean
    createdAt?: string
}

interface AdminPartnerSubscriptionTabProps {
    partnerId: string
    partnerName: string
    currentSubscription?: SubscriptionData | null
    onUpdate: () => void
}

export default function AdminPartnerSubscriptionTab({
    partnerId,
    partnerName,
    currentSubscription,
    onUpdate
}: AdminPartnerSubscriptionTabProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string>(currentSubscription?.plan || 'FREE')

    const handleUpdatePlan = async () => {
        try {
            setLoading(true)

            const priceMap: Record<string, number> = {
                'FREE': 0,
                'PRO': 29.99,
                'ENTERPRISE': 99.99
            }

            await api.put(`/admin/subscriptions/${partnerId}`, {
                plan: selectedPlan,
                status: 'ACTIVE',
                monthlyPrice: priceMap[selectedPlan],
            })

            toast({
                title: "Subscription Updated",
                description: `Successfully updated ${partnerName}'s plan to ${selectedPlan}.`,
            })

            onUpdate()
        } catch (error) {
            console.error("Failed to update subscription:", error)
            toast({
                title: "Error",
                description: "Failed to update the partner subscription.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteSub = async () => {
        if (!confirm(`Are you sure you want to completely remove ${partnerName}'s subscription record? They will default to FREE.`)) {
            return
        }

        try {
            setLoading(true)
            await api.delete(`/admin/subscriptions/${partnerId}`)
            toast({
                title: "Subscription Removed",
                description: "The subscription record was deleted successfully.",
            })
            onUpdate()
        } catch (error) {
            console.error("Failed to delete subscription:", error)
            toast({
                title: "Error",
                description: "Failed to delete the subscription.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const planColors: Record<string, string> = {
        'FREE': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        'PRO': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        'ENTERPRISE': 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    }

    const currentPlan = currentSubscription?.plan || 'FREE'

    return (
        <div className="space-y-6">
            <Card className="max-w-2xl border-white/10 bg-card/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-500" />
                        Manage Partner Subscription
                    </CardTitle>
                    <CardDescription>
                        View or modify the subscription plan for {partnerName}. Upgrading a plan will automatically apply their new platform limits.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                            <div className="flex items-center gap-2">
                                <Badge className={planColors[currentPlan]} variant="outline">
                                    {currentPlan}
                                </Badge>
                                {currentSubscription?.status === 'ACTIVE' && (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="outline">
                                        Active
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {currentSubscription?.monthlyPrice !== undefined && (
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground mb-1">Monthly Revenue</p>
                                <p className="font-semibold text-emerald-400">
                                    ${currentSubscription.monthlyPrice}/mo
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <label className="text-sm font-medium">Change Subscription Plan</label>
                        <div className="flex items-center gap-4">
                            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FREE">FREE</SelectItem>
                                    <SelectItem value="PRO">PRO</SelectItem>
                                    <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                onClick={handleUpdatePlan}
                                disabled={loading || selectedPlan === currentPlan}
                                className="w-32"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Change"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-black/10 border-t border-white/5 flex justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Changes take effect immediately across the platform.
                    </p>
                    {currentSubscription && currentPlan !== 'FREE' && (
                        <Button variant="ghost" size="sm" onClick={handleDeleteSub} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            Reset to Free
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
