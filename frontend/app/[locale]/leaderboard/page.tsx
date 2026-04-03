import { Suspense } from "react"
import { getTranslations } from 'next-intl/server';

export const metadata = {
  title: "Global Leaderboard - TesTicTour",
  description: "View the top TFT players ranked by tournament performance across all regions.",
}

// Import this dynamically to avoid server/client mismatch
import LeaderboardClient from "./components/LeaderboardClient"

export default async function LeaderboardPage() {
  const t = await getTranslations('common');
  
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardClient />
    </Suspense>
  )
}

// Simple skeleton loader for the leaderboard
function LeaderboardSkeleton() {
  return (
    <div className="container py-10 space-y-8">
      <div className="h-10 w-48 bg-muted rounded mb-2"></div>
      <div className="h-5 w-96 bg-muted rounded-md mb-8"></div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-muted"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-7 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="h-10 bg-muted rounded w-full max-w-md"></div>
          <div className="flex gap-2">
            <div className="h-10 w-28 bg-muted rounded"></div>
            <div className="h-10 w-28 bg-muted rounded"></div>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="h-12 bg-muted/50"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-t bg-muted/20"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
