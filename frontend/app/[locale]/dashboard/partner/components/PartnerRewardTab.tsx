"use client"

import { useState, useEffect } from "react"
import {
  Gift, Plus, Pencil, Trash2, Loader2, Search,
  Coins, Trophy, Award, Star, DollarSign, Calendar, Eye, EyeOff
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import api from "@/app/lib/apiConfig"

interface PartnerReward {
  id: string
  title: string
  description?: string
  type: string
  value: number
  currency: string
  imageUrl?: string
  isActive: boolean
  conditions?: any
  maxRedemptions?: number
  currentRedemptions: number
  validFrom: string
  validUntil?: string
  createdAt: string
  _count?: { redemptions: number }
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  custom: { label: "Custom Reward", icon: Gift, color: "violet" },
  bonus: { label: "Bonus Prize", icon: Coins, color: "amber" },
  badge: { label: "Badge", icon: Award, color: "cyan" },
  prize: { label: "Prize", icon: Trophy, color: "emerald" },
}

export default function PartnerRewardTab() {
  const [rewards, setRewards] = useState<PartnerReward[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PartnerReward | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PartnerReward | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    title: "", description: "", type: "custom", value: 0, currency: "coins",
    imageUrl: "", maxRedemptions: "", validFrom: "", validUntil: "",
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchRewards()
  }, [])

  const fetchRewards = async () => {
    setLoading(true)
    try {
      const res = await api.get('/partner/rewards')
      if (res.data?.data) setRewards(res.data.data)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (r: PartnerReward) => {
    setEditTarget(r)
    setForm({
      title: r.title, description: r.description || "", type: r.type,
      value: r.value, currency: r.currency, imageUrl: r.imageUrl || "",
      maxRedemptions: r.maxRedemptions?.toString() || "", 
      validFrom: r.validFrom ? new Date(r.validFrom).toISOString().slice(0, 16) : "",
      validUntil: r.validUntil ? new Date(r.validUntil).toISOString().slice(0, 16) : "",
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.title) return toast({ title: "Title is required", variant: "destructive" })
    setSaving(true)
    try {
      const payload = {
        ...form,
        maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : null,
      }
      if (editTarget) {
        const res = await api.put(`/partner/rewards/${editTarget.id}`, payload)
        setRewards(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...res.data.data } : r))
        toast({ title: "Reward Updated" })
      } else {
        const res = await api.post('/partner/rewards', payload)
        setRewards(prev => [res.data.data, ...prev])
        toast({ title: "Reward Created" })
      }
      setFormOpen(false)
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.response?.data?.error || err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await api.delete(`/partner/rewards/${deleteConfirm.id}`)
      setRewards(prev => prev.filter(r => r.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      toast({ title: "Reward Deleted" })
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" })
    }
  }

  const toggleActive = async (reward: PartnerReward) => {
    try {
      await api.put(`/partner/rewards/${reward.id}`, { isActive: !reward.isActive })
      setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, isActive: !r.isActive } : r))
    } catch {
      toast({ title: "Update Failed", variant: "destructive" })
    }
  }

  const filtered = rewards.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeRewards = rewards.filter(r => r.isActive).length
  const totalRedemptions = rewards.reduce((s, r) => s + r.currentRedemptions, 0)

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading rewards...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-violet-400" />
            My Rewards
          </h2>
          <p className="text-muted-foreground text-sm">Create and manage custom rewards for your tournament participants.</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 shrink-0">
          <Plus className="mr-2 h-4 w-4" /> New Reward
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-violet-500/10 border-violet-500/20">
          <CardContent className="p-3">
            <p className="text-[10px] text-violet-400 font-semibold uppercase">Total</p>
            <p className="text-2xl font-bold">{rewards.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-3">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase">Active</p>
            <p className="text-2xl font-bold">{activeRewards}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-3">
            <p className="text-[10px] text-amber-400 font-semibold uppercase">Redemptions</p>
            <p className="text-2xl font-bold">{totalRedemptions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Input placeholder="Search rewards..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Reward Cards */}
      {filtered.length === 0 ? (
        <Card className="bg-card/60 border-dashed border-white/10">
          <CardContent className="text-center py-12">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Rewards Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first custom reward to attract more players!</p>
            <Button onClick={openCreate} variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
              <Plus className="mr-2 h-4 w-4" /> Create First Reward
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((reward) => {
            const cfg = TYPE_CONFIG[reward.type] || TYPE_CONFIG.custom
            const IconComp = cfg.icon
            const isExpired = reward.validUntil && new Date(reward.validUntil) < new Date()

            return (
              <Card key={reward.id} className={`bg-gradient-to-br from-${cfg.color}-500/10 to-${cfg.color}-600/5 border-${cfg.color}-500/20 hover:border-${cfg.color}-500/40 transition-all ${!reward.isActive ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full bg-${cfg.color}-500/20 flex items-center justify-center shrink-0`}>
                        <IconComp className={`h-5 w-5 text-${cfg.color}-400`} />
                      </div>
                      <div>
                        <p className="font-semibold">{reward.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[9px] px-1.5 text-${cfg.color}-400 border-${cfg.color}-500/30`}>
                            {cfg.label}
                          </Badge>
                          {isExpired && <Badge variant="destructive" className="text-[9px] px-1.5">Expired</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(reward)} title={reward.isActive ? "Deactivate" : "Activate"}>
                        {reward.isActive ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(reward)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteConfirm(reward)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {reward.description && <p className="text-xs text-muted-foreground mb-3">{reward.description}</p>}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      {reward.currency === 'usd' ? <DollarSign className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
                      {reward.value} {reward.currency}
                    </div>
                    <span className="text-muted-foreground">
                      {reward.currentRedemptions}{reward.maxRedemptions ? `/${reward.maxRedemptions}` : ''} redeemed
                    </span>
                  </div>
                  {reward.validUntil && (
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Until {new Date(reward.validUntil).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Reward" : "New Reward"}</DialogTitle>
            <DialogDescription>Create a custom reward for your tournament participants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. MVP Bonus" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="How can players earn this?" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" min={0} value={form.value} onChange={e => setForm(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coins">Coins</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Redemptions</Label>
                <Input type="number" min={0} value={form.maxRedemptions} onChange={e => setForm(p => ({ ...p, maxRedemptions: e.target.value }))} placeholder="∞" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input type="datetime-local" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until (optional)</Label>
                <Input type="datetime-local" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editTarget ? "Save Changes" : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>Delete &quot;{deleteConfirm?.title}&quot;? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
