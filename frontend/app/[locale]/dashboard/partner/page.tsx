'use client';

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { Plus, Settings, DollarSign, Users, Trophy, BarChart3, Coins } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"

import SubscriptionTab from "./components/SubscriptionTab"

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
    <div className="space-y-4">
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [partnerResponse, lobbiesResponse, playersResponse] = await Promise.all([
          api.get('/partner/summary'),
          api.get('/minitour-lobbies'),
          api.get('/partner/players')
        ]);

        console.log('[PartnerDashboardPage] API responses:', {
          partnerResponse: partnerResponse.data,
          lobbiesResponse: lobbiesResponse.data,
          playersResponse: playersResponse.data
        });

        setPartnerData(partnerResponse.data.data);
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
      const [partnerResponse, lobbiesResponse, playersResponse] = await Promise.all([
        api.get('/partner/summary'),
        api.get('/minitour-lobbies'),
        api.get('/partner/players')
      ]);
      setPartnerData(partnerResponse.data.data);
      setLobbies(lobbiesResponse.data.data);
      setPlayers(playersResponse.data.data);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <TabContentSkeleton />
        </div>
      </div>
    );
  }

  if (!partnerData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">No Partner Data Found</h1>
          <p className="text-muted-foreground mt-2">Please login to access partner dashboard.</p>
        </div>
      </div>
    );
  }

  const summaryData = {
    partnerBalance: partnerData?.balance || 0, // Now provided by API
    totalPlayers: partnerData?.totalPlayers || 0,
    totalLobbies: partnerData?.totalLobbies || 0,
    monthlyRevenue: partnerData?.monthlyRevenue || 0, // Now provided by API
  };

  const handleLobbiesUpdate = (updatedLobbies: MiniTourLobby[]) => {
    setLobbies(updatedLobbies);
    refreshDashboard(); // Refresh everything when lobbies change
  };

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Partner Dashboard</h1>
          <p className="text-muted-foreground">Manage your partnership, lobbies, players, and earnings.</p>
        </div>
        <div className="flex items-center gap-2">

          <SyncStatus status="live" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryData.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partner Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryData.partnerBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalPlayers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all lobbies</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lobbies</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalLobbies.toLocaleString()}</div>
            {partnerData?.lobbyStatuses ? (
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  {partnerData.lobbyStatuses.WAITING} Waiting
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">
                  {partnerData.lobbyStatuses.IN_PROGRESS} Active
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                  {partnerData.lobbyStatuses.COMPLETED} Done
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Total active and completed</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lobbies">Lobbies</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="team">Players</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTabNew key={partnerData?.id} partnerData={partnerData as any} lobbies={lobbies as any} />
        </TabsContent>

        <TabsContent value="lobbies" className="space-y-4">
          <LobbiesTab lobbies={lobbies as any} onLobbiesUpdate={handleLobbiesUpdate} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTabNew partnerData={partnerData as any} lobbies={lobbies as any} />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <PlayersTab
            players={players as any}
            onPlayersUpdate={refreshPlayers}
          />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Suspense fallback={<TabContentSkeleton />}>
            <SubscriptionTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueTab partnerData={partnerData as any} lobbies={lobbies as any} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
