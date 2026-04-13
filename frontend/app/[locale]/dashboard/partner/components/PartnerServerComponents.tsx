"use client"

import Link from "next/link"
import {
  BarChart3,
  Crown,
  DollarSign,
  MoreHorizontal,
  Plus,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react"

import { MiniTourLobby, PartnerData, AnalyticsData } from "@/app/stores/miniTourLobbyStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LobbyActions } from "./LobbyActions"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import api from "@/app/lib/apiConfig"
import React, { FormEvent, useState } from 'react';
import LobbiesTabClient from "./LobbiesTabClient";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SubscriptionTab from "./SubscriptionTab"
import { Save } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
// --- ASYNC COMPONENTS ---

export function PartnerHeader({ partnerData }: { partnerData: PartnerData | null }) {
  const t = useTranslations("common")
  if (!partnerData) return null
  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Avatar className="h-16 w-16">
          <AvatarImage src="/placeholder.svg" alt="Partner" />
          <AvatarFallback className="text-lg">P</AvatarFallback>
        </Avatar>
      </div>
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{t("dashboard.partner.overview")}</h1>
        <div className="flex items-center space-x-2">
          <Badge className="bg-primary/20 text-primary">{t("become_partner")}</Badge>
        </div>
      </div>
    </div>
  )
}

