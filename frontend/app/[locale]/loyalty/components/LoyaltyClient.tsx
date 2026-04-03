"use client"

import { useState } from "react"
import {
  Trophy, Star, Coins, Target, Flame, Zap, Crown, Medal, Gift,
  CheckCircle2, Clock, Lock, Sword, Users, Gamepad2, ChevronRight,
  Sparkles, Shield, Award, TrendingUp
} from "lucide-react"
import { useTranslations } from 'next-intl'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

// ─── Loyalty Tier System ───
const loyaltyTiers = [
  { name: "Bronze", minCoins: 0, icon: Shield, color: "from-amber-700 to-amber-900", textColor: "text-amber-700", bgAccent: "bg-amber-700/10" },
  { name: "Silver", minCoins: 500, icon: Medal, color: "from-gray-400 to-slate-600", textColor: "text-gray-400", bgAccent: "bg-gray-400/10" },
  { name: "Gold", minCoins: 2000, icon: Crown, color: "from-yellow-400 to-amber-600", textColor: "text-yellow-500", bgAccent: "bg-yellow-500/10" },
  { name: "Diamond", minCoins: 5000, icon: Sparkles, color: "from-cyan-400 to-blue-600", textColor: "text-cyan-400", bgAccent: "bg-cyan-400/10" },
  { name: "Champion", minCoins: 10000, icon: Trophy, color: "from-violet-500 to-purple-700", textColor: "text-violet-500", bgAccent: "bg-violet-500/10" },
]

// ─── Mock Quest Data ───
const dailyQuests = [
  { id: "d1", title: "First Match", description: "Play 1 MiniTour game today", reward: 50, icon: Gamepad2, progress: 1, target: 1, completed: true },
  { id: "d2", title: "Top 4 Finish", description: "Finish in top 4 in any game", reward: 75, icon: Target, progress: 0, target: 1, completed: false },
  { id: "d3", title: "Social Player", description: "Play in a lobby with 6+ players", reward: 30, icon: Users, progress: 0, target: 1, completed: false },
]

const weeklyQuests = [
  { id: "w1", title: "Tournament Warrior", description: "Participate in 2 tournaments this week", reward: 300, icon: Sword, progress: 1, target: 2, completed: false },
  { id: "w2", title: "Winning Streak", description: "Win 3 MiniTour games this week", reward: 500, icon: Flame, progress: 2, target: 3, completed: false },
  { id: "w3", title: "Consistent Player", description: "Play 5 games this week", reward: 200, icon: TrendingUp, progress: 3, target: 5, completed: false },
  { id: "w4", title: "Point Collector", description: "Earn 500 total points across all games", reward: 400, icon: Star, progress: 320, target: 500, completed: false },
]

const achievements = [
  { id: "a1", title: "First Blood", description: "Win your first tournament", icon: Sword, reward: 200, unlocked: true, progress: 1, target: 1, rarity: "Common" },
  { id: "a2", title: "Top 4 Machine", description: "Get top 4 in 10 games", icon: Target, reward: 500, unlocked: true, progress: 10, target: 10, rarity: "Common" },
  { id: "a3", title: "MiniTour Master", description: "Play 25 MiniTour lobbies", icon: Gamepad2, reward: 750, unlocked: false, progress: 12, target: 25, rarity: "Rare" },
  { id: "a4", title: "Social Butterfly", description: "Refer 3 friends who join the platform", icon: Users, reward: 1000, unlocked: false, progress: 1, target: 3, rarity: "Rare" },
  { id: "a5", title: "Diamond Grinder", description: "Earn 5,000 coins total", icon: Coins, reward: 1500, unlocked: false, progress: 1850, target: 5000, rarity: "Epic" },
  { id: "a6", title: "Untouchable", description: "Win 5 tournaments with 1st place", icon: Crown, reward: 2000, unlocked: false, progress: 2, target: 5, rarity: "Epic" },
  { id: "a7", title: "Legend", description: "Reach Champion loyalty tier", icon: Trophy, reward: 5000, unlocked: false, progress: 0, target: 1, rarity: "Legendary" },
  { id: "a8", title: "Iron Will", description: "Complete 50 daily quests", icon: Shield, reward: 800, unlocked: false, progress: 18, target: 50, rarity: "Rare" },
]

const recentRewards = [
  { id: "r1", type: "quest", title: "First Match — Daily Quest", coins: 50, date: "Today" },
  { id: "r2", type: "achievement", title: "Top 4 Machine — Achievement", coins: 500, date: "Yesterday" },
  { id: "r3", type: "quest", title: "Consistent Player — Weekly Quest", coins: 200, date: "2 days ago" },
  { id: "r4", type: "achievement", title: "First Blood — Achievement", coins: 200, date: "3 days ago" },
  { id: "r5", type: "quest", title: "Social Player — Daily Quest", coins: 30, date: "4 days ago" },
]

