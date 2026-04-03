"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Plus, Settings, Users, Trophy, Gamepad2, Gift, DollarSign, Handshake, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"
import { Badge } from "@/components/ui/badge"
import api from "@/app/lib/apiConfig"

const LoadingSpinner = () => <div className="text-center py-8">Loading...</div>;

const TournamentManagementTab = dynamic(() => import('./components/TournamentManagementTab'), { loading: LoadingSpinner });
const UserManagementTab = dynamic(() => import('./components/UserManagementTab'), { loading: LoadingSpinner });
const MinitourManagementTab = dynamic(() => import('./components/MinitourManagementTab'), { loading: LoadingSpinner });
const RewardManagementTab = dynamic(() => import('./components/RewardManagementTab'), { loading: LoadingSpinner });
const SettingsTab = dynamic(() => import('./components/SettingsTab'), { loading: LoadingSpinner });

const AdminOverviewTab = dynamic(() => import('./components/AdminOverviewTab'), { loading: LoadingSpinner });
const AdminRevenueTab = dynamic(() => import('./components/AdminRevenueTab'), { loading: LoadingSpinner });
const AdminAnalyticsTab = dynamic(() => import('./components/AdminAnalyticsTab'), { loading: LoadingSpinner });

interface AdminStats {
  totalUsers: number;
  totalPartners: number;
  totalPlayers: number;
  totalLobbies: number;
  totalTournaments: number;
  activeTournaments: number;
  totalMatches: number;
  totalRevenue: number;
  monthlyRevenue: number;
  subscriptionPlans: {
    FREE: number;
    PRO: number;
    ENTERPRISE: number;
  };
  lobbyStatuses: {
    WAITING: number;
    IN_PROGRESS: number;
    COMPLETED: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.data);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage tournaments, users, rewards, and more.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/admin/tournaments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Tournament
            </Link>
          </Button>
          <SyncStatus status={loading ? "syncing" : "live"} />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partners</CardTitle>
                <Handshake className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPartners}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                    {stats.subscriptionPlans.FREE} Free
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {stats.subscriptionPlans.PRO} Pro
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-500 border-purple-500/20">
                    {stats.subscriptionPlans.ENTERPRISE} Ent
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">${stats.monthlyRevenue.toLocaleString()} this month</p>
              </CardContent>
            </Card>

            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users & Lobbies</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    {stats.lobbyStatuses.WAITING} Waiting
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">
                    {stats.lobbyStatuses.IN_PROGRESS} Active
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                    {stats.lobbyStatuses.COMPLETED} Done
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matches</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMatches}</div>
                <p className="text-xs text-muted-foreground">{stats.totalTournaments} tournaments · {stats.activeTournaments} active</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="overflow-x-auto flex w-full justify-start h-auto no-scrollbar">
          <TabsTrigger value="overview"><Gamepad2 className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="revenue"><DollarSign className="mr-2 h-4 w-4" />Revenue</TabsTrigger>
          <TabsTrigger value="analytics"><TrendingUp className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="tournaments"><Trophy className="mr-2 h-4 w-4" />Tournaments</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="minitours"><Gamepad2 className="mr-2 h-4 w-4" />Minitours</TabsTrigger>
          <TabsTrigger value="rewards"><Gift className="mr-2 h-4 w-4" />Rewards</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AdminOverviewTab stats={stats} />
        </TabsContent>
        <TabsContent value="revenue">
          <AdminRevenueTab stats={stats} />
        </TabsContent>
        <TabsContent value="analytics">
          <AdminAnalyticsTab />
        </TabsContent>

        <TabsContent value="tournaments">
          <TournamentManagementTab />
        </TabsContent>
        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>
        <TabsContent value="minitours">
          <MinitourManagementTab />
        </TabsContent>
        <TabsContent value="rewards">
          <RewardManagementTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
