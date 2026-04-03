"use client"

import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore";
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore"
import { type ButtonProps } from "@/components/ui/button";

interface UseLobbyActionsProps {
  lobby: MiniTourLobby | null
  isCurrentUserParticipant: boolean
  isLoading: boolean
  isProcessingAction: boolean
  userCoins: number
  joinLobby: (lobbyId: string, userId: string) => Promise<void>
  startLobby: (lobbyId: string) => Promise<void>
  syncAllUnsyncedMatches: () => Promise<void>
  currentUserId: string;
}

export interface SecondaryAction {
  id: string;
  label: string;
  action: () => Promise<void>;
  disabled: boolean;
  isLoading: boolean;
  variant?: ButtonProps["variant"];
}

interface LobbyAction {
  mainButtonText: string;
  mainButtonDisabled: boolean;
  mainButtonAction: (() => Promise<void>) | undefined;
  secondaryActions: SecondaryAction[];
}

export function useLobbyActions({
  lobby,
  isCurrentUserParticipant,
  isLoading,
  isProcessingAction,
  userCoins,
  joinLobby,
  startLobby,
  syncAllUnsyncedMatches,
  currentUserId,
}: UseLobbyActionsProps): LobbyAction {
  const { leaveLobby } = useMiniTourLobbyStore();
  
  if (!lobby || isLoading) {
    return { mainButtonText: 'Loading...', mainButtonDisabled: true, mainButtonAction: undefined, secondaryActions: [] }
  }

  const { status, entryFee, currentPlayers, maxPlayers } = lobby
  const isLobbyFull = currentPlayers >= maxPlayers

  let mainButtonText = '';
  let mainButtonDisabled = false;
  let mainButtonAction: (() => Promise<void>) | undefined = undefined;
  const secondaryActions: SecondaryAction[] = [];

  if (status === 'IN_PROGRESS') {
    mainButtonText = 'View Current Match';
    mainButtonDisabled = false;
    mainButtonAction = undefined; // No main action, just view
    secondaryActions.push({
      id: 'sync-all-matches',
      label: 'Sync All Matches',
      action: syncAllUnsyncedMatches,
      disabled: isProcessingAction,
      isLoading: isProcessingAction,
    });
  } else if (status === 'COMPLETED') {
    mainButtonText = 'View Final Result';
    mainButtonDisabled = false;
    mainButtonAction = async () => {
      // TODO: Match result tab
    };
  } else if (status === 'CANCELLED') {
    mainButtonText = 'Lobby Cancelled';
    mainButtonDisabled = true;
    mainButtonAction = undefined;
  } else if (isCurrentUserParticipant) {
    mainButtonText = 'Already Joined';
    mainButtonDisabled = true;
    mainButtonAction = undefined;

    if (status === 'WAITING') {
      secondaryActions.push({
        id: 'leave-lobby',
        label: 'Leave Lobby',
        action: () => leaveLobby(lobby.id),
        disabled: isProcessingAction,
        isLoading: isProcessingAction,
        variant: 'destructive',
      });
    }
  } else if (isLobbyFull) {
    mainButtonText = 'Lobby is Full';
    mainButtonDisabled = true;
    mainButtonAction = undefined;
  } else if (userCoins < entryFee) {
    mainButtonText = 'Not Enough Coins';
    mainButtonDisabled = true;
    mainButtonAction = undefined;
  } else {
    mainButtonText = 'Join Lobby';
    mainButtonAction = () => joinLobby(lobby.id, currentUserId); // Use actual user ID
    mainButtonDisabled = isProcessingAction;
  }

  // Add Start Lobby button for any participant if lobby is waiting
  if (status === 'WAITING' && isCurrentUserParticipant) {
    secondaryActions.unshift({ // Add to the beginning of the array
      id: 'start-lobby',
      label: 'Start Lobby',
      action: () => startLobby(lobby.id),
      disabled: isProcessingAction,
      isLoading: isProcessingAction,
      variant: "default",
    });
  }

  return {
    mainButtonText,
    mainButtonDisabled,
    mainButtonAction,
    secondaryActions,
  };
} 