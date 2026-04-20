"use client";
import { useState, useEffect } from "react";
import { Crown, Loader2, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import api from "@/app/lib/apiConfig";

interface PlanConfig {
    id: string; plan: string;
    monthlyPrice: number; annualPrice: number; earlyAccessPrice: number | null;
    maxLobbies: number; maxTournamentSize: number; maxTournamentsPerMonth: number;
    platformFeePercent: number;
    features: Record<string, boolean>;
}

const PLAN_STYLES: Record<string, { badge: string; header: string }> = {
    STARTER: { badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", header: "border-emerald-500/20" },
    PRO: { badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", header: "border-yellow-500/20" },
    ENTERPRISE: { badge: "bg-blue-500/10 text-blue-500 border-blue-500/20", header: "border-blue-500/20" },
};



export default function SubscriptionPlanConfigSection() {
    const { toast } = useToast();
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [drafts, setDrafts] = useState<Record<string, PlanConfig>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [newFeatures, setNewFeatures] = useState<Record<string, string>>({});

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

    const addFeature = (plan: string, featureName: string) => {
        setDrafts(prev => ({
            ...prev,
            [plan]: { ...prev[plan], features: { ...prev[plan].features, [featureName]: true } },
        }));
        setNewFeatures(prev => ({ ...prev, [plan]: '' }));
    };

    const removeFeature = (plan: string, featureKey: string) => {
        setDrafts(prev => {
            const d = { ...prev };
            const features = { ...d[plan].features };
            delete features[featureKey];
            d[plan] = { ...d[plan], features };
            return d;
        });
    };

    const handleSave = async (planKey: string) => {
        setSaving(planKey);
        try {
            const d = drafts[planKey];
            await api.put(`/admin/settings/plans/${planKey}`, {
                monthlyPrice: d.monthlyPrice,
                annualPrice: d.annualPrice,
                earlyAccessPrice: d.earlyAccessPrice === undefined || isNaN(d.earlyAccessPrice as any) ? null : d.earlyAccessPrice,
                maxLobbies: d.maxLobbies,
                maxTournamentSize: d.maxTournamentSize,
                maxTournamentsPerMonth: d.maxTournamentsPerMonth,
                platformFeePercent: d.platformFeePercent,
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
                const style = PLAN_STYLES[p.plan] ?? PLAN_STYLES.STARTER;

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
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Early Access ($) - Optional</label>
                                    <Input type="number" min={0} value={d.earlyAccessPrice ?? ''} onChange={e => updateDraft(p.plan, 'earlyAccessPrice', e.target.value ? parseFloat(e.target.value) : null)} placeholder="Leave blank to disable" className="bg-black/20 border-white/10 h-8 text-sm" />
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Limits / Fees</p>
                                {[
                                    { field: 'maxLobbies' as const, label: 'Max Lobbies' },
                                    { field: 'maxTournamentSize' as const, label: 'Max Tournament Size' },
                                    { field: 'maxTournamentsPerMonth' as const, label: 'Max Tournaments/Month' },
                                ].map(({ field, label }) => (
                                    <div key={field} className="space-y-1">
                                        <label className="text-xs text-muted-foreground">{label} (-1 = unlimited)</label>
                                        <Input type="number" min={-1} value={d[field]} onChange={e => updateDraft(p.plan, field, parseInt(e.target.value))} className="bg-black/20 border-white/10 h-8 text-sm" />
                                    </div>
                                ))}
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Platform Fee Component (Decimal, e.g. 0.05)</label>
                                    <Input type="number" step="0.01" min={0} max={1} value={d.platformFeePercent ?? 0.05} onChange={e => updateDraft(p.plan, 'platformFeePercent', parseFloat(e.target.value))} className="bg-black/20 border-white/10 h-8 text-sm" />
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</p>
                                {Object.entries(d.features).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between group">
                                        <label className="text-xs">{key}</label>
                                        <div className="flex items-center gap-2">
                                            <Switch checked={!!val} onCheckedChange={v => updateFeature(p.plan, key, v)} />
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFeature(p.plan, key)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-2 pt-2 mt-2 border-t border-white/5">
                                    <Input 
                                        placeholder="New feature..." 
                                        className="bg-black/20 border-white/10 h-8 text-xs" 
                                        value={newFeatures[p.plan] || ''} 
                                        onChange={e => setNewFeatures(prev => ({...prev, [p.plan]: e.target.value}))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const featureName = newFeatures[p.plan]?.trim();
                                                if (featureName) {
                                                    addFeature(p.plan, featureName);
                                                }
                                            }
                                        }}
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 border-white/10" 
                                        onClick={() => {
                                            const featureName = newFeatures[p.plan]?.trim();
                                            if(featureName) { 
                                                addFeature(p.plan, featureName); 
                                            }
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>
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
