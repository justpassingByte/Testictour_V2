import { cache } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getTranslations } from 'next-intl/server';

import { Button } from "@/components/ui/button"
import { SyncStatus } from "@/components/sync-status"
import api from "@/app/lib/apiConfig"
import { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { LobbyList } from "./components/LobbyList"

export const metadata = {
  title: "MiniTour - Join Custom Lobbies, Compete for Prizes",
  description:
    "Explore and join custom MiniTour lobbies, compete with other players, earn coins, and win prizes. High-stakes and casual games available.",
}

const getLobbies = cache(async (): Promise<MiniTourLobby[]> => {
  try {
    const response = await api.get("/minitour-lobbies")
    if (response.data && response.data.success) {
      return response.data.data
    }
    return []
  } catch (error) {
    console.error("Failed to fetch lobbies:", error)
    return []
  }
})

export default async function MiniTourPage() {
  const lobbies = await getLobbies()
  const t = await getTranslations('common');

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">MiniTour</h1>
          <p className="text-muted-foreground">
            {t('minitour_description', {
              defaultValue: 'Join custom lobbies created by our community partners. Earn coins, climb leaderboards, and compete for prizes.'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/minitour/partner/apply">
              <Plus className="mr-2 h-4 w-4" />
              {t('become_partner', {
                defaultValue: 'Become a Partner'
              })}
            </Link>
          </Button>
          <SyncStatus status="live" />
        </div>
      </div>
      <LobbyList initialLobbies={lobbies} />
    </div>
  )
}
