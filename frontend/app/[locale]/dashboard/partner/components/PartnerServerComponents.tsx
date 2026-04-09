"use client"

import Link from "next/link"
import {
  BarChart3,
  Coins,
  Crown,
  DollarSign,
  MoreHorizontal,
  Plus,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  Users,
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
            <Coins className="mr-3 h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">${partnerData.balance?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">{t("coins")}</p>
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
                      <Coins className="mr-1 inline h-4 w-4" />
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
              <Coins className="mr-3 h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">${partnerData.balance?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{t("coins")}</p>
                <p className="text-xs text-blue-600">Available for payout</p>
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
                <TableHead>{t("registration_fee")}</TableHead>
                <TableHead>{t("budget")}</TableHead>
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

export function SettingsTab() {
  const t = useTranslations("common")
  // Mock data that would normally come from an API
  const [partnerSettings, setPartnerSettings] = useState({
    partnerName: "TesTicTour Partner",
    partnerLogo: "/placeholder.svg",
    contactEmail: "partner@example.com",
    payoutMethod: "Bank Transfer",
    autoPayout: true,
    riotApiKey: "",
    usePersonalRiotApi: false,
    partnerRevenueShare: 30, // Default 30% revenue share
    notifications: {
      email: true,
      sms: false,
    },
  });

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const riotApiKey = formData.get('riotApiKey') as string;
    const usePersonalRiotApi = formData.get('usePersonalRiotApi') === 'on';

    try {
      const response = await api.put('/partner/settings', {
        riotApiKey,
        usePersonalRiotApi,
      });

      if (response.status === 200) {
        console.log('Settings saved successfully');
      } else {
        console.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("dashboard.partner.settings")}</h2>
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t("tournament_details")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="partnerName">{t("summoner_name")}</Label>
              <Input id="partnerName" defaultValue={partnerSettings.partnerName} />
            </div>
            <div>
              <Label htmlFor="partnerLogo">Partner Logo URL</Label>
              <Input id="partnerLogo" defaultValue={partnerSettings.partnerLogo} />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" defaultValue={partnerSettings.contactEmail} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("reward_history_tab")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payoutMethod">{t("prize_pool")}</Label>
              <Input id="payoutMethod" defaultValue={partnerSettings.payoutMethod} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoPayout"
                defaultChecked={partnerSettings.autoPayout}
              />
              <Label htmlFor="autoPayout">{t("live_updates")}</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("api_status")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="riotApiKey">{t("api_status")}</Label>
              <Input
                id="riotApiKey"
                name="riotApiKey"
                defaultValue={partnerSettings.riotApiKey}
                placeholder="RGAPI-..."
              />
              <div className="flex items-center space-x-2">
                <Switch
                  id="usePersonalRiotApi"
                  name="usePersonalRiotApi"
                  defaultChecked={partnerSettings.usePersonalRiotApi}
                />
                <Label htmlFor="usePersonalRiotApi">{t("operational")}</Label>
              </div>
            </div>
          </CardContent>
        </Card>



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

        <Button type="submit">{t("save")}</Button>
      </form>
    </div>
  );
}