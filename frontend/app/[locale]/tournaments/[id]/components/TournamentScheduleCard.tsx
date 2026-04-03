"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { CalendarClock } from "lucide-react"
import { format, differenceInDays } from "date-fns"

interface TournamentScheduleCardProps {
  tournament: ITournament;
}

export function TournamentScheduleCard({ tournament }: TournamentScheduleCardProps) {
  const startDate = new Date(tournament.startTime)
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null
  const registrationDeadlineDate = tournament.endTime && !isNaN(new Date(tournament.endTime).getTime()) 
    ? new Date(tournament.endTime) 
    : null
  
  const today = new Date()
  const daysUntilStart = differenceInDays(startDate, today)
  const daysUntilRegistrationDeadline = registrationDeadlineDate ? differenceInDays(registrationDeadlineDate, today) : 0
  
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <CalendarClock className="mr-2 h-5 w-5 text-primary" />
          Tournament Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <div className="text-muted-foreground">Registration Deadline:</div>
          <div className="font-medium">
            {registrationDeadlineDate ? (
              <>
                {format(registrationDeadlineDate, "MMM d, yyyy 'at' h:mm a")}
                {daysUntilRegistrationDeadline > 0 && (
                  <span className="text-xs ml-1 text-muted-foreground">
                    (in {daysUntilRegistrationDeadline} {daysUntilRegistrationDeadline === 1 ? 'day' : 'days'})
                  </span>
                )}
              </>
            ) : (
              "N/A"
            )}
          </div>
        </div>
        
        <div className="flex justify-between">
          <div className="text-muted-foreground">Start Date:</div>
          <div className="font-medium">
            {format(startDate, "MMM d, yyyy 'at' h:mm a")}
            {daysUntilStart > 0 && (
              <span className="text-xs ml-1 text-muted-foreground">
                (in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'})
              </span>
            )}
          </div>
        </div>
        
        {endDate && (
          <div className="flex justify-between">
            <div className="text-muted-foreground">End Date:</div>
            <div className="font-medium">
              {format(endDate, "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
 