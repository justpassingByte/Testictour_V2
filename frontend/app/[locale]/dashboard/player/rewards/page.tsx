"use client"

import { useEffect, useMemo, useState } from "react"
import { Gift, Coins, Loader2, ShoppingCart, CheckCircle2, Search } from "lucide-react"

import api from "@/app/lib/apiConfig"
import { useUserStore } from "@/app/stores/userStore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

interface Reward {
  id: string
  title: string
  description?: string
  type: string
  value: number
  currency: string
  imageUrl?: string
  maxRedemptions?: number | null
  currentRedemptions: number
  validUntil?: string | null
  partner?: { id: string; username: string }
}

interface Redemption {
  id: string
  rewardId: string
  redeemedAt: string
  reward: Reward
}

function isFlexCoin(currency: string) {
  return ["coins", "coin", "fcoin", "flex_coin", "flexcoin"].includes(currency.toLowerCase())
}

export default function PlayerRewardsPage() {
  const { currentUser, fetchUser } = useUserStore()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  const redeemedIds = useMemo(() => new Set(redemptions.map(r => r.rewardId)), [redemptions])
  const flexCoins = currentUser?.balance?.coins || 0

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catalogRes, redemptionRes] = await Promise.all([
        api.get("/partner/rewards/catalog"),
        currentUser ? api.get("/partner/rewards/redemptions/me") : Promise.resolve({ data: { data: [] } }),
      ])
      setRewards(catalogRes.data?.data || [])
      setRedemptions(redemptionRes.data?.data || [])
    } catch (error: any) {
      toast({ title: "Could not load rewards", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const redeem = async (reward: Reward) => {
    setRedeemingId(reward.id)
    try {
      await api.post(`/partner/rewards/${reward.id}/redeem`)
      toast({ title: "Reward redeemed", description: `${reward.title} has been added to your redemption history.` })
      await fetchUser()
      await fetchData()
    } catch (error: any) {
      toast({ title: "Redeem failed", description: error.message, variant: "destructive" })
    } finally {
      setRedeemingId(null)
    }
  }

  const filtered = rewards.filter(reward =>
    reward.title.toLowerCase().includes(query.toLowerCase()) ||
    (reward.description || "").toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flex coin Rewards</h1>
          <p className="text-sm text-muted-foreground">Redeem partner rewards using your Flex coin balance.</p>
        </div>
        <Badge variant="outline" className="w-fit bg-amber-500/10 text-amber-500 border-amber-500/30 px-3 py-1.5">
          <Coins className="mr-1.5 h-4 w-4" />
          {flexCoins.toLocaleString()} Flex coin
        </Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search rewards..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
          Loading rewards...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gift className="mx-auto mb-3 h-10 w-10 opacity-50" />
            No redeemable rewards found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((reward) => {
            const redeemed = redeemedIds.has(reward.id)
            const soldOut = reward.maxRedemptions !== null && reward.maxRedemptions !== undefined && reward.currentRedemptions >= reward.maxRedemptions
            const canRedeem = !!currentUser && isFlexCoin(reward.currency) && flexCoins >= reward.value && !redeemed && !soldOut

            return (
              <Card key={reward.id} className="overflow-hidden">
                {reward.imageUrl && (
                  <div className="h-32 bg-muted">
                    <img src={reward.imageUrl} alt={reward.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{reward.title}</CardTitle>
                    {redeemed && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{reward.type}</Badge>
                    {reward.partner?.username && <Badge variant="outline">{reward.partner.username}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reward.description && <p className="text-sm text-muted-foreground">{reward.description}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-bold text-amber-500">
                      <Coins className="mr-1 inline h-4 w-4" />
                      {reward.value.toLocaleString()} Flex coin
                    </span>
                  </div>
                  <Button className="w-full" disabled={!canRedeem || redeemingId === reward.id} onClick={() => redeem(reward)}>
                    {redeemingId === reward.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : redeemed ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    {!currentUser ? "Sign in to redeem" : redeemed ? "Redeemed" : soldOut ? "Sold out" : flexCoins < reward.value ? "Not enough Flex coin" : "Redeem"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
