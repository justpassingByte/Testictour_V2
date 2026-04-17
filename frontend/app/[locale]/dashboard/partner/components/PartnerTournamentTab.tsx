"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus, Search, Filter, RefreshCw, Eye, Loader2, Trophy, Lock, Users, ImagePlus, Trash2, MoreVertical, Settings
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RegionSelector } from "@/components/ui/RegionSelector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import api from "@/app/lib/apiConfig"
import { ITournament } from "@/app/types/tournament"
import { useUserStore } from "@/app/stores/userStore"
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate"

interface PartnerTournamentTabProps {
  subscriptionPlan?: string
}

export default function PartnerTournamentTab({ subscriptionPlan }: PartnerTournamentTabProps) {
  const { currentUser } = useUserStore()
  const { formatVndText } = useCurrencyRate()
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
    isCommunityMode: false,
    discordUrl: "",
  })
  
  const [sponsors, setSponsors] = useState<{name: string; url: string; file?: File}[]>([])
  
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
    { name: "Phase 1", type: "elimination", lobbySize: 8, numberOfRounds: 1, advancementType: "top_n_scores", advancementValue: 4, matchesPerRound: 1 }
  ])

  const addPhase = () => {
    setPhases(prev => [...prev, {
      name: `Phase ${prev.length + 1}`,
      type: "elimination",
      lobbySize: 8,
      numberOfRounds: 1,
      advancementType: "top_n_scores",
      advancementValue: 4,
      matchesPerRound: 1,
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
        matchesPerRound: p.matchesPerRound,
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
        isCommunityMode: form.isCommunityMode,
        discordUrl: form.discordUrl,
        sponsors: await Promise.all(sponsors.map(async (s) => {
          if (s.file) {
            // Simulated upload because we don't have an S3 upload route built here.
            // Normally this would be a multipart/form-data upload or presigned URL.
            // We just use a base64 string for simplicity as image upload wasn't explicitly implemented on this tab yet (imagePreview was used directly).
            return { name: s.name, url: "" }; // Base64 could be used, but since we map `imagePreview` directly for main image, we will just pass the preview-like string below if we wanted to. However, we'll implement simple base64 reading below!
          }
          return { name: s.name, url: s.url };
        })).then(async sList => {
          // Add real base64 reading loop
          const resolvedSponsors = [];
          for (let i = 0; i < sponsors.length; i++) {
             let finalUrl = sponsors[i].url;
             if (sponsors[i].file) {
                const reader = new FileReader();
                finalUrl = await new Promise<string>((resolve) => {
                   reader.onloadend = () => resolve(reader.result as string);
                   reader.readAsDataURL(sponsors[i].file!);
                });
             }
             resolvedSponsors.push({ name: sponsors[i].name, url: finalUrl });
          }
          return resolvedSponsors;
        })
      })

      toast({ title: "Tournament Created!", description: `${form.name} has been created successfully.` })
      setCreateOpen(false)
      setForm({ name: "", description: "", region: "APAC", maxPlayers: 32, entryFee: 0, hostFeePercent: 0.1, startTime: "", registrationDeadline: "", image: "", isCommunityMode: false, discordUrl: "" })
      setSponsors([])
      setPhases([{ name: "Phase 1", type: "elimination", lobbySize: 8, numberOfRounds: 1, advancementType: "top_n_scores", advancementValue: 4, matchesPerRound: 1 }])
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

  const handleDeleteTournament = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tournament? This action cannot be undone.")) return;
    try {
      await api.delete(`/tournaments/${id}`);
      toast({ title: "Deleted", description: "Tournament has been deleted successfully." });
      fetchMyTournaments();
    } catch (error: any) {
      toast({ title: "Failed", description: error.response?.data?.message || "Could not delete tournament.", variant: "destructive" });
    }
  }

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
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs text-muted-foreground">{tournament.region || 'APAC'}</div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 h-4 shadow-black/50 shadow-sm ${tournament.isCommunityMode ? 'text-orange-400 border-orange-500/50 bg-orange-500/10' : 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10'}`}>
                            {tournament.isCommunityMode ? 'Community' : 'Escrow'}
                          </Badge>
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3">
                              Manage <MoreVertical className="ml-2 h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/partner/tournaments/${tournament.id}`}>
                                <Settings className="mr-2 h-4 w-4" /> Manage
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-500/10" onClick={() => handleDeleteTournament(tournament.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen} modal={false}>
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
              <div className="space-y-2 md:col-span-2">
                <RegionSelector 
                  label="Region"
                  value={form.region} 
                  onChange={(v) => setForm(p => ({ ...p, region: v }))} 
                />
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
                <Input type="number" min={0} max={10} step={0.1} value={(form.hostFeePercent * 100).toFixed(1).replace(/\.0$/, '')} onChange={(e) => setForm(p => ({ ...p, hostFeePercent: parseFloat(e.target.value) / 100 }))} />
              </div>
            </div>
            {form.entryFee > 0 && (
              <div className="text-sm bg-violet-500/10 border border-violet-500/20 rounded-md p-3">
                Estimated Prize Pool: <strong className="text-violet-400">
                  ${(form.maxPlayers * form.entryFee * (1 - form.hostFeePercent)).toLocaleString()} USD
                </strong>
                {" "}(When 100% full capacity)
              </div>
            )}

            {/* Dynamic Community & Sponsors Config */}
            <div className="border border-white/10 rounded-lg p-0">
               <div className="p-3 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between">
                 <div className="mb-2 sm:mb-0">
                    <h3 className="font-bold text-violet-400">Community & Sponsors</h3>
                    <p className="text-xs text-muted-foreground">Discord server and dynamic sponsor branding shown on banner.</p>
                 </div>
               </div>
               <div className="p-4 space-y-4">
                 <div className="space-y-2">
                   <Label>Discord Server URL</Label>
                   <Input placeholder="https://discord.gg/yourserver" value={form.discordUrl} onChange={(e) => setForm(p => ({ ...p, discordUrl: e.target.value }))} />
                 </div>

                 <div className="space-y-2 pt-2">
                   <div className="flex items-center justify-between">
                      <Label>Sponsor Logos</Label>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setSponsors(s => [...s, {name: '', url: ''}])}>
                        <Plus className="mr-1 h-3 w-3" /> Add Sponsor
                      </Button>
                   </div>
                   {sponsors.map((sponsor, index) => (
                     <div key={index} className="flex gap-2 items-center p-3 border border-white/10 bg-white/5 rounded-md">
                        <div className="flex-1 space-y-3">
                          <Input 
                            placeholder="Sponsor Name (e.g. VNG, NVIDIA)" 
                            value={sponsor.name} 
                            onChange={(e) => {
                              const newS = [...sponsors];
                              newS[index].name = e.target.value;
                              setSponsors(newS);
                            }} 
                            className="bg-black/40 h-8" 
                          />
                          <div className="flex gap-2">
                             <Input 
                               placeholder="External URL (or upload ->)" 
                               value={sponsor.url} 
                               disabled={!!sponsor.file}
                               onChange={(e) => {
                                 const newS = [...sponsors];
                                 newS[index].url = e.target.value;
                                 setSponsors(newS);
                               }} 
                               className="bg-black/40 h-8 text-xs flex-1" 
                             />
                             <div className="relative overflow-hidden w-24 shrink-0 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer h-8">
                                <span className="text-[10px] font-bold text-violet-300">
                                  {sponsor.file ? 'FILE ADDED' : 'UPLOAD'}
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const newS = [...sponsors];
                                      newS[index].file = file;
                                      newS[index].url = file.name;
                                      setSponsors(newS);
                                    }
                                  }}
                                />
                             </div>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10" onClick={() => setSponsors(s => s.filter((_, i) => i !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                     </div>
                   ))}
                   {sponsors.length === 0 && <div className="text-xs text-muted-foreground italic px-1">No custom sponsors added.</div>}
                 </div>
               </div>
            </div>

            {/* Config Phases (from admin) */}
            <div className="border border-white/10 rounded-lg p-0">
               <div className="p-3 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between">
                 <div className="mb-2 sm:mb-0">
                    <h3 className="font-bold cursor-pointer hover:underline text-orange-400">Escrow / Community Mode</h3>
                 </div>
               </div>
               <div className="p-4 space-y-4">
                 <div className="flex items-center gap-4 border border-white/10 p-3 bg-white/5 rounded-md">
                   <div className="flex-1">
                     <h4 className="font-semibold text-sm">Mode: {form.isCommunityMode ? 'Community Mode' : 'Escrow Secured'}</h4>
                     <p className="text-xs text-muted-foreground">
                       {form.isCommunityMode 
                         ? 'Giải đấu tự do. Không có quỹ Escrow bảo lãnh từ nền tảng. Phù hợp đánh giao hữu.' 
                         : 'Giải đấu bảo lãnh Escrow. Yêu cầu tạo quỹ tiền thưởng trước khi giải bắt đầu. An toàn, minh bạch.'}
                     </p>
                   </div>
                   <Button 
                     type="button" 
                     variant={form.isCommunityMode ? "outline" : "default"} 
                     className={!form.isCommunityMode ? "bg-emerald-600 hover:bg-emerald-700" : "border-orange-500/50 text-orange-400"}
                     onClick={() => setForm(p => ({ ...p, isCommunityMode: !p.isCommunityMode }))}
                   >
                     {form.isCommunityMode ? 'Switch to Escrow' : 'Switch to Community'}
                   </Button>
                 </div>
               </div>
            </div>

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
                                <SelectItem value="elimination">Elimination (Loại trực tiếp)</SelectItem>
                                <SelectItem value="points">Points (Tính điểm)</SelectItem>
                                <SelectItem value="swiss">Swiss (Thụy Sĩ / Tích luỹ)</SelectItem>
                                <SelectItem value="round_robin">Round Robin (Vòng tròn)</SelectItem>
                                <SelectItem value="checkmate">Checkmate (Ngưỡng điểm)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[9px] text-muted-foreground mt-1 px-1">
                              {phase.type === 'elimination' && "Loại trực tiếp những người bét bảng sau khi đánh xong."}
                              {phase.type === 'points' && "Chơi nhiều trận, sau khi xong thi tính tổng điểm để đi tiếp."}
                              {phase.type === 'swiss' && "Thi đấu nhiều trận, cộng dồn điểm, xào lobby sau mỗi trận."}
                              {phase.type === 'round_robin' && "Thi đấu vòng tròn tính điểm."}
                              {phase.type === 'checkmate' && "Người chơi phải đạt đủ số điểm ngưỡng, sau đó dành Top 1 để vô địch."}
                            </p>
                          </div>

                          {(phase.type === 'swiss' || phase.type === 'points') && (
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide text-orange-400">Matches to Play (Số Trận Đấu)</Label>
                              <Input type="number" min={1} value={phase.matchesPerRound} onChange={(e) => updatePhase(index, "matchesPerRound", parseInt(e.target.value))} className="bg-black/40 border-orange-500/50 focus-visible:ring-orange-500/50" />
                              <p className="text-[9px] text-muted-foreground mt-1 px-1">
                                {phase.type === 'points' && "Cùng lobby đánh N trận, cộng tổng điểm sau cùng."}
                                {phase.type === 'swiss' && "Xào lobby liên tục sau mỗi trận cho đến khi đủ số trận."}
                              </p>
                            </div>
                          )}
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
