"use client"
import { useState, useEffect } from "react"
import {
  Trophy, Plus, Pencil, Trash2, Loader2, Star, Target,
  Sword, Crown, Zap, Shield, Search
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  condition: string
  conditionValue: number
  points: number
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY"
  earnedCount?: number
  createdAt: string
}

const RARITY_CONFIG = {
  COMMON:    { label: "Common",    color: "slate",  hex: "#64748b" },
  RARE:      { label: "Rare",      color: "blue",   hex: "#3b82f6" },
  EPIC:      { label: "Epic",      color: "violet", hex: "#8b5cf6" },
  LEGENDARY: { label: "Legendary", color: "amber",  hex: "#f59e0b" },
}

const ICONS = [
  { name: "Trophy",  icon: Trophy },
  { name: "Star",    icon: Star },
  { name: "Target",  icon: Target },
  { name: "Sword",   icon: Sword },
  { name: "Crown",   icon: Crown },
  { name: "Zap",     icon: Zap },
  { name: "Shield",  icon: Shield },
]

const CONDITIONS = [
  { value: "matches_played",     label: "Matches Played" },
  { value: "tournaments_won",    label: "Tournaments Won" },
  { value: "top4_count",         label: "Top 4 Finishes" },
  { value: "first_place_count",  label: "1st Place Finishes" },
  { value: "tournaments_played", label: "Tournaments Played" },
  { value: "lobbies_played",     label: "Lobbies Played" },
  { value: "win_streak",         label: "Win Streak" },
]

// Mock data for display when backend not ready
const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: "1", name: "First Blood", description: "Play your first tournament match.", icon: "Sword", category: "participation", condition: "matches_played", conditionValue: 1, points: 10, rarity: "COMMON", earnedCount: 1240, createdAt: "2024-01-01" },
  { id: "2", name: "Rising Star", description: "Finish in the Top 4 five times.", icon: "Star", category: "performance", condition: "top4_count", conditionValue: 5, points: 50, rarity: "RARE", earnedCount: 380, createdAt: "2024-01-01" },
  { id: "3", name: "Champion", description: "Win a tournament match.", icon: "Trophy", category: "performance", condition: "first_place_count", conditionValue: 1, points: 100, rarity: "EPIC", earnedCount: 145, createdAt: "2024-01-01" },
]

