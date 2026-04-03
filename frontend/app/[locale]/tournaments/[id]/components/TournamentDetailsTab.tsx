import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, DollarSign, Wallet, Globe, Users, ScrollText } from "lucide-react"
import { ITournament } from '@/app/types/tournament';

interface TournamentDetailsTabProps {
  tournament: ITournament;
}

export const TournamentDetailsTab: React.FC<TournamentDetailsTabProps> = ({ tournament }) => {
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

  return (
    <div className="space-y-4">
      {/* Financial Information and Tournament Organization */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            Tournament Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Financial Information */}
          <div className="space-y-2">
            <h4 className="font-bold">Financial Information</h4>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Registration Fee:</span>
              <span className="ml-auto font-medium">{formatCurrency(tournament.entryFee)}</span>
            </div>
            <div className="flex items-center">
              <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Budget:</span>
              <span className="ml-auto font-medium">{formatCurrency(tournament.entryFee * (tournament.registered || 0)*(1-(tournament.hostFeePercent || 0)))}</span>
            </div>
          </div>

          {/* Tournament Organization */}
          <div className="space-y-2">
            <h4 className="font-bold">Tournament Organization</h4>
            <div className="flex items-center">
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Region:</span>
              <span className="ml-auto font-medium">{tournament.region || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Max Players:</span>
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
            Prize Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {prizeRanks.map(rank => {
            const totalPrizePool = tournament.entryFee * (tournament.registered || 0) * (1 - (tournament.hostFeePercent || 0));
            const prizePercentage = tournament.prizeStructure?.[rank];
            const prizeAmount = prizePercentage !== undefined ? totalPrizePool * prizePercentage : undefined;

            if (prizeAmount === undefined) return null;

            return (
              <Card key={rank} className="flex flex-col items-center justify-center p-4 border shadow-sm bg-muted/40">
                <span className="text-lg font-bold text-yellow-500">{rankSuffix(rank)}</span>
                <span className="text-md font-medium text-muted-foreground">{formatCurrency(prizeAmount)}</span>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ScrollText className="mr-2 h-5 w-5 text-primary" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="mb-2">This tournament is part of the official TFT Championship Series. The top 4 players will qualify for the Global Finals taking place next month.</p>
          <h4 className="font-bold mt-4 mb-2">General Tournament Rules:</h4>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>All participants must register before the registration deadline.</li>
            <li>Players must use the same Riot account throughout the tournament.</li>
            <li>In case of a tie, the player with the highest number of first-place finishes wins.</li>
            <li>Any form of cheating or unsportsmanlike conduct will result in disqualification.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}; 