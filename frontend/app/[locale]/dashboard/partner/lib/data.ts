import { cache } from "react"

import serverApi from "@/app/lib/serverApiConfig"
import { MiniTourLobby, PartnerData, AnalyticsData } from "@/app/stores/miniTourLobbyStore"

// Data Fetching Functions (Server-side)
export const getPartnerData = cache(async (): Promise<PartnerData | null> => {
  try {
    const response = await serverApi.get("/partner/public/summary")
    return response.data.data
  } catch (error) {
    console.error("Failed to fetch partner data:", error)
    return null
  }
})

export const getPartnerLobbies = cache(async (): Promise<MiniTourLobby[]> => {
  try {
    const response = await serverApi.get("/minitour-lobbies")
    return response.data.data
  } catch (error) {
    console.error("Failed to fetch partner lobbies:", error)
    return []
  }
})

export const getAnalyticsData = cache(async (): Promise<AnalyticsData | null> => {
  try {
    const response = await serverApi.get("/partner/public/analytics")
    return response.data.data
  } catch (error) {
    console.error("Failed to fetch analytics data:", error)
    return null
  }
})

export const getPartnerPlayers = cache(async () => {
  try {
    const response = await serverApi.get("/partner/public/players")
    return response.data.data
  } catch (error) {
    console.error("Failed to fetch partner players:", error)
    return []
  }
})