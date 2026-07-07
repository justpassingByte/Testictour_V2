"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ITournament } from "@/app/types/tournament"
import { ParticipantService } from "@/app/services/ParticipantService"
import { useUserStore } from "@/app/stores/userStore"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface TournamentCheckInButtonProps {
  tournament: ITournament
}

export function TournamentCheckInButton({ tournament }: TournamentCheckInButtonProps) {
  const t = useTranslations("common")
  const { currentUser } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)

  useEffect(() => {
    if (!currentUser?.id || !tournament?.id) return
    ParticipantService.list(tournament.id)
      .then((participants) => {
        const mine = participants.find((p) => p.userId === currentUser.id)
        if (mine && !mine.isReserve) {
          setParticipantId(mine.id)
          setCheckedIn(Boolean(mine.checkedIn))
        }
      })
      .catch(() => {})
  }, [currentUser?.id, tournament?.id])

  const checkInWindow = useMemo(() => {
    const now = Date.now()
    const opensAt = tournament.checkInTime
      ? new Date(tournament.checkInTime).getTime()
      : tournament.startTime
        ? new Date(tournament.startTime).getTime()
        : null
    const closesAt = tournament.startTime ? new Date(tournament.startTime).getTime() : null
    const isOpen = opensAt ? now >= opensAt : true
    const isClosed = closesAt ? now > closesAt : false
    return { isOpen, isClosed }
  }, [tournament.checkInTime, tournament.startTime])

  const canShow =
    participantId &&
    !checkedIn &&
    (tournament.status === "UPCOMING" ||
      tournament.status === "pending" ||
      tournament.status === "REGISTRATION")

  if (!canShow) {
    if (participantId && checkedIn) {
      return (
        <Button disabled className="w-full bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/20">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Checked In
        </Button>
      )
    }
    return null
  }

  const handleCheckIn = async () => {
    if (!participantId) return
    if (!checkInWindow.isOpen) {
      toast.error("Check-in has not opened yet.")
      return
    }
    if (checkInWindow.isClosed) {
      toast.error("Check-in window has closed.")
      return
    }

    setLoading(true)
    try {
      const updated = await ParticipantService.checkIn(tournament.id, participantId)
      setCheckedIn(Boolean(updated.checkedIn))
      toast.success("You are checked in for this tournament.")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Check-in failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckIn}
      disabled={loading || !checkInWindow.isOpen || checkInWindow.isClosed}
      className="w-full bg-cyan-600 hover:bg-cyan-700"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <UserCheck className="mr-2 h-4 w-4" />
      )}
      {t("check_in") || "Check In"}
    </Button>
  )
}
