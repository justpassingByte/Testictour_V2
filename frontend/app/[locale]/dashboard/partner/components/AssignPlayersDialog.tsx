"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Player } from "@/app/stores/miniTourLobbyStore" // Assuming Player type is here
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { usePlayerStore } from "@/app/stores/playerStore" // Import usePlayerStore
import { toast } from "@/components/ui/use-toast"
import { Loader2, UserPlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


interface AssignPlayersDialogProps {
  lobbyId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void // New: Callback to refresh data
}

export function AssignPlayersDialog({ lobbyId, isOpen, onOpenChange, onSuccess }: AssignPlayersDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]) // Store player IDs
  const { assignPlayerToLobby, isProcessingAction } = useMiniTourLobbyStore()
  const { allPlayers, fetchPartnerPlayers, isLoading: loadingPlayers } = usePlayerStore()

  useEffect(() => {
    // Fetch all players only once when dialog opens
    if (isOpen) {
      fetchPartnerPlayers() // Use the new partner-specific fetch
    }
  }, [isOpen, fetchPartnerPlayers])

  const handleCheckboxChange = (playerId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlayers((prev) => [...prev, playerId])
    } else {
      setSelectedPlayers((prev) => prev.filter((id) => id !== playerId))
    }
  }

  const handleAssignPlayers = async () => {
    if (selectedPlayers.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one player to assign.",
        variant: "destructive",
      })
      return
    }

    let successCount = 0
    let failCount = 0

    for (const playerId of selectedPlayers) {
      try {
        await assignPlayerToLobby(lobbyId, playerId)
        successCount++
      } catch (error) {
        console.error(`Failed to assign player ${playerId}:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      toast({
        title: "Assignment Complete",
        description: `Successfully assigned ${successCount} player(s).`,
      })
    }
    if (failCount > 0) {
      toast({
        title: "Assignment Errors",
        description: `Failed to assign ${failCount} player(s). Check console for details.`,
        variant: "destructive",
      })
    }

    if (successCount > 0 && onSuccess) {
      onSuccess() // Refresh parent data
    }

    onOpenChange(false) // Close dialog after attempting assignment
    setSelectedPlayers([]) // Clear selection
  }

  // Filter allPlayers from the store based on the search term
  const filteredAvailablePlayers = allPlayers.filter(player =>
    player.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Players to Lobby</DialogTitle>
          <DialogDescription>
            Search for players and select them to assign to this lobby.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="Search players by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {loadingPlayers ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-64 border rounded-md">
              {filteredAvailablePlayers.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground">No players found.</p>
              ) : (
                filteredAvailablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${player.username}`} alt="Avatar" />
                        <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{player.username}</p>
                        <p className="text-sm text-muted-foreground">{player.email}</p>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange(player.id, checked)}
                    />
                  </div>
                ))
              )}
            </ScrollArea>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssignPlayers} disabled={selectedPlayers.length === 0 || isProcessingAction}>
            {isProcessingAction ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Assign ({selectedPlayers.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 