import { Suspense } from "react"
import { getTranslations } from 'next-intl/server';

export const metadata = {
  title: "Loyalty & Quests - TesTicTour",
  description: "Complete quests, earn coins, unlock achievements, and climb the loyalty tiers to get exclusive rewards.",
}

import LoyaltyClient from "./components/LoyaltyClient"

export default async function LoyaltyPage() {
  const t = await getTranslations('common');
  
  return (
    <Suspense fallback={<LoyaltySkeleton />}>
      <LoyaltyClient />
    </Suspense>
  )
}

function LoyaltySkeleton() {
  return (
    <div className="container py-10 space-y-8">
      <div className="h-10 w-48 bg-muted rounded mb-2"></div>
      <div className="h-5 w-96 bg-muted rounded-md mb-8"></div>
      
      {/* Tier banner skeleton */}
      <div className="h-40 bg-muted rounded-xl animate-pulse"></div>
      
      {/* Quest cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-muted"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-3 bg-muted rounded w-full mb-2"></div>
            <div className="h-10 bg-muted rounded w-full mt-4"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
