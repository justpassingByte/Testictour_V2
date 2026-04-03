"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Eye, MoreHorizontal, Trash2, UserPlus } from "lucide-react"

import { useMiniTourLobbyStore, MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AssignPlayersDialog } from "./AssignPlayersDialog"
import { useState } from "react"
import MiniTourLobbyService from "@/app/services/MiniTourLobbyService"

export function LobbyActions({ lobby, onLobbiesUpdate }: { lobby: MiniTourLobby; onLobbiesUpdate?: (lobbies: MiniTourLobby[]) => void }) {
  const router = useRouter()
  const { deleteLobby, isProcessingAction } = useMiniTourLobbyStore()
  const [isAssignPlayersDialogOpen, setIsAssignPlayersDialogOpen] = useState(false)

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this lobby? This action cannot be undone.")) {
      try {
        await deleteLobby(lobby.id, router, onLobbiesUpdate)
      } catch (error) {
        console.error("Failed to delete lobby from component:", error)
      }
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isProcessingAction}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/partner/minitours/${lobby.id}`}>
              <Edit className="mr-2 h-4 w-4" /> View/Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsAssignPlayersDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Assign Players
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleDelete} disabled={isProcessingAction}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Lobby
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignPlayersDialog
        lobbyId={lobby.id}
        isOpen={isAssignPlayersDialogOpen}
        onOpenChange={setIsAssignPlayersDialogOpen}
        onSuccess={async () => {
          if (onLobbiesUpdate) {
            try {
              const updatedLobbies = await MiniTourLobbyService.getAllLobbies()
              onLobbiesUpdate(updatedLobbies)
            } catch (error) {
              console.error("Failed to refresh lobbies after assignment:", error)
            }
          }
        }}
      />
    </>
  )
}