export default function PartnerAchievementTab() {
  const t = useTranslations("common")
  const [achievements, setAchievements] = useState<Achievement[]>(MOCK_ACHIEVEMENTS)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [rarityFilter, setRarityFilter] = useState("All")
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Achievement | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Achievement | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    name: "", description: "", icon: "Trophy", category: "performance",
    condition: "matches_played", conditionValue: 1, points: 50, rarity: "COMMON" as Achievement["rarity"]
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.get('/partner/achievements')
        if (res.data?.achievements?.length > 0) setAchievements(res.data.achievements)
      } catch {
        // Use mock data if endpoint not ready
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (a: Achievement) => {
    setEditTarget(a)
    setForm({ name: a.name, description: a.description, icon: a.icon, category: a.category, condition: a.condition, conditionValue: a.conditionValue, points: a.points, rarity: a.rarity })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) return toast({ title: "Name is required", variant: "destructive" })
    setSaving(true)
    try {
      if (editTarget) {
        // await api.put(`/partner/achievements/${editTarget.id}`, form)
        setAchievements(prev => prev.map(a => a.id === editTarget.id ? { ...a, ...form } : a))
        toast({ title: t("achievement_updated", { defaultValue: "Achievement Updated" }) })
      } else {
        // const res = await api.post('/partner/achievements', form).catch(() => null)
        const res = null;
        const newAch: Achievement = res?.data?.achievement || { ...form, id: Date.now().toString(), earnedCount: 0, createdAt: new Date().toISOString() }
        setAchievements(prev => [newAch, ...prev])
        toast({ title: t("achievement_created", { defaultValue: "Achievement Created" }) })
      }
      setFormOpen(false)
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      // await api.delete(`/partner/achievements/${deleteConfirm.id}`).catch(() => null)
      setAchievements(prev => prev.filter(a => a.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      toast({ title: "Deleted" })
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" })
    }
  }

  const filtered = achievements.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchRarity = rarityFilter === "All" || a.rarity === rarityFilter
    return matchSearch && matchRarity
  })

  // Stats
  const totalEarned = achievements.reduce((s, a) => s + (a.earnedCount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Custom Achievements</h2>
          <p className="text-muted-foreground text-sm">Create and manage your own custom achievements for tournament participants.</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 shrink-0">
          <Plus className="mr-2 h-4 w-4" /> {t("new_achievement", { defaultValue: "New Achievement" })}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("total", { defaultValue: "Total" }), value: achievements.length, color: "slate" },
          { label: t("legendary", { defaultValue: "Legendary" }), value: achievements.filter(a => a.rarity === "LEGENDARY").length, color: "amber" },
          { label: t("epic", { defaultValue: "Epic" }), value: achievements.filter(a => a.rarity === "EPIC").length, color: "violet" },
          { label: t("total_earned", { defaultValue: "Total Earned" }), value: totalEarned.toLocaleString(), color: "emerald" },
        ].map(s => (
          <Card key={s.label} className={`bg-${s.color}-500/10 border-${s.color}-500/20`}>
            <CardContent className="p-3">
              <p className={`text-[10px] text-${s.color}-400 font-semibold uppercase`}>{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input placeholder={t("search_achievements", { defaultValue: "Search achievements..." })} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={rarityFilter} onValueChange={setRarityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">{t("all_rarities", { defaultValue: "All Rarities" })}</SelectItem>
            {Object.keys(RARITY_CONFIG).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Achievement Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => {
          const rarity = RARITY_CONFIG[a.rarity]
          const IconComp = ICONS.find(i => i.name === a.icon)?.icon || Trophy
          return (
            <Card key={a.id} className={`bg-gradient-to-br from-${rarity.color}-500/10 to-${rarity.color}-600/5 border-${rarity.color}-500/20 hover:border-${rarity.color}-500/40 transition-colors`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full bg-${rarity.color}-500/20 flex items-center justify-center shrink-0`}>
                      <IconComp className={`h-5 w-5 text-${rarity.color}-400`} />
                    </div>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <Badge variant="outline" className={`text-[9px] px-1.5 mt-0.5 text-${rarity.color}-400 border-${rarity.color}-500/30`}>{a.rarity}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeleteConfirm(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{a.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">{CONDITIONS.find(c => c.value === a.condition)?.label}</span>
                    {" "}≥ <span className="font-medium text-foreground">{a.conditionValue}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Zap className="h-3 w-3" />{a.points} pts
                  </div>
                </div>
                {a.earnedCount !== undefined && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {t("earned_by_players", { count: a.earnedCount, defaultValue: `Earned by ${a.earnedCount} players` })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("edit_achievement", { defaultValue: "Edit Achievement" }) : t("new_achievement", { defaultValue: "New Achievement" })}</DialogTitle>
            <DialogDescription>{t("configure_achievement_desc", { defaultValue: "Configure the achievement condition and rewards." })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. First Win" />
              </div>
              <div className="space-y-2">
                <Label>Rarity</Label>
                <Select value={form.rarity} onValueChange={v => setForm(p => ({ ...p, rarity: v as Achievement["rarity"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(RARITY_CONFIG).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="How do players earn this?" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={v => setForm(p => ({ ...p, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICONS.map(i => <SelectItem key={i.name} value={i.name}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points Reward</Label>
                <Input type="number" min={0} value={form.points} onChange={e => setForm(p => ({ ...p, points: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm(p => ({ ...p, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Threshold Value</Label>
                <Input type="number" min={1} value={form.conditionValue} onChange={e => setForm(p => ({ ...p, conditionValue: parseInt(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t("cancel", { defaultValue: "Cancel" })}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editTarget ? t("save_changes", { defaultValue: "Save Changes" }) : t("create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete_achievement", { defaultValue: "Delete Achievement" })}</DialogTitle>
            <DialogDescription>{t("delete_achievement_confirm", { name: deleteConfirm?.name || "", defaultValue: `Delete ${deleteConfirm?.name}? This will remove it from all player profiles.` })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t("cancel", { defaultValue: "Cancel" })}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("delete", { defaultValue: "Delete" })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
