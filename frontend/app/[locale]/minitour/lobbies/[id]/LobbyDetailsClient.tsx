"use client"

import { useEffect, Suspense, lazy } from "react"
import Link from "next/link"
import { ChevronRight, Loader2 } from "lucide-react"
import { useParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useMiniTourLobbyStore } from '@/app/stores/miniTourLobbyStore';
import type { MiniTourLobby } from '@/app/stores/miniTourLobbyStore';
import { LobbyHeader } from "./components/LobbyHeader";
import { LobbyOverviewTab } from "./components/LobbyOverviewTab";
import { LobbyActionCard } from "./components/LobbyActionCard";
import { LobbyQuickStatsCard } from "./components/LobbyQuickStatsCard";
import { useLobbyActions } from "./hooks/useLobbyActions";
import { getThemeStyle } from "./utils";
import { useUserStore } from "@/app/stores/userStore";

interface LobbyDetailsClientProps {
  initialLobby: MiniTourLobby | null;
}

// Lazy load tab components
const LazyLobbyPlayersTab = lazy(() => import('./components/LobbyPlayersTab').then(mod => ({ default: mod.LobbyPlayersTab })));
const LazyLobbyMatchesTab = lazy(() => import('./components/LobbyMatchesTab').then(mod => ({ default: mod.LobbyMatchesTab })));
const LazyLobbyRulesTab = lazy(() => import('./components/LobbyRulesTab').then(mod => ({ default: mod.LobbyRulesTab })));

export function LobbyDetailsClient({ initialLobby }: LobbyDetailsClientProps) {
  const { lobby, isLoading, error, isProcessingAction, fetchLobby, joinLobby, startLobby, setLobby, syncAllUnsyncedMatches } = useMiniTourLobbyStore();
  const { currentUser, isLoading: userLoading } = useUserStore();
  const { id } = useParams();

  // Use setLobby only once on mount to set the initial state from props
  useEffect(() => {
    if (initialLobby) {
      setLobby(initialLobby);
    }
  }, [initialLobby, setLobby]);

  // Client-side fetch as a fallback
  useEffect(() => {
    if (id && !initialLobby && !lobby) { 
      fetchLobby(id as string);
    }
  }, [id, fetchLobby, initialLobby, lobby]);

  const userCoins = 1000; // Mock user coins

  const { mainButtonText, mainButtonDisabled, mainButtonAction, secondaryActions } = useLobbyActions({
    lobby,
    isCurrentUserParticipant: !!currentUser && (lobby?.participants || []).some(p => p.userId === currentUser.id),
    isLoading: isLoading || userLoading,
    isProcessingAction,
    userCoins,
    joinLobby,
    startLobby,
    syncAllUnsyncedMatches,
    currentUserId: currentUser?.id || '',
  });

  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading lobby and user data...</p>
      </div>
    );
  }

  if (!lobby) {
    return null; 
  }

  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/minitour">MiniTour</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{lobby.name}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <LobbyHeader lobby={lobby} getThemeStyle={getThemeStyle} />

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="matches">Recent Matches</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <LobbyOverviewTab lobby={lobby} />
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading Players...</div>}>
                <LazyLobbyPlayersTab lobby={lobby} />
              </Suspense>
            </TabsContent>

            <TabsContent value="matches" className="space-y-4">
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading Matches...</div>}>
                <LazyLobbyMatchesTab lobby={lobby} />
              </Suspense>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading Rules...</div>}>
                <LazyLobbyRulesTab lobby={lobby} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <LobbyActionCard
            lobby={lobby}
            userCoins={userCoins}
            mainButtonText={mainButtonText}
            mainButtonDisabled={mainButtonDisabled}
            mainButtonAction={mainButtonAction}
            isProcessingAction={isProcessingAction}
            secondaryActions={secondaryActions}
          />

          <LobbyQuickStatsCard lobby={lobby} />
        </div>
      </div>
    </div>
  );
} 