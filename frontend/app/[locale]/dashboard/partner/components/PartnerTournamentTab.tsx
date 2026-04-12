"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus, Search, Filter, RefreshCw, Eye, Loader2, Trophy, Lock, Users, ImagePlus, Trash2
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
    region: "APAC",
    maxPlayers: 32,
    entryFee: 0,
    hostFeePercent: 0.1,
    startTime: "",
    registrationDeadline: "",
    image: "",
  })
  
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageFile(null)
    setForm(prev => ({ ...prev, image: "" }))
  }

  const [phases, setPhases] = useState([
    { name: "Phase 1", type: "elimination", lobbySize: 8, numberOfRounds: 1, advancementType: "top_n_scores", advancementValue: 4 }
  ])

  const addPhase = () => {
    setPhases(prev => [...prev, {
      name: `Phase ${prev.length + 1}`,
      type: "elimination",
      lobbySize: 8,
      numberOfRounds: 1,
      advancementType: "top_n_scores",
      advancementValue: 4,
    }])
  }

  const removePhase = (index: number) => {
    setPhases(prev => prev.filter((_, i) => i !== index))
  }

  const updatePhase = (index: number, field: string, value: any) => {
    setPhases(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const fetchMyTournaments = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tournaments/my')
      setTournaments(res.data.tournaments || [])
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
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
      const phaseConfigs = phases.map((p, i) => ({
        id: `phase-${i + 1}`,
        name: p.name,
        type: p.type,
        lobbySize: p.lobbySize,
        numberOfRounds: p.numberOfRounds,
        advancementCondition: { type: p.advancementType, value: p.advancementValue },
      }))

      await api.post('/tournaments', {
        name: form.name,
        description: form.description,
        region: form.region,
        maxPlayers: form.maxPlayers,
        entryFee: form.entryFee,
        startTime: new Date(form.startTime).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        hostFeePercent: form.hostFeePercent,
        expectedParticipants: form.maxPlayers,
        image: imageFile ? (imagePreview || form.image || undefined) : (form.image || undefined),
        roundsTotal: phases.reduce((sum, p) => sum + p.numberOfRounds, 0),
        config: { phases: phaseConfigs },
      })

      toast({ title: "Tournament Created!", description: `${form.name} has been created successfully.` })
      setCreateOpen(false)
      setForm({ name: "", description: "", region: "APAC", maxPlayers: 32, entryFee: 0, hostFeePercent: 0.1, startTime: "", registrationDeadline: "", image: "" })
      setPhases([{ name: "Phase 1", type: "elimination", lobbySize: 8, numberOfRounds: 1, advancementType: "top_n_scores", advancementValue: 4 }])
      setImageFile(null)
      setImagePreview(null)
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
                        <div className="text-xs text-muted-foreground mt-0.5">{tournament.region || 'APAC'}</div>
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

      {/* Create Tournament Dialog matched with Admin setup */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Tournament</DialogTitle>
            <DialogDescription>Advanced tournament configuration for Partner.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tournament Name *</Label>
                <Input placeholder="e.g. Weekly Scrims" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm(p => ({ ...p, region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMER">Americas</SelectItem>
                    <SelectItem value="EMEA">Europe, Middle East, Africa</SelectItem>
                    <SelectItem value="APAC">Asia Pacific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Tournament description..." value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-white/10 group bg-black/40">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-md px-2 py-1 transition-opacity opacity-0 group-hover:opacity-100 text-xs flex items-center justify-center cursor-pointer"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors">
                  <span className="text-sm border p-2 rounded-md bg-white/5 border-white/10 font-bold tracking-wide">Upload Display Graphic</span>
                  <span className="text-xs text-muted-foreground mt-2">PNG, JPG up to 5MB</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
              <div className="flex items-center gap-2 my-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">or insert URL</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <Input
                placeholder="https://example.com/image.jpg"
                value={form.image}
                onChange={(e) => {
                  setForm(p => ({ ...p, image: e.target.value }));
                  if (e.target.value) setImagePreview(e.target.value);
                }}
              />
            </div>

            {/* Schedule */}
            <div className="grid gap-4 md:grid-cols-2 bg-white/5 p-4 rounded border border-white/10">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm(p => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Registration Deadline *</Label>
                <Input type="datetime-local" value={form.registrationDeadline} onChange={(e) => setForm(p => ({ ...p, registrationDeadline: e.target.value }))} />
              </div>
            </div>

            {/* Players & Fees */}
            <div className="grid gap-4 md:grid-cols-3 bg-white/5 p-4 rounded border border-white/10">
              <div className="space-y-2">
                <Label>Max Players</Label>
                <Select value={form.maxPlayers.toString()} onValueChange={(v) => setForm(p => ({ ...p, maxPlayers: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16 Players</SelectItem>
                    <SelectItem value="32">32 Players</SelectItem>
                    <SelectItem value="48">48 Players</SelectItem>
                    <SelectItem value="64">64 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entry Fee</Label>
                <Input type="number" min={0} value={form.entryFee} onChange={(e) => setForm(p => ({ ...p, entryFee: parseFloat(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Host Fee (%)</Label>
                <Input type="number" min={0} max={1} step={0.01} value={form.hostFeePercent} onChange={(e) => setForm(p => ({ ...p, hostFeePercent: parseFloat(e.target.value) }))} />
              </div>
            </div>
            {form.entryFee > 0 && (
              <div className="text-sm bg-violet-500/10 border border-violet-500/20 rounded-md p-3">
                Estimated Maximum Prize pool: <strong className="text-violet-400">
                  {formatCurrency((form.maxPlayers * form.entryFee * (1 - form.hostFeePercent)), 'VND')}
                </strong>
                {" "}(When 100% full capacity)
              </div>
            )}

            {/* Config Phases (from admin) */}
            <div className="border border-white/10 rounded-lg p-0">
               <div className="p-3 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between">
                 <div className="mb-2 sm:mb-0">
                    <h3 className="font-bold">Phase Configuration</h3>
                    <p className="text-xs text-muted-foreground">Setup rules for how people advance through phases</p>
                 </div>
                 <Button type="button" variant="secondary" size="sm" onClick={addPhase}>
                   <Plus className="mr-1 h-3 w-3" /> Add Phase
                 </Button>
               </div>
               <div className="p-4 space-y-4">
                  {phases.map((phase, index) => (
                    <Card key={index} className="bg-black/30 border-white/5">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-violet-300">Phase {index + 1}</h4>
                          {phases.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 h-8 uppercase text-xs" onClick={() => removePhase(index)}>
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide">Name</Label>
                            <Input value={phase.name} onChange={(e) => updatePhase(index, "name", e.target.value)} placeholder="Phase name" className="bg-black/40" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide">Type</Label>
                            <Select value={phase.type} onValueChange={(v) => updatePhase(index, "type", v)}>
                              <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="elimination">Elimination</SelectItem>
                                <SelectItem value="points">Points</SelectItem>
                                <SelectItem value="swiss">Swiss</SelectItem>
                                <SelectItem value="round_robin">Round Robin</SelectItem>
                                <SelectItem value="checkmate">Checkmate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide">Lobby Size</Label>
                            <Input type="number" min={2} max={8} value={phase.lobbySize} onChange={(e) => updatePhase(index, "lobbySize", parseInt(e.target.value))} className="bg-black/40" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide">Total Rounds</Label>
                            <Input type="number" min={1} value={phase.numberOfRounds} onChange={(e) => updatePhase(index, "numberOfRounds", parseInt(e.target.value))} className="bg-black/40" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide">Advancement Mechanism</Label>
                            <Select value={phase.advancementType} onValueChange={(v) => updatePhase(index, "advancementType", v)}>
                              <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top_n_scores">Top N Scores</SelectItem>
                                <SelectItem value="placement">By Placement</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide">Advance Target</Label>
                            <Input type="number" min={1} value={phase.advancementValue} onChange={(e) => updatePhase(index, "advancementValue", parseInt(e.target.value))} className="bg-black/40" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
               </div>
            </div>

          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-violet-600 to-cyan-600 min-w-[120px]">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
