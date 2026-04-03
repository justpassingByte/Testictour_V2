"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { Medal } from "lucide-react"

interface PointSystemCardProps {
  tournament: ITournament;
}

export function PointSystemCard({ tournament }: PointSystemCardProps) {
  let targetPhase: ITournament['phases'][0] | undefined;
  let showPhaseTitle = false;

  // If tournament is in progress, find the active phase with points
  if (tournament.status === 'in_progress') {
    targetPhase = tournament.phases.find(p => p.status === 'in_progress' && Array.isArray(p.pointsMapping) && p.pointsMapping.length > 0);
    if (targetPhase) {
      showPhaseTitle = true;
    }
  }

  // If no active phase was found (i.e., tournament is pending or completed)
  // find the first phase that has a point system to show as a default.
  if (!targetPhase) {
    const sortedPhases = [...tournament.phases].sort((a, b) => a.phaseNumber - b.phaseNumber);
    targetPhase = sortedPhases.find(p => Array.isArray(p.pointsMapping) && p.pointsMapping.length > 0);
  }

  // If no relevant phase is found, render nothing.
  if (!targetPhase) {
    return null;
  }
  
  // Now TypeScript knows targetPhase exists, but let's be explicit about its points for the renderer
  const { pointsMapping, name } = targetPhase;

  // Final check to ensure pointsMapping is a valid array for TypeScript
  if (!Array.isArray(pointsMapping) || pointsMapping.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Medal className="mr-2 h-5 w-5 text-primary" />
          Point System
        </CardTitle>
      </CardHeader>
      <CardContent>
          <div>
            {showPhaseTitle && <h4 className="font-semibold text-md mb-2">{name}</h4>}
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 text-center">
              {pointsMapping.map((points: number, index: number) => {
                const position = index + 1;
                return (
                  <div key={position} className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center mb-1 font-bold
                        ${index === 0 ? "bg-yellow-400/20 text-yellow-500" : ""}
                        ${index === 1 ? "bg-gray-400/20 text-gray-500" : ""}
                        ${index === 2 ? "bg-amber-600/20 text-amber-700" : ""}
                        ${index > 2 ? "bg-secondary text-secondary-foreground" : ""}
                      `}
                    >
                      {position}
                    </div>
                    <div className="font-bold text-sm">{points} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
      </CardContent>
    </Card>
  )
}