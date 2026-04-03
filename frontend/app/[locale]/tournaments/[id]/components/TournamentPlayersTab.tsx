import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IParticipant } from "@/app/types/tournament"
import { Users, CircleUser, Loader2 } from "lucide-react"

import { useState } from "react"

interface TournamentPlayersTabProps {
  participants: IParticipant[];
  actualParticipantsCount?: number;
  fetchMoreParticipants: (page: number, limit: number) => void;
  loading: boolean;
}

export function TournamentPlayersTab({ participants, actualParticipantsCount, fetchMoreParticipants, loading }: TournamentPlayersTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 10; // This should match the backend's default limit

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchMoreParticipants(nextPage, playersPerPage);
  };

  const hasMorePlayers = actualParticipantsCount ? participants.length < actualParticipantsCount : true;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Users className="mr-2 h-5 w-5 text-primary" />
          Registered Players ({participants.length} {actualParticipantsCount !== undefined ? `of ${actualParticipantsCount}` : ''})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants && participants.length > 0 ? (
          <div className="grid gap-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CircleUser className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{participant.user?.username || participant.inGameName}</div>
                    <div className="text-sm text-muted-foreground">
                      {participant.gameSpecificId} ({participant.region})
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </div>
            ))}
            {hasMorePlayers && (
              <div className="flex justify-center mt-4">
                <Button onClick={handleLoadMore} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center">No players registered yet.</p>
        )}
      </CardContent>
    </Card>
  )
} 