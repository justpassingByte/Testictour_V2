"use client"

import { useState, useEffect } from "react"
import {
  Trophy, Star, Coins, Target, Flame, Zap, Crown, Medal, Gift,
  CheckCircle2, Clock, Lock, Sword, Users, Gamepad2, ChevronRight,
  Sparkles, Shield, Award, TrendingUp, Loader2, RefreshCw, BarChart3
} from "lucide-react"
import { useTranslations } from 'next-intl'
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import api from "@/app/lib/apiConfig"
import { useUserStore } from "@/app/stores/userStore"

// ─── Types ───
interface PlayerStats {
  totalMatchesPlayed: number
  tournamentsPlayed: number
  tournamentsWon: number
  topFourRate: number
  firstPlaceRate: number
  lobbiesPlayed: number
  averagePlacement: number
  totalPoints: number
  rank?: string
}

// ─── Loyalty Tier System ───
const loyaltyTiers = [
  { name: "Bronze",   minPoints: 0,     icon: Shield,   color: "from-amber-700 to-amber-900",   textColor: "text-amber-600",  bgAccent: "bg-amber-700/10" },
  { name: "Silver",   minPoints: 500,   icon: Medal,    color: "from-gray-400 to-slate-600",     textColor: "text-gray-400",   bgAccent: "bg-gray-400/10" },
  { name: "Gold",     minPoints: 2000,  icon: Crown,    color: "from-yellow-400 to-amber-600",   textColor: "text-yellow-500", bgAccent: "bg-yellow-500/10" },
  { name: "Diamond",  minPoints: 5000,  icon: Sparkles, color: "from-cyan-400 to-blue-600",      textColor: "text-cyan-400",   bgAccent: "bg-cyan-400/10" },
  { name: "Champion", minPoints: 10000, icon: Trophy,   color: "from-violet-500 to-purple-700",  textColor: "text-violet-500", bgAccent: "bg-violet-500/10" },
]

// ─── Achievement Definitions (computed against real stats) ───
function buildAchievements(stats: PlayerStats | null) {
  const s = stats ?? {
    totalMatchesPlayed: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    topFourRate: 0,
    firstPlaceRate: 0,
    lobbiesPlayed: 0,
    averagePlacement: 0,
    totalPoints: 0,
  }

  const top4Count = Math.round((s.totalMatchesPlayed ?? 0) * (s.topFourRate ?? 0))
  const firstPlaceCount = Math.round((s.totalMatchesPlayed ?? 0) * (s.firstPlaceRate ?? 0))

  return [
    {
      id: "a1", title: "First Blood",       description: "Win your first tournament",
      icon: Sword,    reward: 200,  rarity: "Common",    target: 1,  progress: s.tournamentsWon ?? 0,
      unlocked: (s.tournamentsWon ?? 0) >= 1,
    },
    {
      id: "a2", title: "Top 4 Machine",     description: "Get top 4 in 10 matches",
      icon: Target,   reward: 500,  rarity: "Common",    target: 10, progress: top4Count,
      unlocked: top4Count >= 10,
    },
    {
      id: "a3", title: "MiniTour Master",   description: "Play 25 MiniTour lobbies",
      icon: Gamepad2, reward: 750,  rarity: "Rare",      target: 25, progress: s.lobbiesPlayed ?? 0,
      unlocked: (s.lobbiesPlayed ?? 0) >= 25,
    },
    {
      id: "a4", title: "Arena Veteran",     description: "Play 50 tournament matches",
      icon: Shield,   reward: 800,  rarity: "Rare",      target: 50, progress: s.totalMatchesPlayed ?? 0,
      unlocked: (s.totalMatchesPlayed ?? 0) >= 50,
    },
    {
      id: "a5", title: "Diamond Grinder",   description: "Earn 5,000 total points",
      icon: Coins,    reward: 1500, rarity: "Epic",      target: 5000, progress: s.totalPoints ?? 0,
      unlocked: (s.totalPoints ?? 0) >= 5000,
    },
    {
      id: "a6", title: "Untouchable",       description: "Win 5 tournaments",
      icon: Crown,    reward: 2000, rarity: "Epic",      target: 5, progress: s.tournamentsWon ?? 0,
      unlocked: (s.tournamentsWon ?? 0) >= 5,
    },
    {
      id: "a7", title: "Legend",            description: "Reach Champion loyalty tier",
      icon: Trophy,   reward: 5000, rarity: "Legendary", target: 1, progress: (s.totalPoints ?? 0) >= 10000 ? 1 : 0,
      unlocked: (s.totalPoints ?? 0) >= 10000,
    },
    {
      id: "a8", title: "Sharp Aim",         description: "Get 1st place 3 times",
      icon: Star,     reward: 1200, rarity: "Rare",      target: 3, progress: firstPlaceCount,
      unlocked: firstPlaceCount >= 3,
    },
  ]

}

