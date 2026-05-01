"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { CalendarClock, Timer, ClipboardCheck, Building2, Play } from "lucide-react"
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
  const checkInDate = (tournament as any).checkInTime && !isNaN(new Date((tournament as any).checkInTime).getTime())
    ? new Date((tournament as any).checkInTime)
    : null
  const lobbyCreationDate = (tournament as any).lobbyCreationTime && !isNaN(new Date((tournament as any).lobbyCreationTime).getTime())
    ? new Date((tournament as any).lobbyCreationTime)
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
            <CardContent className="grid gap-2.5 text-sm">
        {/* 1. Registration Deadline */}
        <div className="flex justify-between items-center p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardCheck className="h-4 w-4 text-blue-400" />
            <span>{t("registration_deadline")}</span>
          </div>
          <div className="font-medium text-right">
            {registrationDeadlineDate ? (
              <>{format(registrationDeadlineDate, "MMM d, yyyy")} <br/> {format(registrationDeadlineDate, "h:mm a")}</>
            ) : "N/A"}
          </div>
        </div>

        {/* 2. Check-in Time */}
        {checkInDate && (
          <div className="flex justify-between items-center p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardCheck className="h-4 w-4 text-amber-400" />
              <span>{t("check_in_time")}</span>
            </div>
            <div className="font-medium text-right">
              {format(checkInDate, "MMM d, yyyy")} <br/> {format(checkInDate, "h:mm a")}
            </div>
          </div>
        )}

        {/* 3. Lobby Creation Time */}
        {lobbyCreationDate && (
          <div className="flex justify-between items-center p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4 text-violet-400" />
              <span>{t("lobby_creation_time")}</span>
            </div>
            <div className="font-medium text-right">
              {format(lobbyCreationDate, "MMM d, yyyy")} <br/> {format(lobbyCreationDate, "h:mm a")}
            </div>
          </div>
        )}

        {/* 4. Start Time */}
        <div className="flex justify-between items-center p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors border-l-2 border-primary/40">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Play className="h-4 w-4 text-green-400" />
            <span className="font-semibold text-white">{t("start_date")}</span>
          </div>
          <div className="font-medium text-right">
            {format(startDate, "MMM d, yyyy")} <br/> {format(startDate, "h:mm a")}
          </div>
        </div>
        
        {endDate && (
          <div className="flex justify-between items-center p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4 text-red-400" />
              <span>{t("end_date")}</span>
            </div>
            <div className="font-medium text-right">
              {format(endDate, "MMM d, yyyy")} <br/> {format(endDate, "h:mm a")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
