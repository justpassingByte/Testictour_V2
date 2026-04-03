"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import api from "@/app/lib/apiConfig";

export default function MaintenanceModeSection() {
    const { toast } = useToast();
    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState("We are currently under scheduled maintenance. Please check back soon.");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/admin/settings")
            .then(res => {
                const allSettings = Object.values(res.data.settings as Record<string, any[]>).flat();
                const modeSetting = allSettings.find((s: any) => s.key === 'maintenance_mode');
                const msgSetting = allSettings.find((s: any) => s.key === 'maintenance_message');
                if (modeSetting) setEnabled(modeSetting.parsedValue === true || modeSetting.value === 'true');
                if (msgSetting) setMessage(msgSetting.value);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/admin/settings/maintenance_mode", { value: enabled });
            await api.put("/admin/settings/maintenance_message", { value: message });
            toast({
                title: enabled ? "🔧 Maintenance mode ON" : "✅ Maintenance mode OFF",
                description: enabled ? "Users will see the maintenance message." : "Platform is live again.",
            });
        } catch {
            toast({ title: "Error", description: "Failed to update maintenance settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>;

    return (
        <div className="space-y-6 max-w-xl">
            {/* Status card */}
            <div className={cn(
                "flex items-center justify-between p-5 rounded-xl border transition-colors",
                enabled ? "bg-red-500/10 border-red-500/30" : "bg-black/20 border-white/5"
            )}>
                <div className="flex items-center gap-3">
                    <AlertTriangle className={cn("h-5 w-5", enabled ? "text-red-400" : "text-muted-foreground")} />
                    <div>
                        <p className="font-semibold text-sm">Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground">
                            {enabled ? "Platform is in maintenance — all users see the maintenance page." : "Platform is live and accessible."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge
                        variant="outline"
                        className={enabled
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-green-500/10 text-green-400 border-green-500/20"
                        }
                    >
                        {enabled ? "ON" : "OFF"}
                    </Badge>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
            </div>

            {/* Message editor */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Maintenance Message</label>
                <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Message shown to users during maintenance..."
                    className="bg-black/20 border-white/10 resize-none"
                    rows={4}
                />
                <p className="text-xs text-muted-foreground">This message is displayed to users when maintenance mode is active.</p>
            </div>

            <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
            </Button>
        </div>
    );
}
