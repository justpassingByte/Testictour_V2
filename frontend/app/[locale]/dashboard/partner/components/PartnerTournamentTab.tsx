"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus, Search, Filter, RefreshCw, Eye, Loader2, Trophy, Lock, Users
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import api from "@/app/lib/apiConfig"
import { ITournament } from "@/app/types/tournament"
import { useUserStore } from "@/app/stores/userStore"

interface PartnerTournamentTabProps {
  subscriptionPlan?: string
}

export default function PartnerTournamentTab({ subscriptionPlan }: PartnerTournamentTabProps) {
  const { currentUser } = useUserStore()
  const [tournaments, setTournaments] = useState<ITournament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const canCreate = subscriptionPlan === 'PRO' || subscriptionPlan === 'ENTERPRISE'

  const [form, setForm] = useState({
    name: "",
    description: "",
    region: "VN",
    maxPlayers: 32,
    entryFee: 0,
    startTime: "",
    registrationDeadline: "",
  })

  const fetchMyTournaments = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tournaments/my')
      setTournaments(res.data.tournaments || [])
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
      // Fallback: fetch all and filter client-side
      try {
        const res = await api.get('/tournaments')
        const all = res.data.tournaments || []
        setTournaments(all.filter((t: any) => t.organizer?.id === currentUser?.id || t.organizerId === currentUser?.id))
      } catch {
        setTournaments([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMyTournaments() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.startTime || !form.registrationDeadline) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      await api.post('/tournaments', {
        name: form.name,
        description: form.description,
        region: form.region,
        maxPlayers: form.maxPlayers,
        entryFee: form.entryFee,
        startTime: new Date(form.startTime).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        hostFeePercent: 0.1,
        expectedParticipants: form.maxPlayers,
        phases: [],
      })
      toast({ title: "Tournament Created!", description: `${form.name} has been created successfully.` })
      setCreateOpen(false)
      setForm({ name: "", description: "", region: "VN", maxPlayers: 32, entryFee: 0, startTime: "", registrationDeadline: "" })
      fetchMyTournaments()
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Failed to create tournament."
      toast({ title: "Creation Failed", description: message, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const filteredTournaments = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadgeClasses = (status: string) => {
    switch (status.toUpperCase()) {
      case 'UPCOMING': case 'REGISTRATION': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'IN_PROGRESS': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'COMPLETED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">My Tournaments</h2>
          <p className="text-sm text-muted-foreground">Create and manage your own tournaments.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-600 to-cyan-600">
            <Plus className="mr-2 h-4 w-4" /> Create Tournament
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2">
            <Lock className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-500">Upgrade to PRO to create tournaments</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Input placeholder="Search your tournaments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Tournament List */}
      <Card className="bg-card/60 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No tournaments yet</p>
              <p className="text-sm mt-1">
                {canCreate ? "Create your first tournament to get started." : "Upgrade your subscription to create tournaments."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Prize Pool</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTournaments.map((tournament) => {
                  const prizePool = tournament.budget || ((tournament.registered || 0) * tournament.entryFee * (1 - (tournament.hostFeePercent || 0.1)))
                  return (
                    <TableRow key={tournament.id} className="hover:bg-white/5">
                      <TableCell>
                        <div className="font-medium">{tournament.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{tournament.region || 'VN'}</div>
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
                      <TableCell className="font-medium">{formatCurrency(prizePool, 'VND')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tournament.startTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/tournaments/${tournament.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Tournament Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Tournament</DialogTitle>
            <DialogDescription>Set up a new tournament. You can configure phases after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tournament Name *</Label>
                <Input placeholder="e.g. TFT Weekly" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm(p => ({ ...p, region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VN">Vietnam</SelectItem>
                    <SelectItem value="NA">North America</SelectItem>
                    <SelectItem value="EUW">Europe West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Tournament description..." value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm(p => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Registration Deadline *</Label>
                <Input type="datetime-local" value={form.registrationDeadline} onChange={(e) => setForm(p => ({ ...p, registrationDeadline: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Max Players</Label>
                <Input type="number" min={2} value={form.maxPlayers} onChange={(e) => setForm(p => ({ ...p, maxPlayers: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Entry Fee (VND)</Label>
                <Input type="number" min={0} value={form.entryFee} onChange={(e) => setForm(p => ({ ...p, entryFee: parseFloat(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
