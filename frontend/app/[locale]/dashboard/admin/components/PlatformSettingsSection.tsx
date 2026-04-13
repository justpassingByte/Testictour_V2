"use client";
import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import api from "@/app/lib/apiConfig";
import { useTranslations } from "next-intl"

interface Setting { id: string; key: string; value: string; type: string; label: string; group: string; updatedBy?: string; parsedValue: any; }

export default function PlatformSettingsSection() {
    const t = useTranslations("common");
    const { toast } = useToast();
    const [grouped, setGrouped] = useState<Record<string, Setting[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [draftValues, setDraftValues] = useState<Record<string, any>>({});
    const [confirmKey, setConfirmKey] = useState<string | null>(null);

    const fetch = async () => {
        try {
            const res = await api.get("/admin/settings");
            const excludedKeys = [
                'maintenance_mode',
                'maintenance_message',
                'platform_fee',
                'escrowCommunityThresholdUsd',
                'escrowDefaultProvider',
                'escrowPlatformFeePercent',
                'escrowEnabled'
            ];
            
            const filteredGrouped: Record<string, Setting[]> = {};
            Object.entries(res.data.settings as Record<string, Setting[]>).forEach(([group, settings]) => {
                if (group === 'gateways') return; // Skip gateway settings since they have a dedicated tab

                const filtered = settings.filter(s => {
                    const k = s.key.toLowerCase();
                    return !excludedKeys.includes(s.key) && 
                           !k.includes('platform_fee') && 
                           !k.includes('escrow');
                });
                if (filtered.length > 0) {
                    filteredGrouped[group] = filtered;
                }
            });
            
            setGrouped(filteredGrouped);

            // Init drafts
            const drafts: Record<string, any> = {};
            Object.values(filteredGrouped).flat().forEach((s: Setting) => {
                drafts[s.key] = s.parsedValue;
            });
            setDraftValues(drafts);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const handleSave = async (key: string) => {
        const setting = Object.values(grouped).flat().find(s => s.key === key);
        if (!setting) return;
        // Require confirmation for financial settings
        if (setting.group === 'financial') { setConfirmKey(key); return; }
        await doSave(key);
    };

    const doSave = async (key: string) => {
        setSaving(key); setConfirmKey(null);
        try {
            await api.put(`/admin/settings/${key}`, { value: draftValues[key] });
            toast({ title: "Setting updated", description: `${key} saved successfully.` });
            fetch();
        } catch { toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" }); }
        finally { setSaving(null); }
    };

    if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">{t("loading_settings", { defaultValue: "Loading settings..." })}</div>;

    const groupLabels: Record<string, string> = { general: t("general", { defaultValue: "General" }), financial: t("financial", { defaultValue: "Financial" }), limits: t("limits", { defaultValue: "Limits" }) };

    return (
        <div className="space-y-8">
            {Object.entries(grouped).map(([group, settings]) => (
                <div key={group}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{groupLabels[group] ?? group}</h3>
                    <div className="space-y-3">
                        {settings.map(s => (
                            <div key={s.key} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{s.label}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {s.type === 'boolean' ? (
                                        <Switch
                                            checked={!!draftValues[s.key]}
                                            onCheckedChange={val => setDraftValues(prev => ({ ...prev, [s.key]: val }))}
                                        />
                                    ) : (
                                        <Input
                                            type={s.type === 'number' ? 'number' : 'text'}
                                            value={draftValues[s.key] ?? ''}
                                            onChange={e => setDraftValues(prev => ({ ...prev, [s.key]: e.target.value }))}
                                            className="w-40 bg-black/20 border-white/10 text-sm h-8"
                                        />
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-white/10 hover:bg-white/10"
                                        onClick={() => handleSave(s.key)}
                                        disabled={saving === s.key}
                                    >
                                        {saving === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    </Button>
                                    {s.group === 'financial' && <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500 bg-yellow-500/10">{t("financial", { defaultValue: "Financial" })}</Badge>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Confirmation dialog for financial settings */}
            <Dialog open={!!confirmKey} onOpenChange={() => setConfirmKey(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("confirm_financial_change", { defaultValue: "Confirm Financial Change" })}</DialogTitle>
                        <DialogDescription>
                            {t("confirm_financial_desc", { defaultValue: "You are about to change a financial setting" })} (<code className="bg-black/30 px-1.5 py-0.5 rounded">{confirmKey}</code>). {t("are_you_sure_financial", { defaultValue: "This affects revenue calculations immediately. Are you sure?" })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmKey(null)}>{t("cancel", { defaultValue: "Cancel" })}</Button>
                        <Button variant="destructive" onClick={() => confirmKey && doSave(confirmKey)}>{t("confirm_change", { defaultValue: "Confirm Change" })}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
