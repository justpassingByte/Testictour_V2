"use client";

import { useEffect, useState, Suspense } from "react";
import { useAdminUserStore } from "@/app/stores/adminUserStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { PartnerData, MiniTourLobby } from "@/app/stores/miniTourLobbyStore";

// Import components from Partner Dashboard
import { OverviewTabNew } from "../../partner/components/OverviewTabNew";
import { LobbiesTab, RevenueTab, SettingsTab } from "../../partner/components/PartnerServerComponents";
import { AnalyticsTabNew } from "../../partner/components/AnalyticsTabNew";
import AdminPartnerSubscriptionTab from "./AdminPartnerSubscriptionTab";
import PlayersTabClient from "../../partner/components/PlayersTabClient";
import PartnerTransactionsTab from "./PartnerTransactionsTab";

interface PartnerDetailViewProps {
    partnerId: string;
    onBack: () => void;
}

export default function PartnerDetailView({ partnerId, onBack }: PartnerDetailViewProps) {
    const fetchPartnerDetail = useAdminUserStore((state) => state.fetchPartnerDetail);
    const selectedPartnerDetail = useAdminUserStore((state) => state.selectedPartnerDetail);
    const loading = useAdminUserStore((state) => state.loading);

    useEffect(() => {
        if (partnerId) {
            fetchPartnerDetail(partnerId);
        }
    }, [partnerId, fetchPartnerDetail]);

    if (loading && !selectedPartnerDetail) {
        return <div className="text-center py-12">Loading partner details...</div>;
    }

    if (!selectedPartnerDetail) {
        return <div className="text-center py-12 text-red-500">Partner not found. <Button variant="link" onClick={onBack}>Go Back</Button></div>;
    }

    const { partner, stats, lobbies, players, subscription, transactions } = selectedPartnerDetail;

    // Map AdminPartnerDetail data to PartnerData interface expected by components
    const partnerData: PartnerData = {
        id: partner.id,
        username: partner.username,
        email: partner.email,
        monthlyRevenue: stats.monthlyRevenue,
        totalRevenue: stats.totalRevenue,
        totalPlayers: stats.totalPlayers,
        totalLobbies: stats.totalLobbies,
        activeLobbies: stats.activeLobbies,
        balance: stats.balance || 0,
        totalMatches: stats.totalMatches || 0,
        revenueShare: 30, // Default or fetch if available
        lobbyStatuses: stats.lobbyStatuses,
    } as PartnerData;

    const typedLobbies = lobbies as MiniTourLobby[];

    // Transform Admin players to PartnerPlayer type if needed, or cast if they are compatible enough
    // The PlayersTabClient expects PartnerPlayer interface which matches what we added to AdminUserStore
    const typedPlayers = players as any[];

    const handleRefresh = () => {
        fetchPartnerDetail(partnerId);
    };

    return (
        <div className="container py-6 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {partner.username}'s Dashboard
                        </h1>
                        <p className="text-muted-foreground">Viewing as {partner.username} ({partner.email})</p>
                    </div>
                </div>
                <Button variant="ghost" onClick={handleRefresh}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                </Button>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="lobbies">Lobbies</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="players">Players</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <OverviewTabNew partnerData={partnerData} lobbies={typedLobbies} />
                </TabsContent>

                <TabsContent value="lobbies" className="space-y-4">
                    <LobbiesTab lobbies={typedLobbies} onLobbiesUpdate={handleRefresh} />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <AnalyticsTabNew partnerData={partnerData} lobbies={typedLobbies} />
                </TabsContent>

                <TabsContent value="players" className="space-y-4">
                    {/* Using PlayersTabClient directly to avoid double wrapping if safe, or mimic the PlayersTab wrapper */}
                    <PlayersTabClient
                        players={typedPlayers}
                        partnerId={partnerId}
                        currentBalance={partnerData.balance}
                        totalRevenue={partnerData.totalRevenue}
                        onPlayersUpdate={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <PartnerTransactionsTab transactions={transactions || []} partnerName={partner.username} />
                </TabsContent>

                <TabsContent value="subscription" className="space-y-4">
                    <Suspense fallback={<div>Loading subscription details...</div>}>
                        <AdminPartnerSubscriptionTab
                            partnerId={partnerId}
                            partnerName={partner.username}
                            currentSubscription={subscription}
                            onUpdate={handleRefresh}
                        />
                    </Suspense>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <RevenueTab partnerData={partnerData} lobbies={typedLobbies} />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4 text-sm">
                        Warning: Settings changes here may affect the currently logged-in Admin account or fail if endpoint is protected.
                    </div>
                    <SettingsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
