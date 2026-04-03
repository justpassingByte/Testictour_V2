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

interface Setting { id: string; key: string; value: string; type: string; label: string; group: string; updatedBy?: string; parsedValue: any; }

const GROUP_LABELS: Record<string, string> = { general: "General", financial: "Financial", limits: "Limits" };

export default function PlatformSettingsSection() {
    const { toast } = useToast();
    const [grouped, setGrouped] = useState<Record<string, Setting[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [draftValues, setDraftValues] = useState<Record<string, any>>({});
    const [confirmKey, setConfirmKey] = useState<string | null>(null);

    const fetch = async () => {
        try {
            const res = await api.get("/admin/settings");
            setGrouped(res.data.settings);
            // Init drafts
            const drafts: Record<string, any> = {};
            Object.values(res.data.settings as Record<string, Setting[]>).flat().forEach((s: Setting) => {
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

    if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading settings...</div>;

    return (
        <div className="space-y-8">
            {Object.entries(grouped).map(([group, settings]) => (
                <div key={group}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{GROUP_LABELS[group] ?? group}</h3>
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
                                    {s.group === 'financial' && <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500 bg-yellow-500/10">Financial</Badge>}
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
                        <DialogTitle>Confirm Financial Change</DialogTitle>
                        <DialogDescription>
                            You are about to change a financial setting (<code className="bg-black/30 px-1.5 py-0.5 rounded">{confirmKey}</code>). This affects revenue calculations immediately. Are you sure?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmKey(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmKey && doSave(confirmKey)}>Confirm Change</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
