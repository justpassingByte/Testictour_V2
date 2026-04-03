import React, { useState, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ITournament, IParticipant } from '@/app/types/tournament';
import { TournamentRoundsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentRoundsTab";
import { TournamentPlayersTab } from "@/app/[locale]/tournaments/[id]/components/TournamentPlayersTab";
import { TournamentRulesTab } from "@/app/[locale]/tournaments/[id]/components/TournamentRulesTab";
import { TournamentDetailsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentDetailsTab";

interface TournamentTabsContentProps {
  tournament: ITournament;
  participants: IParticipant[];
  // rounds: IRound[]; // Change rounds to phases
  fetchMoreParticipants: (tournamentId: string, page?: number, limit?: number) => Promise<void>;
  loading: boolean;
}

export const TournamentTabsContent = memo(({
  tournament,
  participants,
  // rounds,
  fetchMoreParticipants,
  loading,
}: TournamentTabsContentProps) => {
  const [activeTab, setActiveTab] = useState("rounds");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="rounds">Rounds</TabsTrigger>
        <TabsTrigger value="players">Players</TabsTrigger>
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>
      <TabsContent value="rounds" className="space-y-4">
        {/* Pass tournament.phases instead of rounds */}
        {tournament.phases && tournament.phases.length > 0 ? (
          <TournamentRoundsTab tournamentId={tournament.id} phases={tournament.phases} />
        ) : (
          <p className="text-muted-foreground text-center">No rounds available for this tournament.</p>
        )}
      </TabsContent>
      <TabsContent value="players" className="space-y-4">
        {participants && participants.length > 0 ? (
          <TournamentPlayersTab
            participants={participants}
            actualParticipantsCount={tournament.registered || 0}
            fetchMoreParticipants={(page, limit) => fetchMoreParticipants(tournament.id, page, limit)}
            loading={loading}
          />
        ) : (
          <p className="text-muted-foreground text-center">No players registered yet.</p>
        )}
      </TabsContent>
      <TabsContent value="rules" className="space-y-4">
        <TournamentRulesTab />
      </TabsContent>
      <TabsContent value="details" className="space-y-4">
        <TournamentDetailsTab tournament={tournament} />
      </TabsContent>
    </Tabs>
  );
});

TournamentTabsContent.displayName = 'TournamentTabsContent'; 