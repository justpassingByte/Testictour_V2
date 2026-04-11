"use client"
import { useState, useEffect } from "react"
import {
  Gift, Plus, Pencil, Trash2, Loader2, Coins, Star,
  ChevronUp, Search, Crown, Flame
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import api from "@/app/lib/apiConfig"
import { useTranslations } from "next-intl"

interface LoyaltyTier {
  id: string
  name: string
  minPoints: number
  maxPoints: number | null
  multiplier: number
  color: string
  benefits: string[]
}

interface LoyaltyItem {
  id: string
  name: string
  description: string
  type: "discount" | "bonus_entry" | "cosmetic" | "cash_back"
  cost: number
  stock: number | null
  redeemCount: number
  active: boolean
}

// Mock tiers — reflects a real loyalty system
const MOCK_TIERS: LoyaltyTier[] = [
  { id: "1", name: "Bronze",   minPoints: 0,    maxPoints: 499,  multiplier: 1.0, color: "#cd7f32", benefits: ["Basic access", "Standard support"] },
  { id: "2", name: "Silver",   minPoints: 500,  maxPoints: 1999, multiplier: 1.25, color: "#94a3b8", benefits: ["1.25× points multiplier", "Priority support"] },
  { id: "3", name: "Gold",     minPoints: 2000, maxPoints: 4999, multiplier: 1.5, color: "#eab308", benefits: ["1.5× points multiplier", "Early tournament access", "Badge"] },
  { id: "4", name: "Platinum", minPoints: 5000, maxPoints: null, multiplier: 2.0, color: "#a855f7", benefits: ["2× points multiplier", "Exclusive tournaments", "Custom tag", "VIP support"] },
]

const MOCK_ITEMS: LoyaltyItem[] = [
  { id: "1", name: "Entry Fee Discount 20%", description: "20% off tournament entry fee for 7 days.", type: "discount",     cost: 200,  stock: null, redeemCount: 312, active: true },
  { id: "2", name: "Free Lobby Entry",       description: "Enter one MiniTour lobby for free.",    type: "bonus_entry",   cost: 150,  stock: 100,  redeemCount: 88,  active: true },
  { id: "3", name: "Champion Avatar Frame",  description: "Exclusive golden avatar frame.",          type: "cosmetic",      cost: 500,  stock: null, redeemCount: 45,  active: true },
  { id: "4", name: "Cash Back 50k VND",      description: "50,000 VND added to your balance.",      type: "cash_back",     cost: 1000, stock: 50,   redeemCount: 22,  active: true },
]

const TYPE_COLORS: Record<string, string> = {
  discount: "emerald", bonus_entry: "blue", cosmetic: "violet", cash_back: "amber"
}

export default function AdminLoyaltyPage() {
  const t = useTranslations("common")
  const [tiers, setTiers] = useState<LoyaltyTier[]>(MOCK_TIERS)
  const [items, setItems] = useState<LoyaltyItem[]>(MOCK_ITEMS)
  const [loading, setLoading] = useState(false)
  const [tierFormOpen, setTierFormOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editTier, setEditTier] = useState<LoyaltyTier | null>(null)
  const [editItem, setEditItem] = useState<LoyaltyItem | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyTierForm = { name: "", minPoints: 0, maxPoints: null as number | null, multiplier: 1.0, color: "#64748b", benefits: [""] }
  const emptyItemForm = { name: "", description: "", type: "discount" as LoyaltyItem["type"], cost: 100, stock: null as number | null, active: true }
  const [tierForm, setTierForm] = useState(emptyTierForm)
  const [itemForm, setItemForm] = useState(emptyItemForm)

  // Fetch real data if endpoint exists
  useEffect(() => {
    const fetch = async () => {
      try {
        const [t, it] = await Promise.all([
          api.get('/admin/loyalty/tiers').catch(() => null),
          api.get('/admin/loyalty/items').catch(() => null),
        ])
        if (t?.data?.tiers?.length > 0) setTiers(t!.data.tiers)
        if (it?.data?.items?.length > 0) setItems(it!.data.items)
      } catch {}
    }
    fetch()
  }, [])

  const openTierCreate = () => { setEditTier(null); setTierForm(emptyTierForm); setTierFormOpen(true) }
  const openTierEdit = (t: LoyaltyTier) => {
    setEditTier(t)
    setTierForm({ name: t.name, minPoints: t.minPoints, maxPoints: t.maxPoints, multiplier: t.multiplier, color: t.color, benefits: t.benefits })
    setTierFormOpen(true)
  }

  const openItemCreate = () => { setEditItem(null); setItemForm(emptyItemForm); setItemFormOpen(true) }
  const openItemEdit = (i: LoyaltyItem) => {
    setEditItem(i)
    setItemForm({ name: i.name, description: i.description, type: i.type, cost: i.cost, stock: i.stock, active: i.active })
    setItemFormOpen(true)
  }

  const saveTier = async () => {
    setSaving(true)
    try {
      if (editTier) {
        setTiers(prev => prev.map(t => t.id === editTier.id ? { ...t, ...tierForm } : t))
      } else {
        setTiers(prev => [...prev, { ...tierForm, id: Date.now().toString() }])
      }
      setTierFormOpen(false)
      toast({ title: editTier ? t("tier_updated", { defaultValue: "Tier Updated" }) : t("tier_created", { defaultValue: "Tier Created" }) })
    } finally { setSaving(false) }
  }

  const saveItem = async () => {
    setSaving(true)
    try {
      if (editItem) {
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...itemForm } : i))
      } else {
        setItems(prev => [...prev, { ...itemForm, id: Date.now().toString(), redeemCount: 0 }])
      }
      setItemFormOpen(false)
      toast({ title: editItem ? t("item_updated", { defaultValue: "Item Updated" }) : t("item_created", { defaultValue: "Item Created" }) })
    } finally { setSaving(false) }
  }

  const deleteTier = (id: string) => { setTiers(prev => prev.filter(t => t.id !== id)); toast({ title: t("tier_deleted", { defaultValue: "Tier Deleted" }) }) }
  const deleteItem = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast({ title: t("item_deleted", { defaultValue: "Item Deleted" }) }) }
  const toggleItem = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i))

  const totalRedeems = items.reduce((s, i) => s + i.redeemCount, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("loyalty_program", { defaultValue: "Loyalty Program" })}</h1>
        <p className="text-muted-foreground text-sm">{t("manage_loyalty_desc", { defaultValue: "Manage loyalty tiers and the reward shop." })}</p>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("tiers", { defaultValue: "Tiers" }),          value: tiers.length,                          color: "violet", icon: Crown },
          { label: t("reward_items", { defaultValue: "Reward Items" }),   value: items.length,                          color: "blue",   icon: Gift },
          { label: t("active_items", { defaultValue: "Active Items" }),   value: items.filter(i => i.active).length,    color: "emerald",icon: Star },
          { label: t("total_redeems", { defaultValue: "Total Redeems" }),  value: totalRedeems.toLocaleString(),          color: "amber",  icon: Flame },
        ].map(s => (
          <Card key={s.label} className={`bg-${s.color}-500/10 border-${s.color}-500/20`}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className={`text-[10px] text-${s.color}-400 font-semibold uppercase`}>{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className={`h-5 w-5 text-${s.color}-400`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers"><Crown className="mr-1.5 h-4 w-4" />{t("tiers", { defaultValue: "Tiers" })}</TabsTrigger>
          <TabsTrigger value="rewards"><Gift className="mr-1.5 h-4 w-4" />{t("reward_shop", { defaultValue: "Reward Shop" })}</TabsTrigger>
        </TabsList>

        {/* ── TIERS TAB ── */}
        <TabsContent value="tiers" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openTierCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              <Plus className="mr-2 h-4 w-4" /> {t("add_tier", { defaultValue: "Add Tier" })}
            </Button>
          </div>
          <div className="space-y-3">
            {tiers
              .sort((a, b) => a.minPoints - b.minPoints)
              .map((tier, i) => (
              <Card key={tier.id} className="bg-card/60 border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: tier.color + '30', border: `2px solid ${tier.color}` }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: tier.color }}>{tier.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {tier.multiplier}× points
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tier.minPoints.toLocaleString()} – {tier.maxPoints ? tier.maxPoints.toLocaleString() : '∞'} pts
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTierEdit(tier)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={() => deleteTier(tier.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tier.benefits.map((b, j) => (
                      <Badge key={j} variant="outline" className="text-[10px] text-muted-foreground">{b}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── REWARDS TAB ── */}
        <TabsContent value="rewards" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openItemCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              <Plus className="mr-2 h-4 w-4" /> {t("add_reward", { defaultValue: "Add Reward" })}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => {
              const typeColor = TYPE_COLORS[item.type] || "slate"
              return (
                <Card key={item.id} className={`bg-card/60 border-white/10 ${!item.active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Gift className={`h-4 w-4 text-${typeColor}-400`} />
                          <span className="font-semibold">{item.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openItemEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-amber-400">{item.cost}</span>
                        <span className="text-muted-foreground">pts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] text-${typeColor}-400 border-${typeColor}-500/30`}>
                          {item.type.replace('_', ' ')}
                        </Badge>
                        {item.stock !== null && (
                          <span className="text-xs text-muted-foreground">{item.stock} {t("left", { defaultValue: "left" })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.redeemCount} {t("redeems", { defaultValue: "redeems" })}</span>
                      <Button
                        variant={item.active ? "outline" : "ghost"} size="sm"
                        className={item.active ? "h-7 text-xs border-green-500/30 text-green-400" : "h-7 text-xs text-muted-foreground"}
                        onClick={() => toggleItem(item.id)}
                      >
                        {item.active ? t("status_active", { defaultValue: "Active" }) : t("status_inactive", { defaultValue: "Inactive" })}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Tier Form Dialog */}
      <Dialog open={tierFormOpen} onOpenChange={setTierFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTier ? t("edit_tier", { defaultValue: "Edit Tier" }) : t("new_tier", { defaultValue: "New Tier" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>{t("tier_name", { defaultValue: "Tier Name" })}</Label>
                <Input value={tierForm.name} onChange={e => setTierForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Gold" />
              </div>
              <div className="space-y-2">
                <Label>{t("color_hex", { defaultValue: "Color (hex)" })}</Label>
                <div className="flex gap-2">
                  <input type="color" value={tierForm.color} onChange={e => setTierForm(p => ({ ...p, color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer bg-transparent border border-white/20" />
                  <Input value={tierForm.color} onChange={e => setTierForm(p => ({ ...p, color: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-3">
              <div className="space-y-2">
                <Label>{t("min_points", { defaultValue: "Min Points" })}</Label>
                <Input type="number" min={0} value={tierForm.minPoints} onChange={e => setTierForm(p => ({ ...p, minPoints: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("max_points", { defaultValue: "Max Points" })}</Label>
                <Input type="number" min={0} placeholder="∞" value={tierForm.maxPoints ?? ""} onChange={e => setTierForm(p => ({ ...p, maxPoints: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("multiplier", { defaultValue: "Multiplier" })}</Label>
                <Input type="number" step="0.25" min={1} value={tierForm.multiplier} onChange={e => setTierForm(p => ({ ...p, multiplier: parseFloat(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("benefits_one_per_line", { defaultValue: "Benefits (one per line)" })}</Label>
              <Textarea
                rows={4}
                value={tierForm.benefits.join('\n')}
                onChange={e => setTierForm(p => ({ ...p, benefits: e.target.value.split('\n').filter(Boolean) }))}
                placeholder="Priority support&#10;1.5× point multiplier&#10;..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierFormOpen(false)}>{t("cancel")}</Button>
            <Button onClick={saveTier} disabled={saving} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editTier ? t("save", { defaultValue: "Save" }) : t("create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Form Dialog */}
      <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? t("edit_reward", { defaultValue: "Edit Reward" }) : t("new_reward", { defaultValue: "New Reward" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("name", { defaultValue: "Name" })}</Label>
              <Input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 20% Discount" />
            </div>
            <div className="space-y-2">
              <Label>{t("description", { defaultValue: "Description" })}</Label>
              <Textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>{t("type", { defaultValue: "Type" })}</Label>
                <Select value={itemForm.type} onValueChange={v => setItemForm(p => ({ ...p, type: v as LoyaltyItem["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">{t("discount", { defaultValue: "Discount" })}</SelectItem>
                    <SelectItem value="bonus_entry">{t("bonus_entry", { defaultValue: "Bonus Entry" })}</SelectItem>
                    <SelectItem value="cosmetic">{t("cosmetic", { defaultValue: "Cosmetic" })}</SelectItem>
                    <SelectItem value="cash_back">{t("cash_back", { defaultValue: "Cash Back" })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("points_cost", { defaultValue: "Points Cost" })}</Label>
                <Input type="number" min={1} value={itemForm.cost} onChange={e => setItemForm(p => ({ ...p, cost: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("stock_unlimited", { defaultValue: "Stock (blank = unlimited)" })}</Label>
              <Input type="number" min={0} placeholder="Unlimited" value={itemForm.stock ?? ""} onChange={e => setItemForm(p => ({ ...p, stock: e.target.value ? parseInt(e.target.value) : null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemFormOpen(false)}>{t("cancel")}</Button>
            <Button onClick={saveItem} disabled={saving} className="bg-gradient-to-r from-violet-600 to-cyan-600">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editItem ? t("save", { defaultValue: "Save" }) : t("create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
