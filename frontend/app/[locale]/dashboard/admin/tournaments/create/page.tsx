"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2, Trophy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { TournamentService } from "@/app/services/TournamentService"
import { useUserStore } from "@/app/stores/userStore"
import { useTranslations } from "next-intl"

interface PhaseFormData {
  name: string
  type: string
  lobbySize: number
  numberOfRounds: number
  advancementType: string
  advancementValue: number
}

export default function CreateTournamentPage() {
  const t = useTranslations("common")
  const router = useRouter()
  const { currentUser } = useUserStore()
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: "",
    description: "",
    region: "ASIA",
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
    updateForm("image", "")
  }

  const [phases, setPhases] = useState<PhaseFormData[]>([
    { name: "Phase 1", type: "elimination", lobbySize: 8, numberOfRounds: 1, advancementType: "top_n_scores", advancementValue: 4 }
  ])

  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.startTime || !form.registrationDeadline) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const phaseConfigs = phases.map((p, i) => ({
        id: `phase-${i + 1}`,
        name: p.name,
        type: p.type,
        lobbySize: p.lobbySize,
        numberOfRounds: p.numberOfRounds,
        advancementCondition: { type: p.advancementType, value: p.advancementValue },
      }))

      await TournamentService.create({
        name: form.name,
        description: form.description,
        image: imageFile ? (imagePreview || form.image || undefined) : (form.image || undefined),
        startTime: new Date(form.startTime),
        maxPlayers: form.maxPlayers,
        organizerId: currentUser?.id || "",
        roundsTotal: phases.reduce((sum, p) => sum + p.numberOfRounds, 0),
        entryFee: form.entryFee,
        registrationDeadline: new Date(form.registrationDeadline),
        hostFeePercent: form.hostFeePercent,
        expectedParticipants: form.maxPlayers,
        config: { phases: phaseConfigs as any },
      })

      toast({ title: "Tournament Created", description: `${form.name} has been created successfully.` })
      router.push("/dashboard/admin/tournaments")
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message || "Failed to create tournament.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/tournaments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("create_tournament")}</h1>
          <p className="text-muted-foreground text-sm">{t("tournament_format")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-card/60 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-violet-400" /> {t("tournament_name")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("tournament_name")} *</Label>
                <Input id="name" placeholder="e.g. TFT Weekly Championship" value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">{t("region")}</Label>
                <Select value={form.region} onValueChange={(v) => updateForm("region", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASIA">Asia</SelectItem>
                    <SelectItem value="AMERICAS">Americas</SelectItem>
                    <SelectItem value="EUROPE">Europe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" placeholder="Describe the tournament rules and format..." value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-white/10 group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors">
                  <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-muted-foreground">or paste URL</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <Input
                placeholder="https://example.com/image.jpg"
                value={form.image}
                onChange={(e) => { updateForm("image", e.target.value); if (e.target.value) setImagePreview(e.target.value) }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="bg-card/60 border-white/10">
          <CardHeader>
            <CardTitle>{t("tournament_schedule")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">{t("start_date")} *</Label>
                <Input id="startTime" type="datetime-local" value={form.startTime} onChange={(e) => updateForm("startTime", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">{t("registration_deadline")} *</Label>
                <Input id="registrationDeadline" type="datetime-local" value={form.registrationDeadline} onChange={(e) => updateForm("registrationDeadline", e.target.value)} required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players & Fees */}
        <Card className="bg-card/60 border-white/10">
          <CardHeader>
            <CardTitle>{t("players")} & {t("registration_fee")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxPlayers">{t("max_players")}</Label>
                <Select value={form.maxPlayers.toString()} onValueChange={(v) => updateForm("maxPlayers", parseInt(v))}>
                  <SelectTrigger id="maxPlayers"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16 Players</SelectItem>
                    <SelectItem value="32">32 Players</SelectItem>
                    <SelectItem value="48">48 Players</SelectItem>
                    <SelectItem value="64">64 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entryFee">{t("registration_fee")}</Label>
                <Input id="entryFee" type="number" min={0} value={form.entryFee} onChange={(e) => updateForm("entryFee", parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostFeePercent">Host Fee (%)</Label>
                <Input id="hostFeePercent" type="number" min={0} max={1} step={0.01} value={form.hostFeePercent} onChange={(e) => updateForm("hostFeePercent", parseFloat(e.target.value))} />
              </div>
            </div>
            {form.entryFee > 0 && (
              <div className="text-sm text-muted-foreground bg-violet-500/5 border border-violet-500/10 rounded-lg p-3">
                Estimated prize pool: <strong className="text-violet-400">
                  {(form.maxPlayers * form.entryFee * (1 - form.hostFeePercent)).toLocaleString()} Credits
                </strong>
                {" "}(at full registration)
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase Configuration */}
        <Card className="bg-card/60 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("tournament_format")}</CardTitle>
              <CardDescription>{t("point_system")}</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addPhase}>
              <Plus className="mr-2 h-4 w-4" /> {t("advanced")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {phases.map((phase, index) => (
              <Card key={index} className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Phase {index + 1}</h4>
                    {phases.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => removePhase(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={phase.name} onChange={(e) => updatePhase(index, "name", e.target.value)} placeholder="Phase name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={phase.type} onValueChange={(v) => updatePhase(index, "type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elimination">Elimination</SelectItem>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="swiss">Swiss</SelectItem>
                          <SelectItem value="round_robin">Round Robin</SelectItem>
                          <SelectItem value="checkmate">Checkmate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lobby Size</Label>
                      <Input type="number" min={2} max={8} value={phase.lobbySize} onChange={(e) => updatePhase(index, "lobbySize", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rounds</Label>
                      <Input type="number" min={1} value={phase.numberOfRounds} onChange={(e) => updatePhase(index, "numberOfRounds", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Advancement</Label>
                      <Select value={phase.advancementType} onValueChange={(v) => updatePhase(index, "advancementType", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top_n_scores">Top N Scores</SelectItem>
                          <SelectItem value="placement">By Placement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Advance Top</Label>
                      <Input type="number" min={1} value={phase.advancementValue} onChange={(e) => updatePhase(index, "advancementValue", parseInt(e.target.value))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/admin/tournaments">
            <Button variant="outline" type="button">{t("cancel")}</Button>
          </Link>
          <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
            {t("create_tournament")}
          </Button>
        </div>
      </form>
    </div>
  )
}