// ─── Quest Definitions ───
const dailyQuests = [
  { id: "d1", title: "First Match",   description: "Play 1 MiniTour game today",      reward: 50,  icon: Gamepad2,   progress: 0, target: 1, completed: false },
  { id: "d2", title: "Top 4 Finish",  description: "Finish in top 4 in any game",     reward: 75,  icon: Target,     progress: 0, target: 1, completed: false },
  { id: "d3", title: "Social Player", description: "Play in a lobby with 6+ players", reward: 30,  icon: Users,      progress: 0, target: 1, completed: false },
]

const weeklyQuests = [
  { id: "w1", title: "Tournament Warrior",  description: "Participate in 2 tournaments",   reward: 300, icon: Sword,      progress: 0, target: 2, completed: false },
  { id: "w2", title: "Winning Streak",      description: "Win 3 MiniTour games this week", reward: 500, icon: Flame,      progress: 0, target: 3, completed: false },
  { id: "w3", title: "Consistent Player",   description: "Play 5 games this week",         reward: 200, icon: TrendingUp, progress: 0, target: 5, completed: false },
  { id: "w4", title: "Point Collector",     description: "Earn 500 total points",          reward: 400, icon: Star,       progress: 0, target: 500, completed: false },
]

const recentRewards = [
  { id: "r1", type: "quest",       title: "First Match — Daily Quest",        coins: 50,  date: "Today" },
  { id: "r2", type: "achievement", title: "Top 4 Machine — Achievement",      coins: 500, date: "Yesterday" },
  { id: "r3", type: "quest",       title: "Consistent Player — Weekly Quest", coins: 200, date: "2 days ago" },
  { id: "r4", type: "achievement", title: "First Blood — Achievement",        coins: 200, date: "3 days ago" },
]

