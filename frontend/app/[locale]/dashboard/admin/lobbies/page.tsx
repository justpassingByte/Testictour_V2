"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gamepad2, Plus, Clock, Trophy, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import MiniTourLobbyService from "@/app/services/MiniTourLobbyService"
import { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import LobbiesTabClient from "../../partner/components/LobbiesTabClient"
import { useTranslations } from "next-intl"

export default function AdminLobbiesPage() {
  const t = useTranslations("common")
  const [lobbies, setLobbies] = useState<MiniTourLobby[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLobbies()
  }, [])

  const fetchLobbies = async () => {
    try {
      setLoading(true)
      const data = await MiniTourLobbyService.getAllLobbies()
      setLobbies(data)
    } catch (error) {
      console.error("Failed to fetch lobbies:", error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: lobbies.length,
    waiting: lobbies.filter((l) => l.status === "WAITING").length,
    inProgress: lobbies.filter((l) => l.status === "IN_PROGRESS").length,
    completed: lobbies.filter((l) => l.status === "COMPLETED").length,
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("lobbies", { defaultValue: "Lobbies" })}</h1>
          <p className="text-muted-foreground text-sm">
            {t("manage_all_minitour_lobbies", { defaultValue: "Manage all MiniTour lobbies across the platform." })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLobbies} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t("refresh", { defaultValue: "Refresh" })}
          </Button>
          <Link href="/dashboard/admin/lobbies/create">
            <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700">
              <Plus className="mr-2 h-4 w-4" /> {t("create_lobby", { defaultValue: "Create Lobby" })}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 border-slate-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">{t("total", { defaultValue: "Total" })}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Gamepad2 className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-400 font-medium uppercase">{t("waiting", { defaultValue: "Waiting" })}</p>
                <p className="text-2xl font-bold">{stats.waiting}</p>
              </div>
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-400 font-medium uppercase">{t("in_progress", { defaultValue: "In Progress" })}</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <Gamepad2 className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-medium uppercase">{t("completed", { defaultValue: "Completed" })}</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <Trophy className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lobby Management — reuses the full-featured LobbiesTabClient */}
      {loading ? (
        <Card className="bg-card/60 border-white/10">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">{t("loading_lobbies", { defaultValue: "Loading lobbies..." })}</span>
          </CardContent>
        </Card>
      ) : (
        <LobbiesTabClient
          initialLobbies={lobbies}
          onLobbiesUpdate={(updatedLobbies) => setLobbies(updatedLobbies)}
          isAdmin={true}
        />
      )}
    </div>
  )
}
