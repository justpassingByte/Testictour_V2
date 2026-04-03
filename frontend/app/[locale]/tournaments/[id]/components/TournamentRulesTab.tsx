import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table } from "lucide-react"

export const TournamentRulesTab = () => {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
          <CardTitle className="text-lg flex items-center">
          <Table className="mr-2 h-5 w-5 text-primary" />
          Tournament Rules
          </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {/* Hardcoded General Rules Explanations */}
        <div className="space-y-2 mb-4">
          <h4 className="font-bold">General Phase Rules:</h4>
          <p><strong>Elimination Phase:</strong> Players who lose a match are eliminated from the tournament. The tournament continues until only a set number of players remain or a champion is crowned.</p>
          <p><strong>Points Phase:</strong> Players earn points based on their performance in matches. The player with the highest points at the end of the phase will be ranked higher.</p>
          <p><strong>Checkmate Phase:</strong> Players compete until a specific condition is met, typically a player reaching a certain score or winning a set number of matches, which then &quot;checks out&quot; other players.</p>
          <p><strong>Swiss Phase:</strong> Players are paired based on their current win-loss record, ensuring that players with similar performance levels compete against each other. No players are eliminated until the end of the phase.</p>
          <p><strong>Round Robin Phase:</strong> Each player or team plays against every other player or team a predetermined number of times. This format ensures everyone gets to play against everyone else.</p>
        </div>
        <div className="space-y-2 mb-4">
          <h4 className="font-bold">Lobby Assignment Rules:</h4>
          <p><strong>Random Assignment:</strong> Players are assigned to lobbies randomly, without considering their performance or rank.</p>
          <p><strong>Seeded Assignment:</strong> Players are assigned to lobbies based on their performance, rank, or other seeding criteria to ensure balanced or strategic matchups.</p>
        </div>
        <div className="space-y-2 mb-4">
          <h4 className="font-bold">Additional Tournament Rules:</h4>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>All participants must register before the registration deadline.</li>
            <li>Players must use the same Riot account throughout the tournament.</li>
            <li>In case of a tie, the player with the highest number of first-place finishes wins.</li>
            <li>Any form of cheating or unsportsmanlike conduct will result in disqualification.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}; 