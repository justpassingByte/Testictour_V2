'use client';

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Plus, Settings, DollarSign, Users, Trophy, BarChart3, Coins, Crown, Menu, PanelLeftClose, HandCoins, ShieldCheck, Gift, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"

import SubscriptionTab from "./components/SubscriptionTab"
import PartnerTournamentTab from "./components/PartnerTournamentTab"
import PartnerRewardTab from "./components/PartnerRewardTab"
import PartnerAchievementTab from "./components/PartnerAchievementTab"
import WalletTab from "./components/WalletTab"

import api from "@/app/lib/apiConfig"
import { MiniTourLobby, MiniTourMatch, MiniTourMatchResult, PartnerData, AnalyticsData, Player } from "@/app/stores/miniTourLobbyStore";

import {
  LobbiesTab,
  RevenueTab,
  SettingsTab,
} from "./components/PartnerServerComponents"
import { OverviewTabNew } from "./components/OverviewTabNew"
import { AnalyticsTabNew } from "./components/AnalyticsTabNew"
import { PlayersTab } from "./components/PlayersTab"

// Fallback Skeleton Components
function TabContentSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function PartnerDashboardPage() {
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [lobbies, setLobbies] = useState<MiniTourLobby[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('action') === 'upgrade' || searchParams?.get('tab') === 'plans') {
      setActiveTab("plans");
    } else if (searchParams?.get('tab')) {
      setActiveTab(searchParams.get('tab') as string);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [partnerResponse, lobbiesResponse, playersResponse, subResponse, ledgerRes, tourRes] = await Promise.all([
          api.get('/partner/summary'),
          api.get('/minitour-lobbies'),
          api.get('/partner/players'),
          api.get('/partner/subscription').catch(() => ({ data: { data: { plan: 'STARTER' } } })),
          api.get('/partner/wallet/ledger').catch(() => ({ data: null })),
          api.get('/tournaments/my').catch(() => ({ data: { tournaments: [] } }))
        ]);

        const plan = subResponse.data?.data?.plan || 'STARTER';
        const partnerDataWithPlan = { ...partnerResponse.data.data, subscriptionPlan: plan };

        setPartnerData(partnerDataWithPlan);
        setLobbies(lobbiesResponse.data.data);
        setPlayers(playersResponse.data.data);
        setLedger(ledgerRes.data);
        setTournaments(tourRes.data.tournaments || []);
      } catch (error) {
        console.error('Failed to fetch partner data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshPlayers = async () => {
    try {
      const response = await api.get('/partner/players');
      setPlayers(response.data.data);
    } catch (error) {
      console.error('Failed to refresh players:', error);
    }
  };

  const refreshDashboard = async () => {
    try {
      const [partnerResponse, lobbiesResponse, playersResponse, subResponse, ledgerRes, tourRes] = await Promise.all([
        api.get('/partner/summary'),
        api.get('/minitour-lobbies'),
        api.get('/partner/players'),
        api.get('/partner/subscription').catch(() => ({ data: { data: { plan: 'STARTER' } } })),
        api.get('/partner/wallet/ledger').catch(() => ({ data: null })),
        api.get('/tournaments/my').catch(() => ({ data: { tournaments: [] } }))
      ]);
      const plan = subResponse.data?.data?.plan || 'STARTER';
      setPartnerData({ ...partnerResponse.data.data, subscriptionPlan: plan });
      setLobbies(lobbiesResponse.data.data);
      setPlayers(playersResponse.data.data);
      setLedger(ledgerRes.data);
      setTournaments(tourRes.data.tournaments || []);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-full">
        <div className="space-y-4">
          <TabContentSkeleton />
        </div>
      </div>
    );
  }

  if (!partnerData) {
    return (
      <div className="container py-8 max-w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">No Partner Data Found</h1>
          <p className="text-muted-foreground mt-2">Please login to access partner dashboard.</p>
        </div>
      </div>
    );
  }

  const handleLobbiesUpdate = (updatedLobbies: MiniTourLobby[]) => {
    setLobbies(updatedLobbies);
    refreshDashboard(); 
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] w-full">
        {/* Sidebar */}
        <div className={`transition-all duration-300 border-r border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-lg flex flex-col ${isSidebarOpen ? 'w-64' : 'w-16'} shrink-0`}>
          <div className="p-4 flex items-center justify-between border-b border-white/5">
            {isSidebarOpen && <span className="font-bold tracking-tight">Partner Panel</span>}
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={!isSidebarOpen ? "mx-auto" : ""}>
              {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          <TabsList className="flex flex-col h-full bg-transparent border-0 p-2 justify-start items-start gap-1 w-full overflow-y-auto">
            {isSidebarOpen && (
              <div className="flex flex-row items-center gap-2 mt-4 mb-1 px-3 w-full">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500/80 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">Manage</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
            )}
            <TabsTrigger value="overview" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <BarChart3 className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Overview"}
            </TabsTrigger>
            <TabsTrigger value="tournaments" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Trophy className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Tournaments"}
            </TabsTrigger>
            <TabsTrigger value="lobbies" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Users className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Lobbies"}
            </TabsTrigger>
            <TabsTrigger value="team" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Plus className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Players"}
            </TabsTrigger>
            
            {isSidebarOpen && (
              <div className="flex flex-row items-center gap-2 mt-4 mb-1 px-3 w-full">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">Finance & Analytics</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
            )}
            <TabsTrigger value="revenue" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <HandCoins className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Revenue"}
            </TabsTrigger>
            <TabsTrigger value="wallet" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <DollarSign className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Wallet"}
            </TabsTrigger>
            <TabsTrigger value="analytics" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <BarChart3 className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Analytics"}
            </TabsTrigger>
            <TabsTrigger value="plans" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Crown className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Plans"}
            </TabsTrigger>

            {isSidebarOpen && (
              <div className="flex flex-row items-center gap-2 mt-4 mb-1 px-3 w-full">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-500/80 shadow-[0_0_5px_rgba(6,182,212,0.5)]"></div>
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">Engagement & Settings</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
            )}
            <TabsTrigger value="rewards" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Gift className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Rewards"}
            </TabsTrigger>
            <TabsTrigger value="achievements" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Star className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Achievements"}
            </TabsTrigger>
            <TabsTrigger value="settings" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <Settings className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Settings"}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-8 space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Partner Dashboard</h1>
              <p className="text-muted-foreground text-sm">Manage your partnership, lobbies, players, and earnings.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="h-4 w-4" />
              </Button>
              <SyncStatus status="live" />
            </div>
          </div>

          <div className="w-full">
            <TabsContent value="overview" className="m-0 space-y-4 outline-none">
              <OverviewTabNew key={partnerData?.id} partnerData={partnerData as any} lobbies={lobbies as any} ledger={ledger} tournaments={tournaments} />
            </TabsContent>

            <TabsContent value="tournaments" className="m-0 space-y-4 outline-none">
              <PartnerTournamentTab subscriptionPlan={(partnerData as any)?.subscriptionPlan} />
            </TabsContent>

            <TabsContent value="lobbies" className="m-0 space-y-4 outline-none">
              <LobbiesTab lobbies={lobbies as any} onLobbiesUpdate={handleLobbiesUpdate} />
            </TabsContent>

            <TabsContent value="analytics" className="m-0 space-y-4 outline-none">
              <AnalyticsTabNew partnerData={partnerData as any} lobbies={lobbies as any} />
            </TabsContent>

            <TabsContent value="team" className="m-0 space-y-4 outline-none">
              <PlayersTab
                players={players as any}
                onPlayersUpdate={refreshPlayers}
              />
            </TabsContent>

            <TabsContent value="revenue" className="m-0 space-y-4 outline-none">
              <RevenueTab 
                partnerData={partnerData as any} 
                lobbies={lobbies as any} 
                tournaments={(partnerData as any)?.tournaments}
                ledger={(partnerData as any)?.ledger}
              />
            </TabsContent>

            <TabsContent value="wallet" className="m-0 space-y-4 outline-none">
              <WalletTab />
            </TabsContent>

            <TabsContent value="rewards" className="m-0 space-y-4 outline-none">
              <PartnerRewardTab />
            </TabsContent>

            <TabsContent value="achievements" className="m-0 space-y-4 outline-none">
              <PartnerAchievementTab />
            </TabsContent>

            <TabsContent value="plans" className="m-0 space-y-4 outline-none">
              <SubscriptionTab partnerId={partnerData?.id} />
            </TabsContent>

            <TabsContent value="settings" className="m-0 space-y-4 outline-none">
              <SettingsTab partnerData={partnerData as any} />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
