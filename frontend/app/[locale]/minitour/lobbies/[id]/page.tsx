// No "use client" here, this will be a Server Component
export const metadata = {
  title: "MiniTour - Join Custom Lobbies, Compete for Prizes",
  description: "Explore and join custom MiniTour lobbies, compete with other players, earn coins, and win prizes. High-stakes and casual games available.",
};
import { cache } from "react"
import { notFound } from "next/navigation";
import type { MiniTourLobby } from '@/stores/miniTourLobbyStore'; // Still need type for initialLobby
import { LobbyDetailsClient } from "./LobbyDetailsClient";

import api from '@/app/lib/apiConfig'; // Import api for server-side fetching

interface LobbyDetailsPageProps {
  params: { id: string };
}

const getLobbyDetails = cache(async (id: string): Promise<MiniTourLobby | null> => {
  try {
    const response = await api.get<{ success: boolean; data: MiniTourLobby }>(`/minitour-lobbies/${id}`)
    return response.data.data
  } catch (error) {
    console.error(`Failed to fetch lobby ${id}:`, error)
    return null
  }
})

export default async function LobbyDetailsPage({ params }: LobbyDetailsPageProps) {
  const { id } = params;
  let error: string | null = null;

  const lobby = await getLobbyDetails(id)

  if (!lobby) {
    // If lobby is still null after fetching, it means not found
    notFound() // Next.js built-in notFound function
  }

  // Render the client component with the initial server-fetched lobby data
  return <LobbyDetailsClient initialLobby={lobby} />;
}
