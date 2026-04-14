"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus, Search, Filter, RefreshCw, Eye, Edit, Trash2, PlayCircle, Loader2, MoreVertical, Users, Trophy
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { ITournament } from "@/app/types/tournament"
import { formatCurrency } from "@/lib/utils"
import { TournamentService } from "@/app/services/TournamentService"
import { useTranslations } from "next-intl"
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate"

export default function AdminTournamentsPage() {
  const t = useTranslations("common")
  const { formatVndText } = useCurrencyRate()
  const [tournaments, setTournaments] = useState<ITournament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tournament: ITournament | null }>({ open: false, tournament: null })
  const [deleting, setDeleting] = useState(false)

  const fetchTournaments = async () => {
    setLoading(true)
    try {
      const data = await TournamentService.list()
      setTournaments(data.tournaments)
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTournaments() }, [])

  const handleSync = async (tournamentId: string) => {
    setSyncing(prev => ({ ...prev, [tournamentId]: true }))
    try {
      const response = await TournamentService.syncMatches(tournamentId)
      toast({ title: t("sync_initiated", { defaultValue: "Sync Initiated" }), description: response.message })
      setTimeout(() => fetchTournaments(), 5000)
    } catch (error: any) {
      toast({ title: t("sync_failed", { defaultValue: "Sync Failed" }), description: error.response?.data?.message || t("unexpected_error", { defaultValue: "An unexpected error occurred." }), variant: "destructive" })
    } finally {
      setSyncing(prev => ({ ...prev, [tournamentId]: false }))
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.tournament) return
    setDeleting(true)
    try {
      await TournamentService.remove(deleteDialog.tournament.id)
      toast({ title: t("tournament_deleted", { defaultValue: "Tournament Deleted" }), description: t("tournament_deleted_success", { name: deleteDialog.tournament.name, defaultValue: `${deleteDialog.tournament.name} has been deleted.` }) })
      setDeleteDialog({ open: false, tournament: null })
      fetchTournaments()
    } catch (error: any) {
      toast({ title: t("delete_failed", { defaultValue: "Delete Failed" }), description: error.message || t("failed_to_delete_tournament", { defaultValue: "Failed to delete tournament." }), variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const getStatusBadgeClasses = (status: string) => {
    switch (status.toUpperCase()) {
      case 'UPCOMING': case 'REGISTRATION': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'IN_PROGRESS': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'COMPLETED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("tournaments")}</h1>
          <p className="text-muted-foreground text-sm">{t("manage_tournaments")}</p>
        </div>
        <Link href="/dashboard/admin/tournaments/create">
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700">
            <Plus className="mr-2 h-4 w-4" /> {t("create_tournament")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder={t("search_tournaments")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("status", { defaultValue: "Status" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="upcoming">{t("upcoming")}</SelectItem>
            <SelectItem value="registration">{t("registration", { defaultValue: "Registration" })}</SelectItem>
            <SelectItem value="in_progress">{t("ongoing")}</SelectItem>
            <SelectItem value="completed">{t("finished")}</SelectItem>
            <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchTournaments} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("no_tournaments_found", { defaultValue: "No tournaments found" })}</p>
              <p className="text-sm mt-1">{t("create_first_tournament", { defaultValue: "Create your first tournament to get started." })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tournaments")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("players")}</TableHead>
                  <TableHead>{t("prize_pool")}</TableHead>
                  <TableHead>{t("start_date")}</TableHead>
                  <TableHead>{t("sync", { defaultValue: "Sync" })}</TableHead>
                  <TableHead className="text-right">{t("action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTournaments.map((tournament) => {
                  const prizePool = tournament.budget || ((tournament.registered || 0) * tournament.entryFee * (1 - (tournament.hostFeePercent || 0.1)))
                  return (
                    <TableRow key={tournament.id} className="hover:bg-white/5">
                      <TableCell>
                        <div>
                          <Link href={`/tournaments/${tournament.id}`} className="font-medium hover:text-violet-400 transition-colors">
                            {tournament.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-muted-foreground">
                              {tournament.organizer?.username || 'System'}
                            </div>
                            <Badge variant="outline" className={`text-[10px] px-1.5 h-4 shadow-black/50 shadow-sm ${tournament.isCommunityMode ? 'text-orange-400 border-orange-500/50 bg-orange-500/10' : 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10'}`}>
                              {tournament.isCommunityMode ? 'Community' : 'Escrow'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClasses(tournament.status)}>
                          {tournament.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-sm">{tournament.registered || 0} / {tournament.maxPlayers}</span>
                          <Progress value={((tournament.registered || 0) / tournament.maxPlayers) * 100} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>${prizePool.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">USD</span></span>
                          <span className="text-[10px] text-muted-foreground opacity-80">{formatVndText(prizePool)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tournament.startTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {tournament.lastSyncTime ? new Date(tournament.lastSyncTime).toLocaleString() : t("never", { defaultValue: "Never" })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tournament.status === 'in_progress' && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleSync(tournament.id)}
                              disabled={syncing[tournament.id]}
                            >
                              {syncing[tournament.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/admin/tournaments/${tournament.id}`} className="flex items-center w-full">
                                  <Edit className="mr-2 h-4 w-4" /> {t("manage")}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/tournaments/${tournament.id}`} className="flex items-center w-full">
                                  <Eye className="mr-2 h-4 w-4" /> {t("view")}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500"
                                onClick={() => setDeleteDialog({ open: true, tournament })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> {t("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, tournament: open ? deleteDialog.tournament : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete_tournament")}</DialogTitle>
            <DialogDescription>
              {t("delete_tournament_confirm", { name: deleteDialog.tournament?.name || "", defaultValue: `Are you sure you want to delete ${deleteDialog.tournament?.name}? This action cannot be undone.` })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, tournament: null })}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
