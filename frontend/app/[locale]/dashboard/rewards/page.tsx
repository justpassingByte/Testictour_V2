"use client"

import { useState } from "react"
import { Star, Gift, Trophy, Coins, Crown, Zap, ShoppingCart, Clock, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"

// Mock user loyalty data
const loyaltyData = {
  currentPoints: 3847,
  currentTier: "Gold",
  nextTier: "Platinum",
  pointsToNextTier: 1153,
  totalPointsEarned: 12450,
  lifetimeSpent: 8603,
  memberSince: "2024-01-15",
  streakDays: 12,
}

// Loyalty tiers
const tiers = [
  {
    name: "Bronze",
    minPoints: 0,
    maxPoints: 999,
    color: "bg-amber-700/20 text-amber-700",
    benefits: ["5% bonus coins on purchases", "Access to bronze-tier lobbies"],
    icon: "🥉",
  },
  {
    name: "Silver",
    minPoints: 1000,
    maxPoints: 2499,
    color: "bg-gray-400/20 text-gray-400",
    benefits: ["10% bonus coins on purchases", "Access to silver-tier lobbies", "Priority customer support"],
    icon: "🥈",
  },
  {
    name: "Gold",
    minPoints: 2500,
    maxPoints: 4999,
    color: "bg-yellow-500/20 text-yellow-500",
    benefits: [
      "15% bonus coins on purchases",
      "Access to gold-tier lobbies",
      "Monthly bonus rewards",
      "Early access to new features",
    ],
    icon: "🥇",
  },
  {
    name: "Platinum",
    minPoints: 5000,
    maxPoints: 9999,
    color: "bg-blue-500/20 text-blue-500",
    benefits: [
      "20% bonus coins on purchases",
      "Access to platinum-tier lobbies",
      "Weekly bonus rewards",
      "Exclusive tournaments",
      "Personal account manager",
    ],
    icon: "💎",
  },
  {
    name: "Diamond",
    minPoints: 10000,
    maxPoints: 19999,
    color: "bg-purple-500/20 text-purple-500",
    benefits: [
      "25% bonus coins on purchases",
      "Access to diamond-tier lobbies",
      "Daily bonus rewards",
      "VIP tournaments",
      "Custom lobby creation",
    ],
    icon: "💠",
  },
  {
    name: "Elite",
    minPoints: 20000,
    maxPoints: Number.POSITIVE_INFINITY,
    color: "bg-red-500/20 text-red-500",
    benefits: [
      "30% bonus coins on purchases",
      "Access to all lobbies",
      "Hourly bonus rewards",
      "Elite-only events",
      "Revenue sharing opportunities",
    ],
    icon: "👑",
  },
]

// Mock rewards store
const rewards = [
  {
    id: 1,
    name: "500 Bonus Coins",
    description: "Get 500 extra coins added to your account",
    cost: 1000,
    type: "coins",
    icon: <Coins className="h-8 w-8 text-primary" />,
    available: true,
    popular: true,
  },
  {
    id: 2,
    name: "Premium Lobby Access",
    description: "7-day access to premium lobbies",
    cost: 2500,
    type: "access",
    icon: <Crown className="h-8 w-8 text-yellow-500" />,
    available: true,
    popular: false,
  },
  {
    id: 3,
    name: "Custom Avatar Frame",
    description: "Exclusive animated avatar frame",
    cost: 1500,
    type: "cosmetic",
    icon: <Star className="h-8 w-8 text-purple-500" />,
    available: true,
    popular: false,
  },
  {
    id: 4,
    name: "Tournament Entry Ticket",
    description: "Free entry to next premium tournament",
    cost: 3000,
    type: "tournament",
    icon: <Trophy className="h-8 w-8 text-primary" />,
    available: true,
    popular: true,
  },
  {
    id: 5,
    name: "Double XP Boost",
    description: "2x loyalty points for 24 hours",
    cost: 800,
    type: "boost",
    icon: <Zap className="h-8 w-8 text-green-500" />,
    available: true,
    popular: false,
  },
  {
    id: 6,
    name: "Exclusive Title",
    description: '"Loyalty Legend" title for your profile',
    cost: 5000,
    type: "cosmetic",
    icon: <Badge className="h-8 w-8 text-red-500" />,
    available: false,
    popular: false,
  },
]

// Mock recent activities
const recentActivities = [
  {
    id: 1,
    type: "earned",
    description: "Completed daily challenge",
    points: 50,
    date: "2025-06-16",
    time: "14:30",
  },
  {
    id: 2,
    type: "earned",
    description: "Won lobby match",
    points: 100,
    date: "2025-06-16",
    time: "13:45",
  },
  {
    id: 3,
    type: "redeemed",
    description: "Redeemed 500 Bonus Coins",
    points: -1000,
    date: "2025-06-15",
    time: "16:20",
  },
  {
    id: 4,
    type: "earned",
    description: "Login streak bonus",
    points: 25,
    date: "2025-06-15",
    time: "09:15",
  },
]

export default function LoyaltyPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const currentTierData = tiers.find((tier) => tier.name === loyaltyData.currentTier)
  const nextTierData = tiers.find((tier) => tier.name === loyaltyData.nextTier)

  const filteredRewards =
    selectedCategory === "all" ? rewards : rewards.filter((reward) => reward.type === selectedCategory)

  const progressPercentage = nextTierData
    ? ((loyaltyData.currentPoints - (currentTierData?.minPoints || 0)) /
        (nextTierData.minPoints - (currentTierData?.minPoints || 0))) *
      100
    : 100

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Loyalty Program</h1>
          <p className="text-muted-foreground">
            Earn points, unlock rewards, and enjoy exclusive benefits as you play.
          </p>
        </div>
        <SyncStatus status="live" />
      </div>

      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-2xl font-bold">{loyaltyData.currentPoints.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Loyalty Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{loyaltyData.currentTier}</p>
                <p className="text-xs text-muted-foreground">Current Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{loyaltyData.streakDays}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{loyaltyData.totalPointsEarned.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="mr-2 h-5 w-5 text-primary" />
            Tier Progress
          </CardTitle>
          <CardDescription>
            {loyaltyData.pointsToNextTier.toLocaleString()} points needed to reach {loyaltyData.nextTier} tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{loyaltyData.currentTier}</span>
              <span>{loyaltyData.nextTier}</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{loyaltyData.currentPoints.toLocaleString()} points</span>
              <span>{nextTierData?.minPoints.toLocaleString()} points</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Current Benefits ({loyaltyData.currentTier})</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {currentTierData?.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center">
                    <Star className="h-3 w-3 text-primary mr-2" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            {nextTierData && (
              <div>
                <h4 className="font-medium mb-2">Next Tier Benefits ({loyaltyData.nextTier})</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {nextTierData.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-500 mr-2" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rewards">Rewards Store</TabsTrigger>
          <TabsTrigger value="tiers">All Tiers</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Rewards Store</h2>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Button>
              <Button
                variant={selectedCategory === "coins" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("coins")}
              >
                Coins
              </Button>
              <Button
                variant={selectedCategory === "cosmetic" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("cosmetic")}
              >
                Cosmetics
              </Button>
              <Button
                variant={selectedCategory === "access" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("access")}
              >
                Access
              </Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRewards.map((reward) => (
              <Card key={reward.id} className={`relative ${!reward.available ? "opacity-50" : ""}`}>
                {reward.popular && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                    Popular
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4 mb-4">
                    {reward.icon}
                    <div className="flex-1">
                      <h3 className="font-bold">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cost:</span>
                      <span className="font-bold text-primary">
                        <Star className="inline h-4 w-4 mr-1" />
                        {reward.cost.toLocaleString()}
                      </span>
                    </div>

                    <Button className="w-full" disabled={!reward.available || loyaltyData.currentPoints < reward.cost}>
                      {!reward.available ? (
                        "Coming Soon"
                      ) : loyaltyData.currentPoints < reward.cost ? (
                        "Insufficient Points"
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Redeem
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <h2 className="text-2xl font-bold">Loyalty Tiers</h2>
          <div className="grid gap-4">
            {tiers.map((tier, index) => (
              <Card
                key={tier.name}
                className={`${tier.name === loyaltyData.currentTier ? "border-primary bg-primary/5" : ""}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{tier.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tier.minPoints.toLocaleString()} -{" "}
                          {tier.maxPoints === Number.POSITIVE_INFINITY ? "∞" : tier.maxPoints.toLocaleString()} points
                        </p>
                      </div>
                    </div>
                    {tier.name === loyaltyData.currentTier && (
                      <Badge className="bg-primary/20 text-primary">Current</Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Benefits:</h4>
                    <ul className="space-y-1">
                      {tier.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex items-center text-sm">
                          <Star className="h-3 w-3 text-primary mr-2" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-2xl font-bold">Recent Activity</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${activity.type === "earned" ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {activity.date} at {activity.time}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${activity.points > 0 ? "text-green-500" : "text-red-500"}`}>
                      {activity.points > 0 ? "+" : ""}
                      {activity.points.toLocaleString()}
                      <Star className="inline h-4 w-4 ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
