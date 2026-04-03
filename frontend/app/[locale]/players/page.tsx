import { Suspense } from "react"
import { getTranslations } from 'next-intl/server';
import PlayersClient from './components/PlayersClient';

export const metadata = {
  title: "Players - TesTicTour",
  description: "Discover top TFT players, view their statistics, and track their tournament performance.",
}

export default async function PlayersPage() {
  const t = await getTranslations('common');
  
  return (
    <Suspense fallback={<PlayersSkeleton />}>
      <PlayersClient />
    </Suspense>
  )
}

// Simple skeleton loader for the players page
function PlayersSkeleton() {
  return (
    <div className="container py-10 space-y-8">
      <div className="h-10 w-48 bg-muted rounded mb-2"></div>
      <div className="h-5 w-96 bg-muted rounded-md mb-8"></div>
      
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded mb-2"></div>
        <div className="h-5 w-72 bg-muted rounded-md mb-4"></div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-muted"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-10 bg-muted rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
