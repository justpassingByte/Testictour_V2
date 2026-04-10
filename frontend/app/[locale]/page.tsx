import { getTranslations } from 'next-intl/server';
import HomePageClient from './components/HomePageClient';
import { TournamentService } from "@/app/services/TournamentService"
import { ITournament } from "@/app/types/tournament"
import api from "@/app/lib/apiConfig"
import { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

export const metadata = {
  title: "TesTicTour - Tournament Platform for TFT Players",
  description: "Join TFT tournaments, compete with players worldwide, and win prizes. The ultimate tournament platform for TFT enthusiasts.",
}

export const revalidate = 60; // Cache the page for 60 seconds (ISR) to fix fetching delay

// Server-side data fetching directly using fetch to utilize Next.js Data Cache
async function getTournaments() {
  try {
    const isServer = typeof window === 'undefined';
    const baseURL = isServer 
      ? (process.env.INTERNAL_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api'))
      : (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api');

    const res = await fetch(`${baseURL}/tournaments`, { 
      next: { revalidate: 60 } // Aggressive cache for 60 seconds
    });
    const data = await res.json();
    return data.tournaments || [];
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return []
  }
}

async function getMiniTourLobbies(): Promise<MiniTourLobby[]> {
  try {
    const isServer = typeof window === 'undefined';
    const baseURL = isServer 
      ? (process.env.INTERNAL_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api'))
      : (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api');

    const res = await fetch(`${baseURL}/minitour-lobbies`, {
      next: { revalidate: 60 } // Aggressive cache for 60 seconds
    });
    const data = await res.json();
    if (data && data.success) {
      return data.data;
    }
    return []
  } catch (error) {
    console.error("Error fetching MiniTour lobbies:", error)
    return []
  }
}

export default async function HomePage() {
  const t = await getTranslations('common');
  const [tournaments, lobbies] = await Promise.all([
    getTournaments(),
    getMiniTourLobbies(),
  ]);

  return (
    <HomePageClient tournaments={tournaments} lobbies={lobbies} />
  )
}
