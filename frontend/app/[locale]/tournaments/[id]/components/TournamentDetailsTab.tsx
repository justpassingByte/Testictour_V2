import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl";
import { Info, DollarSign, Wallet, Globe, Users, ScrollText, ShieldCheck } from "lucide-react"
import { ITournament } from '@/app/types/tournament';

interface TournamentDetailsTabProps {
  tournament: ITournament;
}

export const TournamentDetailsTab: React.FC<TournamentDetailsTabProps> = ({ tournament }) => {
  const t = useTranslations("common");  

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const prizeRanks = ['1', '2', '3', '4'];
  const rankSuffix = (rank: string) => {
    const num = parseInt(rank);
    if (isNaN(num)) return rank;
    if (num % 10 === 1 && num % 100 !== 11) return `${num}st`;
    if (num % 10 === 2 && num % 100 !== 12) return `${num}nd`;
    if (num % 10 === 3 && num % 100 !== 13) return `${num}rd`;
    return `${num}th`;
  };

  const isEscrow = !tournament.isCommunityMode;

  return (
    <div className="space-y-4">
      {/* Financial Information and Tournament Organization */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            {t("tournament_details")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Financial Information */}
          <div className="space-y-2">
            <h4 className="font-bold">{t("financial_information")}</h4>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("registration_fee")}:</span>
              <span className="ml-auto font-medium">{formatCurrency(tournament.entryFee)}</span>
            </div>
            <div className="flex items-center">
              <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("budget")}:</span>
              <span className="ml-auto font-medium">{formatCurrency(tournament.budget || 0)}</span>
            </div>
          </div>

          {/* Tournament Organization */}
          <div className="space-y-2">
            <h4 className="font-bold">{t("tournament_organization")}</h4>
            <div className="flex items-center">
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("region")}:</span>
              <span className="ml-auto font-medium">{tournament.region || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("max_players")}:</span>
              <span className="ml-auto font-medium">{tournament.maxPlayers}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prize Distribution */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-primary" />
            {t("prize_distribution")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {prizeRanks.map(rank => {
            const totalPrizePool = tournament.budget || 0;
            const isArray = Array.isArray(tournament.prizeStructure);
            const prizePercentage = isArray 
              ? tournament.prizeStructure[parseInt(rank) - 1] 
              : tournament.prizeStructure?.[rank];
            
            if (prizePercentage === undefined) return null;

            const normalizedPercentage = prizePercentage > 1 ? prizePercentage / 100 : prizePercentage;
            const prizeAmount = totalPrizePool * normalizedPercentage;

            return (
              <Card key={rank} className="flex flex-col items-center justify-center p-4 border shadow-sm bg-muted/40">
                <span className="text-lg font-bold text-yellow-500">{rankSuffix(rank)}</span>
                <span className="text-md font-medium text-muted-foreground">{formatCurrency(prizeAmount)}</span>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Escrow and Additional Information */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
            {isEscrow ? t("escrow_title") : t("community_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-4">
          <div className={`p-4 rounded-lg border ${isEscrow ? 'bg-green-500/5 border-green-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
            <p className="font-medium mb-1">{isEscrow ? t("escrow_title") : t("community_title")}</p>
            <p className="text-muted-foreground">{isEscrow ? t("escrow_desc") : t("community_desc")}</p>
            {isEscrow && tournament.escrowRequiredAmount && (
                <p className="mt-2 font-bold text-green-600 dark:text-green-400">
                  {t("guaranteed_pool")}: {formatCurrency(tournament.escrowRequiredAmount)}
                </p>
            )}
          </div>
          
          {tournament.description && (
            <div>
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <ScrollText className="h-4 w-4 text-primary" />
                {t("additional_information")}
              </h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 