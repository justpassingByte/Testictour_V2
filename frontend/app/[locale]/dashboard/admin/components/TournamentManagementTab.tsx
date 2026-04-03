"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Shuffle,
  RefreshCw,
  FileSpreadsheet,
  MoreHorizontal,
  Users,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  PlayCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { ITournament } from "@/app/types/tournament"
import { formatCurrency, getTournamentStatusVariant } from "@/lib/utils"
import { toast } from '@/components/ui/use-toast';
import { TournamentService } from "@/app/services/TournamentService"
import { observer } from 'mobx-react-lite';
import { useTournamentStore } from "@/app/stores/tournamentStore"

const getCurrentRoundInfo = (tournament: ITournament): { current: number, total: number } => {
    if (!tournament.phases || tournament.phases.length === 0) return { current: 0, total: 0 };
    const total = tournament.phases.reduce((sum, phase) => sum + (phase.numberOfRounds || 0), 0);
    const currentPhase = tournament.phases.find(p => p.rounds.some(r => r.status === 'in_progress'));
    if (!currentPhase) {
        if (tournament.status === 'COMPLETED') return { current: total, total };
        return { current: 0, total };
    }
    const currentRound = currentPhase.rounds.find(r => r.status === 'in_progress');
    return { current: currentRound?.roundNumber || 1, total };
}

const calculatePrizePool = (registered: number, entryFee: number, hostFeePercent: number = 0.1) => {
    const totalCollected = registered * entryFee;
    const platformFee = Math.floor(totalCollected * hostFeePercent);
    return totalCollected - platformFee;
};

const TournamentManagementTab = observer(() => {
  const { tournaments, loading, fetchTournaments } = useTournamentStore();
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleSync = async (tournamentId: string) => {
    setSyncing(prev => ({ ...prev, [tournamentId]: true }));
    try {
      const response = await TournamentService.syncMatches(tournamentId);
      toast({
        title: "Sync Initiated",
        description: response.message,
        variant: "default",
      });
      setTimeout(() => fetchTournaments(), 5000);
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSyncing(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tournaments...</div>;
  }

  if (!tournaments || tournaments.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No tournaments found.</div>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament) => {
        const roundInfo = getCurrentRoundInfo(tournament);
        const prizePool = tournament.budget || calculatePrizePool(tournament.registered || 0, tournament.entryFee, tournament.hostFeePercent);
        
        return (
          <Card key={tournament.id} className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{tournament.name}</CardTitle>
                  <CardDescription>
                    <Badge variant={getTournamentStatusVariant(tournament.status)}>{tournament.status}</Badge>
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href={`/tournaments/${tournament.id}`} className="flex items-center w-full"><Eye className="mr-2 h-4 w-4" /> View Details</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href={`/dashboard/admin/tournaments/edit/${tournament.id}`} className="flex items-center w-full"><Edit className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span>Registration</span>
                    <span>{tournament.registered || 0} / {tournament.maxPlayers}</span>
                  </div>
                  <Progress value={((tournament.registered || 0) / tournament.maxPlayers) * 100} />
                </div>
                {tournament.status === 'in_progress' && (
                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span>Round</span>
                      <span>{roundInfo.current} / {roundInfo.total}</span>
                    </div>
                    <Progress value={(roundInfo.current / roundInfo.total) * 100} />
                  </div>
                )}
                <div className="text-sm">
                  <strong>Prize Pool:</strong> {formatCurrency(prizePool, 'VND')}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <p>Last synced: {tournament.lastSyncTime ? new Date(tournament.lastSyncTime).toLocaleString() : 'Never'}</p>
                </div>
                 {tournament.syncStatus && (
                   <p className="text-sm text-muted-foreground">
                     Sync Status: <Badge variant={getSyncStatusVariant(tournament.syncStatus)}>{tournament.syncStatus}</Badge>
                   </p>
                 )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" /> {tournament.registered || 0} participants
                </div>
                <div className="flex items-center space-x-2">
                  {tournament.status === 'in_progress' && (
                     <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync(tournament.id)}
                        disabled={syncing[tournament.id]}
                      >
                        {syncing[tournament.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Sync Matches
                      </Button>
                  )}
                  {tournament.status === 'COMPLETED' && (
                     <Button variant="outline" size="sm" asChild><Link href={`/tournaments/${tournament.id}/result`}><Eye className="mr-2 h-4 w-4" /> View Results</Link></Button>
                  )}
                  {tournament.status === 'UPCOMING' && (
                      <Button variant="default" size="sm"><PlayCircle className="mr-2 h-4 w-4" /> Start Now</Button>
                  )}
                </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
})

const getSyncStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toUpperCase()) {
    case 'SYNCING':
      return 'secondary';
    case 'SUCCESS':
      return 'default';
    case 'FAILED':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default TournamentManagementTab; 