function getRarityColor(rarity: string) {
  switch (rarity) {
    case "Common":    return "text-gray-400   border-gray-400/30   bg-gray-400/5"
    case "Rare":      return "text-blue-400   border-blue-400/30   bg-blue-400/5"
    case "Epic":      return "text-violet-400 border-violet-400/30 bg-violet-400/5"
    case "Legendary": return "text-amber-400  border-amber-400/30  bg-amber-400/5"
    default:          return ""
  }
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function LoyaltyClient() {
  const t = useTranslations('common')
  const { currentUser } = useUserStore()
  const [activeTab, setActiveTab] = useState("quests")
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Compute player coins from total points (1 tournament point = 1 coin)
  const playerCoins = stats?.totalPoints ?? 0

  const playerTier = [...loyaltyTiers].reverse().find(t => playerCoins >= t.minPoints) ?? loyaltyTiers[0]
  const prevTierCoins = playerTier.minPoints
  const nextTierCoins = (loyaltyTiers.find(t => t.minPoints > playerCoins) ?? loyaltyTiers[loyaltyTiers.length - 1]).minPoints
  const tierProgress = playerTier.name === "Champion"
    ? 100
    : Math.min(((playerCoins - prevTierCoins) / (nextTierCoins - prevTierCoins)) * 100, 100)

  const TierIcon = playerTier.icon
  const achievements = buildAchievements(stats)
  const unlockedCount = achievements.filter(a => a.unlocked).length

  // Fetch real stats
  const fetchStats = async () => {
    if (!currentUser?.id) return
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/players/${currentUser.id}/stats`)
      if (res.data) setStats(res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [currentUser?.id])

  return (
    <div className="container py-10 space-y-8">

      {/* ─── Page Header ─── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
            <span className="gradient-text">{t('loyalty_title', { defaultValue: 'Rewards Hub' })}</span>
          </h1>
          <p className="text-white/80 mt-1 max-w-xl drop-shadow">
            {t('loyalty_description', { defaultValue: 'Complete quests, earn coins, and unlock achievements to climb the loyalty ranks.' })}
          </p>
        </div>

        {/* Live stats badge */}
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {currentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
              className="border-white/10 hover:bg-white/10 text-white bg-black/20 text-xs gap-1.5 backdrop-blur-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Progress
            </Button>
          )}
        </div>
      </div>

      {/* ─── Not logged in notice ─── */}
      {!currentUser && (
        <Card className="bg-violet-500/5 border border-violet-500/20">
          <CardContent className="py-4 px-6 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-400 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <Link href="/?auth=login" className="text-violet-400 font-medium hover:underline">{t("sign_in", { defaultValue: "Sign in" })}</Link>
              {" "}{t("sign_in_to_track_progress", { defaultValue: "to track your real progress and claim rewards." })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Loyalty Tier Banner ─── */}
      <Card className="overflow-hidden relative bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20">
        <div className={`h-2 bg-gradient-to-r ${playerTier.color}`} />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Tier Badge */}
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${playerTier.color} shadow-lg`}>
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
                {currentUser && (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/5 font-medium text-xs">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {unlockedCount}/{achievements.length} {t("achievements", { defaultValue: "achievements" })}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('next_tier', { defaultValue: 'Next' })}:{" "}
                    <span className={`font-bold ${(loyaltyTiers.find(t => t.minPoints > playerCoins) ?? playerTier).textColor}`}>
                      {(loyaltyTiers.find(t => t.minPoints > playerCoins) ?? playerTier).name}
                    </span>
                  </span>
                  <span className="font-medium">{playerCoins.toLocaleString()} / {nextTierCoins.toLocaleString()}</span>
                </div>
                <Progress value={tierProgress} className="h-3" />
              </div>

              {/* Tier milestones */}
              <div className="flex items-center gap-1 overflow-x-auto pt-1">
                {loyaltyTiers.map((tier, idx) => {
                  const TIcon = tier.icon
                  const isActive = tier.name === playerTier.name
                  const isPast = tier.minPoints <= playerCoins
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

      {/* ─── Quick Stats Row (only when logged in with stats) ─── */}
      {currentUser && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("matches_played", { defaultValue: "Matches Played" }), value: stats.totalMatchesPlayed, icon: Gamepad2,   color: "violet" },
            { label: t("tournaments_won", { defaultValue: "Tournaments Won" }),    value: stats.tournamentsWon,    icon: Trophy,      color: "amber" },
            { label: t("avg_placement", { defaultValue: "Avg Placement" }),   value: stats.averagePlacement.toFixed(1), icon: Target, color: "blue" },
            { label: t("top_four_rate", { defaultValue: "Top 4 Rate" }),      value: `${(stats.topFourRate * 100).toFixed(0)}%`, icon: TrendingUp, color: "emerald" },
          ].map(stat => (
            <Card key={stat.label} className={`bg-${stat.color}-500/10 border-${stat.color}-500/20 backdrop-blur-sm`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className={`text-[10px] text-${stat.color}-400 font-bold uppercase drop-shadow-sm`}>{stat.label}</p>
                  <p className="text-xl font-bold text-white drop-shadow-md">{stat.value}</p>
                </div>
                <stat.icon className={`h-5 w-5 text-${stat.color}-400 drop-shadow-sm`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Main Tab Content ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-black/40 backdrop-blur-md border border-white/10 text-white/70">
          <TabsTrigger value="quests" className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">
            <Sword className="h-4 w-4" />
            {t('quests_tab', { defaultValue: 'Quests' })}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">
            <Award className="h-4 w-4" />
            {t('achievements_tab', { defaultValue: 'Achievements' })}
            {currentUser && unlockedCount > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[10px] bg-violet-500/20 text-violet-400 border-violet-500/30">
                {unlockedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">
            <Clock className="h-4 w-4" />
            {t('reward_history_tab', { defaultValue: 'History' })}
          </TabsTrigger>
        </TabsList>

        {/* ===================== QUESTS TAB ===================== */}
        <TabsContent value="quests" className="space-y-8 mt-6">
          {/* Daily Quests */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-500 drop-shadow-md" />
              <h2 className="text-xl font-bold text-white drop-shadow-md">{t('daily_quests', { defaultValue: 'Daily Quests' })}</h2>
              <Badge variant="outline" className="ml-2 text-xs bg-black/40 text-white border-white/20">
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
              <Flame className="h-5 w-5 text-orange-500 drop-shadow-md" />
              <h2 className="text-xl font-bold text-white drop-shadow-md">{t('weekly_quests', { defaultValue: 'Weekly Quests' })}</h2>
              <Badge variant="outline" className="ml-2 text-xs bg-black/40 text-white border-white/20">
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow-md">{t('achievement_gallery', { defaultValue: 'Achievement Gallery' })}</h2>
              <p className="text-sm text-white/80 drop-shadow">
                {unlockedCount}/{achievements.length} {t('unlocked', { defaultValue: 'unlocked' })}
                {currentUser && stats && ` · ${t("based_on_real_stats", { defaultValue: "based on your real stats" })}`}
              </p>
            </div>
            {!currentUser && (
              <Badge variant="outline" className="text-white/80 border-white/20 bg-black/40 text-xs shadow-md">
                {t("sign_in_to_track_progress_short", { defaultValue: "Sign in to track progress" })}
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </TabsContent>

        {/* ===================== HISTORY TAB ===================== */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <h2 className="text-xl font-bold text-white drop-shadow-md">{t('recently_earned', { defaultValue: 'Recently Earned' })}</h2>

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
function AchievementCard({ achievement }: { achievement: ReturnType<typeof buildAchievements>[0] }) {
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
              <div className="text-xs text-muted-foreground">{achievement.progress.toLocaleString()}/{achievement.target.toLocaleString()}</div>
            </div>
          )}

          {achievement.unlocked && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/5 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" /> {t("unlocked", { defaultValue: "Unlocked" })}
            </Badge>
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
