import { getTranslations } from 'next-intl/server';
import TournamentsClientPage from "./components/TournamentsClientPage"

export const metadata = {
  title: "Tournaments - TesTicTour",
  description: "Browse and join TFT tournaments, compete with players worldwide, and win prizes.",
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

export default async function TournamentsPage() {
  const t = await getTranslations('common');
  const tournaments = await getTournaments();
  
  return (
    <TournamentsClientPage initialTournaments={tournaments} />
  )
}
