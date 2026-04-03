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

// --- ASYNC COMPONENTS ---

export function PartnerHeader({ partnerData }: { partnerData: PartnerData | null }) {
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
        <h1 className="text-4xl font-bold tracking-tight">Partner Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge className="bg-primary/20 text-primary">Partner</Badge>
        </div>
      </div>
    </div>
  )
}

export function KeyMetrics({ partnerData }: { partnerData: PartnerData | null }) {
  if (!partnerData) return <div>Failed to load partner metrics. Please check the API.</div>
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <DollarSign className="mr-3 h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">${partnerData.monthlyRevenue?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
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
              <p className="text-xs text-muted-foreground">Partner Balance</p>
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
              <p className="text-xs text-muted-foreground">Total Players</p>
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
              <p className="text-xs text-muted-foreground">Total Lobbies</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function OverviewTab({ partnerData, lobbies }: { partnerData: PartnerData | null; lobbies: MiniTourLobby[] }) {
  if (!partnerData) return <p>Could not load overview.</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
            <CardDescription>Your lobbies performance over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Player Satisfaction</span>
                <span className="text-sm font-medium">N/A</span>
              </div>
              <Progress value={0} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Lobby Utilization</span>
                <span className="text-sm font-medium">
                  {(partnerData.totalLobbies || 0) > 0 ? Math.round(((partnerData.activeLobbies || 0) / (partnerData.totalLobbies || 0)) * 100) : 0}%
                </span>
              </div>
              <Progress value={(partnerData.totalLobbies || 0) > 0 ? ((partnerData.activeLobbies || 0) / (partnerData.totalLobbies || 0)) * 100 : 0} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Revenue Share</span>
                <span className="text-sm font-medium">{partnerData.revenueShare || 30}%</span>
              </div>
              <Progress value={partnerData.revenueShare || 30} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your lobbies and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/partner/lobbies">
              <Button className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" /> Create New Lobby
              </Button>
            </Link>
            <Link href="/dashboard/partner/analytics">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" /> View Detailed Analytics
              </Button>
            </Link>
            <Link href="/dashboard/partner/settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" /> Partner Settings
              </Button>
            </Link>
            <Link href="/dashboard/partner?tab=team">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> View Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Lobbies</CardTitle>
          <CardDescription>Your most successful lobbies this month</CardDescription>
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
                        {lobby.currentPlayers}/{lobby.maxPlayers} players
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
                    <div className="text-sm text-muted-foreground">Prize Pool</div>
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
  if (!analyticsData) return <p>Could not load analytics.</p>

  const { playerGrowth, revenueGrowth, performance } = analyticsData

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Player Growth</CardTitle>
            <CardDescription>New players over the last 6 months</CardDescription>
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
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
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
                <p className="text-xs text-muted-foreground">Total Players</p>
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
                <p className="text-xs text-muted-foreground">Total Revenue</p>
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
                <p className="text-xs text-muted-foreground">Average Rating</p>
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
  if (!partnerData) return <p>Could not load revenue data.</p>

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
                <p className="text-xs text-muted-foreground">Total Revenue</p>
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
                <p className="text-xs text-muted-foreground">Current Balance</p>
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
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
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
                <p className="text-xs text-muted-foreground">Matches Played</p>
                <p className="text-xs text-purple-600">Across all lobbies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>How your revenue is calculated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Total Prize Pools</span>
              <span className="text-sm font-medium">${lobbies.reduce((sum, lobby) => sum + (lobby.prizePool || 0), 0).toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm">Total Revenue Earned</span>
              <span className="text-sm font-bold text-green-600">${partnerData.totalRevenue?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Monthly Estimate</span>
              <span className="text-sm font-bold text-blue-600">${partnerData.monthlyRevenue?.toLocaleString() || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lobby Performance</CardTitle>
            <CardDescription>Your lobby statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Total Lobbies</span>
              <span className="text-sm font-medium">{partnerData.totalLobbies || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Active Lobbies</span>
              <span className="text-sm font-medium text-green-600">{partnerData.activeLobbies || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Completed Lobbies</span>
              <span className="text-sm font-medium text-blue-600">{completedLobbies.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average Prize Pool</span>
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
                <TableHead>Lobby Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prize Pool</TableHead>
                <TableHead>Your Share</TableHead>
                <TableHead>Revenue (Est.)</TableHead>
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
      <h2 className="text-2xl font-bold">Partner Settings</h2>
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="partnerName">Partner Name</Label>
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
          <CardHeader><CardTitle>Payout Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payoutMethod">Payout Method</Label>
              <Input id="payoutMethod" defaultValue={partnerSettings.payoutMethod} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoPayout"
                defaultChecked={partnerSettings.autoPayout}
              />
              <Label htmlFor="autoPayout">Enable Auto Payout</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>API Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="riotApiKey">Riot API Key</Label>
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
                <Label htmlFor="usePersonalRiotApi">Use Personal Riot API Key</Label>
              </div>
            </div>
          </CardContent>
        </Card>



        <Card>
          <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="emailNotifications"
                name="emailNotifications"
                defaultChecked={partnerSettings.notifications.email}
              />
              <Label htmlFor="emailNotifications">Email Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="smsNotifications"
                defaultChecked={partnerSettings.notifications.sms}
              />
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Save Settings</Button>
      </form>
    </div>
  );
}