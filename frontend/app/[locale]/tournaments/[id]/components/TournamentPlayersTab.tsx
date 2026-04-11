import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IParticipant } from "@/app/types/tournament"
import { Users, Loader2, Trophy, Target, Gamepad2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { PlayerService, PlayerStats } from "@/app/services/PlayerService"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TournamentPlayersTabProps {
  participants: IParticipant[];
  actualParticipantsCount?: number;
  fetchMoreParticipants: (page: number, limit: number) => void;
  loading: boolean;
}

function ParticipantRow({ participant, index }: { participant: IParticipant, index: number }) {
  const name = participant.user?.riotGameName || participant.user?.username || participant.inGameName;
  const tag = participant.user?.riotGameTag || participant.gameSpecificId;
  const rank = participant.rank || "UNRANKED";

  return (
    <TableRow className="group hover:bg-muted/30 transition-colors">
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="w-6 text-center text-muted-foreground font-semibold">#{index + 1}</div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-primary/90 group-hover:text-primary transition-colors">{name}</span>
            <span className="text-[10px] text-muted-foreground">#{tag} ({(participant.region || 'VN').toUpperCase()})</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="uppercase text-[10px] bg-primary/5 text-primary border-primary/20">
          {rank}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/players/${participant.userId || participant.user?.id || ''}`}>
          <Button variant="ghost" size="sm" className="opacity-70 group-hover:opacity-100 group-hover:bg-primary/20 group-hover:text-primary transition-all">
            Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

export function TournamentPlayersTab({ participants, actualParticipantsCount, fetchMoreParticipants, loading }: TournamentPlayersTabProps) {
  const [localPage, setLocalPage] = useState(1);
  const playersPerPage = 10;

  const visibleParticipants = participants.slice(0, localPage * playersPerPage);

  const handleLoadMore = () => {
    const nextPage = localPage + 1;
    setLocalPage(nextPage);
    
    // Only fetch more from server if we are about to exhaust the locally available participants
    if (nextPage * playersPerPage > participants.length && (!actualParticipantsCount || participants.length < actualParticipantsCount)) {
      fetchMoreParticipants(nextPage, playersPerPage);
    }
  };

  const hasMorePlayers = actualParticipantsCount 
    ? visibleParticipants.length < actualParticipantsCount
    : visibleParticipants.length < participants.length;

  return (
    <Card className="border shadow-sm bg-card/60 dark:bg-card/40 backdrop-blur-lg border-white/10">
      <CardHeader className="bg-muted/20 border-b border-white/5 py-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            Registered Participants
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {participants.length} {actualParticipantsCount !== undefined ? `/ ${actualParticipantsCount}` : ''} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {participants && participants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10">
                    <TableHead className="w-[300px]">Player</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleParticipants.map((participant, index) => (
                    <ParticipantRow key={participant.id} participant={participant} index={index} />
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {hasMorePlayers && (
              <div className="flex justify-center p-6 border-t border-white/5">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={loading}
                  variant="outline"
                  className="rounded-full px-8 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all font-semibold"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  ) : null}
                  Load More Participants
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">No participants registered yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}