// ─── Player Mock State ───
const playerCoins = 1850
const playerTier = loyaltyTiers[1] // Silver

function getRarityColor(rarity: string) {
  switch (rarity) {
    case "Common": return "text-gray-400 border-gray-400/30 bg-gray-400/5"
    case "Rare": return "text-blue-400 border-blue-400/30 bg-blue-400/5"
    case "Epic": return "text-violet-400 border-violet-400/30 bg-violet-400/5"
    case "Legendary": return "text-amber-400 border-amber-400/30 bg-amber-400/5"
    default: return ""
  }
}

export default function LoyaltyClient() {
  const t = useTranslations('common')
  const [activeTab, setActiveTab] = useState("quests")

  const nextTier = loyaltyTiers.find(tier => tier.minCoins > playerCoins) || loyaltyTiers[loyaltyTiers.length - 1]
  const prevTierCoins = playerTier.minCoins
  const tierProgress = ((playerCoins - prevTierCoins) / (nextTier.minCoins - prevTierCoins)) * 100

  const TierIcon = playerTier.icon

  return (
    <div className="container py-10 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="gradient-text">{t('loyalty_title', { defaultValue: 'Loyalty & Quests' })}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('loyalty_description', { defaultValue: 'Complete quests, earn coins, and unlock achievements to climb the loyalty ranks.' })}
        </p>
      </div>

      {/* ─── Loyalty Tier Banner ─── */}
      <Card className="overflow-hidden relative bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20">
        {/* Decorative gradient bar */}
        <div className={`h-2 bg-gradient-to-r ${playerTier.color}`} />

        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Tier Badge */}
            <div className={`
              w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center shrink-0
              bg-gradient-to-br ${playerTier.color} shadow-lg
            `}>
              <TierIcon className="h-10 w-10 md:h-12 md:w-12 text-white" />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl md:text-3xl font-black">{playerTier.name} {t('tier', { defaultValue: 'Tier' })}</h2>
                <Badge variant="outline" className={`${playerTier.textColor} border-current font-bold`}>
                  <Coins className="h-3 w-3 mr-1" />
                  {playerCoins.toLocaleString()} {t('coins', { defaultValue: 'Coins' })}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('next_tier', { defaultValue: 'Next' })}: <span className={`font-bold ${nextTier.textColor}`}>{nextTier.name}</span>
                  </span>
                  <span className="font-medium">{playerCoins.toLocaleString()} / {nextTier.minCoins.toLocaleString()}</span>
                </div>
                <Progress value={tierProgress} className="h-3" />
              </div>

              {/* Tier milestones */}
              <div className="flex items-center gap-1 overflow-x-auto pt-1">
                {loyaltyTiers.map((tier, idx) => {
                  const TIcon = tier.icon
                  const isActive = tier.name === playerTier.name
                  const isPast = tier.minCoins <= playerCoins
                  return (
                    <div key={tier.name} className="flex items-center">
                      <div className={`
                        flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all
                        ${isActive ? `bg-gradient-to-r ${tier.color} text-white shadow-md` : ""}
                        ${isPast && !isActive ? "text-muted-foreground" : ""}
                        ${!isPast ? "text-muted-foreground/40" : ""}
                      `}>
                        <TIcon className="h-3.5 w-3.5" />
                        {tier.name}
                      </div>
                      {idx < loyaltyTiers.length - 1 && (
                        <ChevronRight className={`h-3 w-3 mx-0.5 ${isPast ? "text-muted-foreground" : "text-muted-foreground/30"}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Tab Content ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <Sword className="h-4 w-4" />
            {t('quests_tab', { defaultValue: 'Quests' })}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            {t('achievements_tab', { defaultValue: 'Achievements' })}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('reward_history_tab', { defaultValue: 'History' })}
          </TabsTrigger>
        </TabsList>

        {/* ===================== QUESTS TAB ===================== */}
        <TabsContent value="quests" className="space-y-8 mt-6">
          {/* Daily Quests */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h2 className="text-xl font-bold">{t('daily_quests', { defaultValue: 'Daily Quests' })}</h2>
              <Badge variant="outline" className="ml-2 text-xs">
                {dailyQuests.filter(q => q.completed).length}/{dailyQuests.length} {t('completed', { defaultValue: 'Completed' })}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {dailyQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
          </section>

          {/* Weekly Quests */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold">{t('weekly_quests', { defaultValue: 'Weekly Quests' })}</h2>
              <Badge variant="outline" className="ml-2 text-xs">
                {weeklyQuests.filter(q => q.completed).length}/{weeklyQuests.length} {t('completed', { defaultValue: 'Completed' })}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {weeklyQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} isWeekly />
              ))}
            </div>
          </section>
        </TabsContent>

        {/* ===================== ACHIEVEMENTS TAB ===================== */}
        <TabsContent value="achievements" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{t('achievement_gallery', { defaultValue: 'Achievement Gallery' })}</h2>
              <p className="text-sm text-muted-foreground">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} {t('unlocked', { defaultValue: 'unlocked' })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </TabsContent>

        {/* ===================== HISTORY TAB ===================== */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <h2 className="text-xl font-bold">{t('recently_earned', { defaultValue: 'Recently Earned' })}</h2>

          <Card className="bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="space-y-0">
                {recentRewards.map((reward, idx) => (
                  <div key={reward.id} className={`
                    flex items-center justify-between py-4 px-2
                    ${idx < recentRewards.length - 1 ? "border-b border-border/50" : ""}
                  `}>
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center shrink-0
                        ${reward.type === "achievement" ? "bg-violet-500/10 text-violet-500" : "bg-primary/10 text-primary"}
                      `}>
                        {reward.type === "achievement" ? <Award className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{reward.title}</div>
                        <div className="text-xs text-muted-foreground">{reward.date}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/5 font-bold">
                      <Coins className="h-3 w-3 mr-1" />
                      +{reward.coins}
                    </Badge>
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

// ─── Quest Card Component ───
function QuestCard({ quest, isWeekly = false }: { quest: any; isWeekly?: boolean }) {
  const t = useTranslations('common')
  const QuestIcon = quest.icon
  const progressPercent = Math.min((quest.progress / quest.target) * 100, 100)

  return (
    <Card className={`
      card-hover-effect bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20 overflow-hidden
      ${quest.completed ? "opacity-75" : ""}
    `}>
      {quest.completed && <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-600" />}
      {!quest.completed && isWeekly && <div className="h-1 bg-gradient-to-r from-orange-400 to-red-500" />}
      {!quest.completed && !isWeekly && <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />}

      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            ${quest.completed ? "bg-green-500/10 text-green-500" : isWeekly ? "bg-orange-500/10 text-orange-500" : "bg-yellow-500/10 text-yellow-500"}
          `}>
            {quest.completed ? <CheckCircle2 className="h-5 w-5" /> : <QuestIcon className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">{quest.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
          </div>
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/5 shrink-0 text-xs font-bold">
            <Coins className="h-3 w-3 mr-1" />
            {quest.reward}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('progress', { defaultValue: 'Progress' })}</span>
            <span className="font-medium">{quest.progress}/{quest.target}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {quest.completed && (
          <Button size="sm" variant="outline" className="w-full mt-3 text-green-500 border-green-500/30" disabled>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {t('claimed', { defaultValue: 'Claimed' })}
          </Button>
        )}
        {!quest.completed && progressPercent >= 100 && (
          <Button size="sm" className="w-full mt-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700">
            <Gift className="h-3.5 w-3.5 mr-1.5" />
            {t('claim_reward', { defaultValue: 'Claim Reward' })}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Achievement Card Component ───
function AchievementCard({ achievement }: { achievement: any }) {
  const t = useTranslations('common')
  const AchIcon = achievement.icon
  const progressPercent = Math.min((achievement.progress / achievement.target) * 100, 100)

  return (
    <Card className={`
      card-hover-effect overflow-hidden relative
      ${achievement.unlocked
        ? "bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20"
        : "bg-muted/30 border border-border/50 opacity-70 hover:opacity-100"
      }
    `}>
      {achievement.unlocked && <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />}

      <CardContent className="pt-5 pb-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center
            ${achievement.unlocked
              ? "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/20"
              : "bg-muted text-muted-foreground"
            }
          `}>
            {achievement.unlocked ? <AchIcon className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
          </div>

          <div>
            <h3 className="font-bold text-sm">{achievement.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
          </div>

          <Badge variant="outline" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
            {achievement.rarity}
          </Badge>

          {!achievement.unlocked && (
            <div className="w-full space-y-1">
              <Progress value={progressPercent} className="h-1.5" />
              <div className="text-xs text-muted-foreground">{achievement.progress}/{achievement.target}</div>
            </div>
          )}

          <div className="flex items-center text-xs font-bold text-yellow-500">
            <Coins className="h-3 w-3 mr-1" />
            {achievement.reward} {t('coins', { defaultValue: 'coins' })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
