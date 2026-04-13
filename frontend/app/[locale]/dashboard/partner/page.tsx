'use client';

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Plus, Settings, DollarSign, Users, Trophy, BarChart3, Coins, Crown, Menu, PanelLeftClose, HandCoins, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"

import SubscriptionTab from "./components/SubscriptionTab"
import PartnerTournamentTab from "./components/PartnerTournamentTab"

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
        const [partnerResponse, lobbiesResponse, playersResponse, subResponse] = await Promise.all([
          api.get('/partner/summary'),
          api.get('/minitour-lobbies'),
          api.get('/partner/players'),
          api.get('/partner/subscription').catch(() => ({ data: { data: { plan: 'FREE' } } }))
        ]);

        const plan = subResponse.data?.data?.plan || 'FREE';
        const partnerDataWithPlan = { ...partnerResponse.data.data, subscriptionPlan: plan };

        setPartnerData(partnerDataWithPlan);
        setLobbies(lobbiesResponse.data.data);
        setPlayers(playersResponse.data.data);
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
      const [partnerResponse, lobbiesResponse, playersResponse, subResponse] = await Promise.all([
        api.get('/partner/summary'),
        api.get('/minitour-lobbies'),
        api.get('/partner/players'),
        api.get('/partner/subscription').catch(() => ({ data: { data: { plan: 'FREE' } } }))
      ]);
      const plan = subResponse.data?.data?.plan || 'FREE';
      setPartnerData({ ...partnerResponse.data.data, subscriptionPlan: plan });
      setLobbies(lobbiesResponse.data.data);
      setPlayers(playersResponse.data.data);
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
          <TabsList className="flex flex-col h-full bg-transparent border-0 p-2 justify-start items-start gap-2 w-full">
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
            <TabsTrigger value="revenue" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <HandCoins className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Revenue"}
            </TabsTrigger>
            <TabsTrigger value="analytics" className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 data-[state=active]:bg-primary/20`}>
              <DollarSign className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Analytics"}
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
              <OverviewTabNew key={partnerData?.id} partnerData={partnerData as any} lobbies={lobbies as any} />
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
              <RevenueTab partnerData={partnerData as any} lobbies={lobbies as any} />
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
