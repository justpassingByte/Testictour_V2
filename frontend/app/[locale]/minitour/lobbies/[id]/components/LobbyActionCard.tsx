"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Coins, Loader2 } from "lucide-react"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import type { SecondaryAction } from "../hooks/useLobbyActions";

interface LobbyActionCardProps {
  lobby: MiniTourLobby
  userCoins: number
  mainButtonText: string
  mainButtonDisabled: boolean
  mainButtonAction: (() => Promise<void>) | undefined
  isProcessingAction: boolean
  secondaryActions?: SecondaryAction[]
}

export function LobbyActionCard({
  lobby,
  userCoins,
  mainButtonText,
  mainButtonDisabled,
  mainButtonAction,
  isProcessingAction,
  secondaryActions = [],
}: LobbyActionCardProps) {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">
              {lobby.currentPlayers}/{lobby.maxPlayers}
            </div>
            <div className="text-sm text-muted-foreground">Players</div>
            <Progress value={(lobby.currentPlayers / lobby.maxPlayers) * 100} className="mt-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Entry Fee:</span>
              <span className="font-medium">
                <Coins className="inline h-4 w-4 mr-1" />
                {lobby.entryFee}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Prize Pool:</span>
              <span className="font-bold">
                <Coins className="inline h-4 w-4 mr-1" />
                {lobby.prizePool}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Your Coins:</span>
              <span className="font-bold">
                <Coins className="inline h-4 w-4 mr-1" />
                {userCoins}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={mainButtonDisabled || isProcessingAction}
            onClick={mainButtonAction || undefined}
            size="lg"
          >
            {isProcessingAction ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mainButtonText === "Join Lobby" ? "Joining..." : "Processing..."}
              </>
            ) : (
              mainButtonText
            )}
          </Button>

          {secondaryActions.length > 0 && (
            <div className="pt-4 mt-4 border-t border-primary/20 space-y-2">
              <h4 className="text-sm font-semibold text-center text-muted-foreground mb-3">Lobby Actions</h4>
              {secondaryActions.map(action => (
                <Button
                  key={action.id}
                  className="w-full"
                  variant={action.variant || "secondary"}
                  disabled={action.disabled || action.isLoading}
                  onClick={action.action}
                >
                  {action.isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 