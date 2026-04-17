"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for TournamentBracketTab.
 * Mimics: phase header + group tabs + lobby card grid.
 */
export function BracketTabSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Phase header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-1 rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Group selector tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-xl" />
        ))}
      </div>

      {/* Group header banner */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Lobby card grid (4 cards) */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/10 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-14 rounded-full" />
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-muted/20">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for TournamentRecentResultsTab.
 * Mimics: podium section + leaderboard table rows.
 */
export function LeaderboardTabSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Podium */}
      <Card className="bg-card/40 backdrop-blur-xl border-white/10 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-8 pt-6 pb-2">
            {/* 2nd, 1st, 3rd podium blocks */}
            {[{ h: "h-20", order: "order-1" }, { h: "h-28", order: "order-2" }, { h: "h-16", order: "order-3" }].map((p, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 ${p.order}`}>
                <div className="text-center space-y-1">
                  <Skeleton className="h-3 w-16 mx-auto" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                </div>
                <Skeleton className={`w-28 ${p.h} rounded-t-2xl`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card className="border shadow-2xl bg-card/40 backdrop-blur-xl border-white/10 overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-white/5 py-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex gap-4 px-4 py-3 bg-white/5 border-b border-white/5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/5" style={{ animationDelay: `${i * 50}ms` }}>
              <Skeleton className="h-5 w-8" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-12" />
                </div>
              </div>
              <Skeleton className="h-4 w-12 rounded-full ml-auto" />
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-4 rounded-sm" />
                ))}
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for TournamentStatisticsTab.
 * Mimics: summary cards + chart areas.
 */
export function StatisticsTabSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card/40 backdrop-blur-md border border-primary/10">
            <CardContent className="p-4 pt-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-card/40 backdrop-blur-md border border-white/5">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-64 mb-6" />
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-md border border-white/5 lg:col-span-2">
          <CardHeader className="bg-black/20 pb-4 border-b border-primary/10">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="h-[340px] w-full pt-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur-md border border-white/5">
          <CardHeader className="bg-muted/10 pb-4 border-b border-emerald-500/10">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="h-[340px] w-full p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-1.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2 w-12" />
                </div>
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
