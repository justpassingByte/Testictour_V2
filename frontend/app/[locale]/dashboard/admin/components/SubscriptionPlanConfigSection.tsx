"use client";
import { useState, useEffect } from "react";
import { Crown, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import api from "@/app/lib/apiConfig";

interface PlanConfig {
    id: string; plan: string;
    monthlyPrice: number; annualPrice: number;
    maxLobbies: number; maxPlayersPerLobby: number; maxTournamentsPerMonth: number;
    features: Record<string, boolean>;
}

const PLAN_STYLES: Record<string, { badge: string; header: string }> = {
    FREE: { badge: "bg-slate-500/10 text-slate-400 border-slate-500/20", header: "border-slate-500/20" },
    PRO: { badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", header: "border-yellow-500/20" },
    ENTERPRISE: { badge: "bg-purple-500/10 text-purple-500 border-purple-500/20", header: "border-purple-500/20" },
};

const FEATURE_LABELS: Record<string, string> = {
    customBranding: "Custom Branding",
    analyticsExport: "Analytics Export",
    prioritySupport: "Priority Support",
    revenueShare: "Revenue Share",
};

export default function SubscriptionPlanConfigSection() {
    const { toast } = useToast();
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [drafts, setDrafts] = useState<Record<string, PlanConfig>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        api.get("/admin/settings/plans")
            .then(res => {
                const p: PlanConfig[] = res.data.plans;
                setPlans(p);
                const d: Record<string, PlanConfig> = {};
                p.forEach(plan => { d[plan.plan] = { ...plan, features: { ...plan.features } }; });
                setDrafts(d);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const updateDraft = (plan: string, field: keyof PlanConfig, value: any) => {
        setDrafts(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }));
    };

    const updateFeature = (plan: string, feature: string, value: boolean) => {
        setDrafts(prev => ({
            ...prev,
            [plan]: { ...prev[plan], features: { ...prev[plan].features, [feature]: value } },
        }));
    };

    const handleSave = async (planKey: string) => {
        setSaving(planKey);
        try {
            const d = drafts[planKey];
            await api.put(`/admin/settings/plans/${planKey}`, {
                monthlyPrice: d.monthlyPrice,
                annualPrice: d.annualPrice,
                maxLobbies: d.maxLobbies,
                maxPlayersPerLobby: d.maxPlayersPerLobby,
                maxTournamentsPerMonth: d.maxTournamentsPerMonth,
                features: d.features,
            });
            toast({ title: `${planKey} plan updated`, description: "Changes take effect immediately for all partners on this plan." });
        } catch {
            toast({ title: "Error", description: "Failed to update plan.", variant: "destructive" });
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading plans...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {plans.map(p => {
                const d = drafts[p.plan];
                if (!d) return null;
                const style = PLAN_STYLES[p.plan] ?? PLAN_STYLES.FREE;

                return (
                    <Card key={p.plan} className={`bg-black/20 border ${style.header}`}>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Crown className="h-4 w-4" />
                                    {p.plan}
                                </span>
                                <Badge variant="outline" className={`text-xs ${style.badge}`}>{p.plan}</Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">Edit limits and features for this plan</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Pricing */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing</p>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Monthly ($)</label>
                                    <Input type="number" min={0} value={d.monthlyPrice} onChange={e => updateDraft(p.plan, 'monthlyPrice', parseFloat(e.target.value))} className="bg-black/20 border-white/10 h-8 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Annual ($)</label>
                                    <Input type="number" min={0} value={d.annualPrice} onChange={e => updateDraft(p.plan, 'annualPrice', parseFloat(e.target.value))} className="bg-black/20 border-white/10 h-8 text-sm" />
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Limits</p>
                                {[
                                    { field: 'maxLobbies' as const, label: 'Max Lobbies' },
                                    { field: 'maxPlayersPerLobby' as const, label: 'Max Players/Lobby' },
                                    { field: 'maxTournamentsPerMonth' as const, label: 'Max Tournaments/Month' },
                                ].map(({ field, label }) => (
                                    <div key={field} className="space-y-1">
                                        <label className="text-xs text-muted-foreground">{label} (-1 = unlimited)</label>
                                        <Input type="number" min={-1} value={d[field]} onChange={e => updateDraft(p.plan, field, parseInt(e.target.value))} className="bg-black/20 border-white/10 h-8 text-sm" />
                                    </div>
                                ))}
                            </div>

                            {/* Features */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</p>
                                {Object.entries(d.features).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <label className="text-xs">{FEATURE_LABELS[key] ?? key}</label>
                                        <Switch checked={!!val} onCheckedChange={v => updateFeature(p.plan, key, v)} />
                                    </div>
                                ))}
                            </div>

                            <Button size="sm" className="w-full mt-2" onClick={() => handleSave(p.plan)} disabled={saving === p.plan}>
                                {saving === p.plan ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                                Save {p.plan}
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
