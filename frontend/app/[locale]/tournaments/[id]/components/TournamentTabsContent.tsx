import React, { useState, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ITournament, IParticipant } from '@/app/types/tournament';
import { TournamentBracketTab } from "@/app/[locale]/tournaments/[id]/components/TournamentBracketTab";
import { TournamentPhasesTab } from "@/app/[locale]/tournaments/[id]/components/TournamentPhasesTab";
import { TournamentPlayersTab } from "@/app/[locale]/tournaments/[id]/components/TournamentPlayersTab";
import { TournamentRulesTab } from "@/app/[locale]/tournaments/[id]/components/TournamentRulesTab";
import { TournamentDetailsTab } from "@/app/[locale]/tournaments/[id]/components/TournamentDetailsTab";

interface TournamentTabsContentProps {
  tournament: ITournament;
  participants: IParticipant[];
  fetchMoreParticipants: (tournamentId: string, page?: number, limit?: number) => Promise<void>;
  loading: boolean;
}

export const TournamentTabsContent = memo(({
  tournament,
  participants,
  fetchMoreParticipants,
  loading,
}: TournamentTabsContentProps) => {
  const [activeTab, setActiveTab] = useState("phase");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-5 mb-4 bg-muted/30 p-1 rounded-xl">
        <TabsTrigger value="phase" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs sm:text-sm">Phases</TabsTrigger>
        <TabsTrigger value="bracket" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs sm:text-sm">Bracket</TabsTrigger>
        <TabsTrigger value="players" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs sm:text-sm">Participants</TabsTrigger>
        <TabsTrigger value="rules" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs sm:text-sm">Rules</TabsTrigger>
        <TabsTrigger value="details" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all text-xs sm:text-sm">Details</TabsTrigger>
      </TabsList>
      <TabsContent value="bracket" className="space-y-4">
        <TournamentBracketTab tournamentId={tournament.id} />
      </TabsContent>
      <TabsContent value="phase" className="space-y-4">
        {tournament.phases && tournament.phases.length > 0 ? (
          <TournamentPhasesTab phases={tournament.phases} />
        ) : (
          <p className="text-muted-foreground text-center">No phases available for this tournament.</p>
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