"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyRulesTabProps {
  lobby: MiniTourLobby
}

export function LobbyRulesTab({ lobby }: LobbyRulesTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Lobby Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lobby.rules.length > 0 ? (
            lobby.rules.map((rule, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm">{rule}</p>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No specific rules defined for this lobby.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 