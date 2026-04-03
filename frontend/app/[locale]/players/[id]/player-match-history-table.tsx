"use client";

import { useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchDetailsModal } from "./match-details-modal";

interface PlayerMatchDisplay {
  id: string;
  tournamentId: string;
  tournamentName: string;
  roundNumber: number;
  matchId: string;
  placement: number;
  points: number;
  date: string; // Already formatted as string by toLocaleDateString()
  userId: string;
}

interface PlayerMatchHistoryTableProps {
  matches: PlayerMatchDisplay[];
}

export function PlayerMatchHistoryTable({ matches }: PlayerMatchHistoryTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const handleViewDetails = (matchId: string, userId: string) => {
    setSelectedMatchId(matchId);
    setSelectedUserId(userId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-4">Match History</h2>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead className="text-center">Match</TableHead>
                <TableHead className="text-center">Placement</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.length > 0 ? (
                matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <Link href={`/tournaments/${match.tournamentId}`} className="hover:text-primary">
                        {match.tournamentName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(match.matchId, match.userId)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                          ${match.placement === 1 ? "bg-yellow-500/20 text-yellow-500" : ""}
                          ${match.placement === 2 ? "bg-gray-400/20 text-gray-400" : ""} /* Changed to a visible color for 2nd */
                          ${match.placement === 3 ? "bg-amber-700/20 text-amber-700" : ""}
                          ${match.placement > 3 ? "bg-transparent" : ""}
                        `}
                      >
                        {match.placement}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-medium">{match.points}</TableCell>
                    <TableCell className="text-right">{match.date}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No matches found for this player.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {isModalOpen && selectedMatchId && selectedUserId && (
        <MatchDetailsModal
          matchId={selectedMatchId}
          userId={selectedUserId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
} 