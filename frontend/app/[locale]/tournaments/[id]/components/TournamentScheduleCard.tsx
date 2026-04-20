"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { CalendarClock, Timer } from "lucide-react"
import { format, differenceInDays, differenceInSeconds } from "date-fns"
import { useTranslations } from "next-intl"

interface TournamentScheduleCardProps {
  tournament: ITournament;
}

export function TournamentScheduleCard({ tournament }: TournamentScheduleCardProps) {
  const t = useTranslations("common")
  const startDate = new Date(tournament.startTime)
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null
  const registrationDeadlineDate = tournament.registrationDeadline && !isNaN(new Date(tournament.registrationDeadline).getTime()) 
    ? new Date(tournament.registrationDeadline) 
    : null
  
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    // Update the current time every second for the smart countdown
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const daysUntilRegistrationDeadline = registrationDeadlineDate ? differenceInDays(registrationDeadlineDate, now) : 0

  // Smart Countdown Logic
  const getSmartCountdown = () => {
    const status = tournament.status?.toLowerCase();
    if (status === 'in_progress') return t("started");
    if (status === 'completed') return t("finished");
    if (status === 'cancelled') return t("cancelled");

    const diffInSeconds = differenceInSeconds(startDate, now);
    
    if (diffInSeconds <= 0) return t("starting_now");

    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = Math.floor(diffInSeconds % 60);

    if (days > 0) return t("starts_in_d_h", { days, hours });
    if (hours > 0) return t("starts_in_h_m", { hours, minutes });
    if (minutes > 15) return t("starts_in_m", { minutes });
    if (minutes > 0) return t("starts_in_m_s", { minutes, seconds });
    return t("starts_in_s", { seconds });
  };

  const getCountdownColor = () => {
    const status = tournament.status?.toUpperCase();
    if (status !== 'UPCOMING' && status !== 'REGISTRATION' && status !== 'DRAFT') return "text-muted-foreground";
    const diffInSeconds = differenceInSeconds(startDate, now);
    if (diffInSeconds <= 0) return "text-emerald-500 font-bold animate-pulse";
    if (diffInSeconds < 900) return "text-red-500 font-bold animate-pulse"; // Under 15 mins
    if (diffInSeconds < 3600) return "text-amber-500 font-bold"; // Under 1 hour
    return "text-primary font-medium";
  }

  const smartCountdownText = getSmartCountdown();
  const countdownColorClass = getCountdownColor();

  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden relative">
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <div className="flex items-center">
            <CalendarClock className="mr-2 h-5 w-5 text-primary" />
            {t("tournament_schedule")}
          </div>
          <div className={`flex items-center gap-1.5 text-sm bg-black/20 px-2.5 py-1 rounded-full ${countdownColorClass}`}>
            <Timer className="w-4 h-4" />
            {smartCountdownText}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex justify-between items-center p-2 rounded-lg bg-black/10">
          <div className="text-muted-foreground">{t("start_date")}</div>
          <div className="font-medium text-right">
            {format(startDate, "MMM d, yyyy")} <br/> {format(startDate, "h:mm a")}
          </div>
        </div>
        
        <div className="flex justify-between items-center p-2 rounded-lg bg-black/10">
          <div className="text-muted-foreground">{t("registration_deadline")}</div>
          <div className="font-medium text-right">
            {registrationDeadlineDate ? (
              <>
                {format(registrationDeadlineDate, "MMM d, yyyy")} <br/> {format(registrationDeadlineDate, "h:mm a")}
                {daysUntilRegistrationDeadline > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ({daysUntilRegistrationDeadline} {daysUntilRegistrationDeadline === 1 ? 'day' : 'days'} left)
                  </div>
                )}
              </>
            ) : (
              "N/A"
            )}
          </div>
        </div>
        
        {endDate && (
          <div className="flex justify-between items-center p-2 rounded-lg bg-black/10">
            <div className="text-muted-foreground">{t("end_date")}</div>
            <div className="font-medium text-right">
              {format(endDate, "MMM d, yyyy")} <br/> {format(endDate, "h:mm a")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
 