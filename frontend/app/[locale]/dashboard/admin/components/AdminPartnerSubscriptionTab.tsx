"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Loader2, Crown, CheckCircle2, Wallet, Activity } from "lucide-react"
import api from "@/app/lib/apiConfig"

interface SubscriptionData {
    id?: string
    plan: string
    status: string
    monthlyPrice?: number
    annualPrice?: number
    autoRenew: boolean
    createdAt?: string
    limits?: {
        maxLobbies: number;
        maxTournamentsPerMonth: number;
        maxPlayersPerLobby: number;
        usage: {
            activeLobbies: number;
            tournamentsThisMonth: number;
        }
    }
}

interface AdminPartnerSubscriptionTabProps {
    partnerId: string
    partnerName: string
    currentSubscription?: SubscriptionData | null
    partnerBalance?: number
    onUpdate: () => void
}

export default function AdminPartnerSubscriptionTab({
    partnerId,
    partnerName,
    currentSubscription,
    partnerBalance = 0,
    onUpdate
}: AdminPartnerSubscriptionTabProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [depositLoading, setDepositLoading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string>(currentSubscription?.plan || 'FREE')
    const [depositAmount, setDepositAmount] = useState<string>('')

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

    const handleDeposit = async () => {
        const amount = parseFloat(depositAmount)
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" })
            return
        }

        try {
            setDepositLoading(true)
            await api.post(`/admin/users/${partnerId}/deposit`, { amount })
            toast({
                title: "Balance Updated",
                description: `Successfully added $${amount} to ${partnerName}'s balance.`,
            })
            setDepositAmount('')
            onUpdate()
        } catch (error) {
            console.error("Failed to deposit:", error)
            toast({
                title: "Error",
                description: "Failed to update balance.",
                variant: "destructive",
            })
        } finally {
            setDepositLoading(false)
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
                    {currentSubscription?.limits && (
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-400" />
                                Current Plan Usage
                            </label>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 p-3 rounded-lg bg-black/20 border border-white/5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Active Lobbies</span>
                                        <span className="font-medium">
                                            {currentSubscription.limits.usage.activeLobbies} / 
                                            {currentSubscription.limits.maxLobbies === -1 ? '∞' : currentSubscription.limits.maxLobbies}
                                        </span>
                                    </div>
                                    <Progress 
                                        value={currentSubscription.limits.maxLobbies === -1 ? 0 : 
                                            (currentSubscription.limits.usage.activeLobbies / currentSubscription.limits.maxLobbies) * 100} 
                                        className="h-2" 
                                    />
                                </div>

                                <div className="space-y-2 p-3 rounded-lg bg-black/20 border border-white/5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Tournaments (This Month)</span>
                                        <span className="font-medium">
                                            {currentSubscription.limits.usage.tournamentsThisMonth} / 
                                            {currentSubscription.limits.maxTournamentsPerMonth === -1 ? '∞' : currentSubscription.limits.maxTournamentsPerMonth}
                                        </span>
                                    </div>
                                    <Progress 
                                        value={currentSubscription.limits.maxTournamentsPerMonth === -1 ? 0 : 
                                            (currentSubscription.limits.usage.tournamentsThisMonth / currentSubscription.limits.maxTournamentsPerMonth) * 100} 
                                        className="h-2" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-blue-400" />
                                Balance Management
                            </label>
                            <div className="text-sm text-muted-foreground">
                                Current Balance: <span className="font-semibold text-blue-400">${partnerBalance.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Input
                                type="number"
                                placeholder="Amount to deposit"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                min="0"
                                step="10"
                                className="w-[200px]"
                            />
                            <Button
                                onClick={handleDeposit}
                                disabled={depositLoading || !depositAmount}
                                variant="secondary"
                                className="w-32"
                            >
                                {depositLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Top Up"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Partners need sufficient balance to upgrade to paid subscription plans.
                        </p>
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