export function KeyMetrics({ partnerData }: { partnerData: PartnerData | null }) {
  const t = useTranslations("common")
  if (!partnerData) return <div>{t("error")}</div>
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <DollarSign className="mr-3 h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">${partnerData.monthlyRevenue?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">{t("budget")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Star className="mr-3 h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{partnerData.revenueShare || 10}%</p>
              <p className="text-xs text-muted-foreground">Host Fee</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{partnerData.totalPlayers?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">{t("total_players")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Trophy className="mr-3 h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{partnerData.totalLobbies?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">{t("minitour_lobbies_title")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function OverviewTab({ partnerData, lobbies }: { partnerData: PartnerData | null; lobbies: MiniTourLobby[] }) {
  const t = useTranslations("common")
  if (!partnerData) return <p>{t("error")}</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("performance")}</CardTitle>
            <CardDescription>{t("statistics")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t("rating")}</span>
                <span className="text-sm font-medium">N/A</span>
              </div>
              <Progress value={0} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t("active_players")}</span>
                <span className="text-sm font-medium">
                  {(partnerData.totalLobbies || 0) > 0 ? Math.round(((partnerData.activeLobbies || 0) / (partnerData.totalLobbies || 0)) * 100) : 0}%
                </span>
              </div>
              <Progress value={(partnerData.totalLobbies || 0) > 0 ? ((partnerData.activeLobbies || 0) / (partnerData.totalLobbies || 0)) * 100 : 0} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{t("prize_pool")}</span>
                <span className="text-sm font-medium">{partnerData.revenueShare || 30}%</span>
              </div>
              <Progress value={partnerData.revenueShare || 30} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("quick_links")}</CardTitle>
            <CardDescription>{t("manage_players")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/partner/lobbies">
              <Button className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" /> {t("view_all_lobbies")}
              </Button>
            </Link>
            <Link href="/dashboard/partner/analytics">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" /> {t("dashboard.partner.analytics")}
              </Button>
            </Link>
            <Link href="/dashboard/partner/settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" /> {t("dashboard.partner.settings")}
              </Button>
            </Link>
            <Link href="/dashboard/partner?tab=team">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> {t("manage_players")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("minitour_lobbies_title")}</CardTitle>
          <CardDescription>{t("this_month")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lobbies
              .filter((lobby) => lobby.status === "WAITING" || lobby.status === "IN_PROGRESS")
              .sort((a, b) => b.prizePool - a.prizePool)
              .slice(0, 3)
              .map((lobby) => (
                <div key={lobby.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h4 className="font-medium">{lobby.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>
                        {lobby.currentPlayers}/{lobby.maxPlayers} {t("players")}
                      </span>
                      <span>{(lobby.matches?.length || 0)} matches</span>
                      <div className="flex items-center">
                        <Star className="mr-1 h-3 w-3 text-yellow-500" />
                        {lobby.averageRating}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      <DollarSign className="mr-1 inline h-4 w-4" />
                      {lobby.prizePool}
                    </div>
                    <div className="text-sm text-muted-foreground">{t("prize_pool")}</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LobbiesTab({ lobbies, onLobbiesUpdate }: { lobbies: MiniTourLobby[]; onLobbiesUpdate?: (lobbies: MiniTourLobby[]) => void }) {
  return <LobbiesTabClient initialLobbies={lobbies} onLobbiesUpdate={onLobbiesUpdate} />
}

export function AnalyticsTab({ analyticsData }: { analyticsData: AnalyticsData | null }) {
  const t = useTranslations("common")
  if (!analyticsData) return <p>{t("error")}</p>

  const { playerGrowth, revenueGrowth, performance } = analyticsData

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("active_players")}</CardTitle>
            <CardDescription>{t("this_month")}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for a chart */}
            <div className="h-[200px] w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
              Chart showing player growth
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("budget")}</CardTitle>
            <CardDescription>{t("this_month")}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for a chart */}
            <div className="h-[200px] w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
              Chart showing revenue growth
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="mr-3 h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{performance.totalPlayers.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("total_players")}</p>
                <p className={`text-sm ${performance.totalPlayers.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {performance.totalPlayers.change >= 0 ? "+" : ""}{performance.totalPlayers.change.toLocaleString()}% vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="mr-3 h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${performance.totalRevenue.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("budget")}</p>
                <p className={`text-sm ${performance.totalRevenue.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {performance.totalRevenue.change >= 0 ? "+" : ""}{performance.totalRevenue.change.toLocaleString()}% vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Star className="mr-3 h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{performance.averageRating.value?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-muted-foreground">{t("rating")}</p>
                <p className={`text-sm ${performance.averageRating.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {performance.averageRating.change >= 0 ? "+" : ""}{performance.averageRating.change?.toFixed(1) || '0.0'} vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RevenueTab({ partnerData, lobbies }: { partnerData: PartnerData | null; lobbies: MiniTourLobby[] }) {
  const t = useTranslations("common")
  if (!partnerData) return <p>{t("error")}</p>

  // Calculate additional revenue metrics
  const completedLobbies = lobbies.filter(l => l.status === 'COMPLETED')
  const totalEntryFees = lobbies.reduce((sum, lobby) => sum + (lobby.entryFee || 0), 0)
  const averagePrizePool = lobbies.length > 0 ? Math.floor(lobbies.reduce((sum, lobby) => sum + (lobby.prizePool || 0), 0) / lobbies.length) : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="mr-3 h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">${partnerData.totalRevenue?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{t("budget")}</p>
                <p className="text-xs text-green-600">From all completed matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Star className="mr-3 h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{partnerData.revenueShare || 10}%</p>
                <p className="text-xs text-muted-foreground">Host Fee Config</p>
                <p className="text-xs text-blue-600">Per tournament payout</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="mr-3 h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">${partnerData.monthlyRevenue?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{t("this_month")}</p>
                <p className="text-xs text-orange-600">Last 30 days earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Trophy className="mr-3 h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{partnerData.totalMatches?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{t("match_history")}</p>
                <p className="text-xs text-purple-600">Across all lobbies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("prize_pool")}</CardTitle>
            <CardDescription>{t("performance")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">{t("prize_pool")}</span>
              <span className="text-sm font-medium">${lobbies.reduce((sum, lobby) => sum + (lobby.prizePool || 0), 0).toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm">{t("budget")}</span>
              <span className="text-sm font-bold text-green-600">${partnerData.totalRevenue?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">{t("this_month")}</span>
              <span className="text-sm font-bold text-blue-600">${partnerData.monthlyRevenue?.toLocaleString() || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("minitour_lobbies_title")}</CardTitle>
            <CardDescription>{t("statistics")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">{t("all")}</span>
              <span className="text-sm font-medium">{partnerData.totalLobbies || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">{t("active_players")}</span>
              <span className="text-sm font-medium text-green-600">{partnerData.activeLobbies || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">{t("completed")}</span>
              <span className="text-sm font-medium text-blue-600">{completedLobbies.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">{t("avg_points")}</span>
              <span className="text-sm font-medium">${averagePrizePool.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Lobby</CardTitle>
          <CardDescription>Detailed breakdown of each lobby's performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("lobby")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("prize_pool")}</TableHead>
                <TableHead>Host Fee %</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lobbies.map((lobby) => {
                const sharePercent = (lobby.partnerRevenueShare !== undefined ? lobby.partnerRevenueShare : 0.2);
                const lobbyRevenue = Math.floor((lobby.entryFee || 0) * (lobby.currentPlayers || 0) * sharePercent);
                return (
                  <TableRow key={lobby.id}>
                    <TableCell className="font-medium">{lobby.name}</TableCell>
                    <TableCell>
                      <Badge variant={lobby.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {lobby.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${(lobby.prizePool || 0).toLocaleString()}</TableCell>
                    <TableCell>{Math.round(sharePercent * 100)}%</TableCell>
                    <TableCell className="font-bold text-green-600">${lobbyRevenue.toLocaleString()}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsTab({ partnerData }: { partnerData?: PartnerData }) {
  const t = useTranslations("common")
  const [partnerSettings, setPartnerSettings] = useState({
    partnerName: partnerData?.username || "TesTicTour Partner",
    contactEmail: partnerData?.email || "partner@example.com",
    hostFeePercent: partnerData?.revenueShare ?? 10,
    notifications: {
      email: true,
      sms: false,
    },
  });

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hostFeePercentValue = formData.get('hostFeePercent');
    const hostFeePercent = hostFeePercentValue ? Number(hostFeePercentValue) / 100 : undefined;

    try {
      const response = await api.put('/partner/settings', {
        partnerName: formData.get('partnerName'),
        contactEmail: formData.get('contactEmail'),
        hostFeePercent,
      });

      if (response.status === 200) {
        toast({
          title: "Settings Saved",
          description: "Your partner settings have been updated.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to save settings. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "An error occurred while saving.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">{t("dashboard.partner.settings", { defaultValue: "Settings & Configuration" })}</h2>
        <p className="text-muted-foreground text-sm">Manage your partner profile, payment gateways, plans, and global preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 bg-card/60 border border-white/5 p-1 w-full flex overflow-x-auto justify-start h-auto flex-wrap">
          <TabsTrigger value="general" className="flex-1 rounded-md py-2">General Profile</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 rounded-md py-2">Gateways & Fees</TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 rounded-md py-2">Plans & Billing</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 rounded-md py-2">Notifications</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSaveSettings}>
          <TabsContent value="general" className="space-y-4 outline-none active:outline-none focus:outline-none">
            <Card>
              <CardHeader><CardTitle>{t("tournament_details")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="partnerName">{t("summoner_name")}</Label>
                  <Input id="partnerName" name="partnerName" defaultValue={partnerSettings.partnerName} />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" defaultValue={partnerSettings.contactEmail} />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="shadow-xl shadow-primary/20">
                <Save className="mr-2 h-4 w-4" /> Save General Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 outline-none active:outline-none focus:outline-none">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Star className="mr-2 h-5 w-5 text-primary" />
                  Global Host Fee Config
                </CardTitle>
                <CardDescription>Set the default revenue share you receive from tournament entry fees. Maximum allowed is 10%.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hostFeePercent" className="text-base">Host Fee Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="hostFeePercent" 
                        name="hostFeePercent" 
                        type="number" 
                        min="0" 
                        max="10" 
                        defaultValue={partnerSettings.hostFeePercent}
                        className="w-20 font-bold"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <p className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-md border border-yellow-500/20">
                    Lưu ý: Partner chỉ được cấu hình Host Fee tối đa 10%. Thiết lập này sẽ tự động áp dụng cho mọi giải đấu bạn tạo.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden relative">
              <CardHeader>
                <CardTitle className="text-xl">Payout & Gateways</CardTitle>
                <CardDescription>Configure how you receive payouts from tournament revenue securely.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stripe Card */}
                  <div className="border border-white/10 bg-black/20 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition duration-300">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <DollarSign className="text-white h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">Stripe Connect</h4>
                        <p className="text-sm text-muted-foreground w-full break-words">International & USD Payouts</p>
                      </div>
                    </div>
                    <Button type="button" onClick={() => alert('Redirecting to Stripe Connect onboarding...')} className="bg-blue-600 hover:bg-blue-700 text-white w-full shadow-lg shadow-blue-500/20 mt-2">
                      Connect Stripe
                    </Button>
                  </div>

                  {/* Momo Card */}
                  <div className="border border-white/10 bg-black/20 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-pink-500/50 transition duration-300">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-pink-500 rounded-full flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">MoMo Wallet</h4>
                        <p className="text-sm text-muted-foreground w-full break-words">VND Local Payouts</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="border-pink-500/30 text-pink-500 hover:bg-pink-500 hover:text-white w-full transition select-none mt-2">
                      Link MoMo (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="shadow-xl shadow-primary/20">
                <Save className="mr-2 h-4 w-4" /> Save Fee Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 outline-none active:outline-none focus:outline-none">
            <Card>
              <CardHeader><CardTitle>{t("settings")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emailNotifications"
                    name="emailNotifications"
                    defaultChecked={partnerSettings.notifications.email}
                  />
                  <Label htmlFor="emailNotifications">{t("auth.email")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smsNotifications"
                    defaultChecked={partnerSettings.notifications.sms}
                  />
                  <Label htmlFor="smsNotifications">{t("settings")}</Label>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="shadow-xl shadow-primary/20">
                <Save className="mr-2 h-4 w-4" /> Save Notifications
              </Button>
            </div>
          </TabsContent>
        </form>

        <TabsContent value="plans" className="m-0 outline-none active:outline-none focus:outline-none">
          <SubscriptionTab partnerId={partnerData?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}