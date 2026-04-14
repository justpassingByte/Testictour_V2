import React, { useState, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslations } from "next-intl"

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
  const t = useTranslations("common");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="border-b border-white/10 mb-6 w-full">
        <TabsList className="w-full justify-start h-auto bg-transparent p-0 flex overflow-x-auto gap-6">
          <TabsTrigger 
            value="phase" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all shadow-none hover:text-primary/80 text-muted-foreground data-[state=active]:shadow-none"
          >
            {t("phases")}
          </TabsTrigger>
          <TabsTrigger 
            value="bracket" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all shadow-none hover:text-primary/80 text-muted-foreground data-[state=active]:shadow-none"
          >
            {t("bracket")}
          </TabsTrigger>
          <TabsTrigger 
            value="players" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all shadow-none hover:text-primary/80 text-muted-foreground data-[state=active]:shadow-none"
          >
            {t("participants")}
          </TabsTrigger>
          <TabsTrigger 
            value="rules" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all shadow-none hover:text-primary/80 text-muted-foreground data-[state=active]:shadow-none"
          >
            {t("rules")}
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all shadow-none hover:text-primary/80 text-muted-foreground data-[state=active]:shadow-none"
          >
            {t("details")}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="bracket" className="space-y-4">
        <TournamentBracketTab tournamentId={tournament.id} />
      </TabsContent>
      <TabsContent value="phase" className="space-y-4">
        {tournament.phases && tournament.phases.length > 0 ? (
          <TournamentPhasesTab phases={tournament.phases} />
        ) : (
          <p className="text-muted-foreground text-center">{t("no_phases_available")}</p>
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
          <p className="text-muted-foreground text-center">{t("no_players_registered")}</p>
        )}
      </TabsContent>
      <TabsContent value="rules" className="space-y-4">
        <TournamentRulesTab tournament={tournament} />
      </TabsContent>
      <TabsContent value="details" className="space-y-4">
        <TournamentDetailsTab tournament={tournament} />
      </TabsContent>
    </Tabs>
  );
});

TournamentTabsContent.displayName = 'TournamentTabsContent';