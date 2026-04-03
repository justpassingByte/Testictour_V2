"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import api from "@/app/lib/apiConfig";
import { formatDistanceToNow } from "date-fns";

interface FeatureFlag { id: string; key: string; enabled: boolean; description: string; updatedAt: string; updatedBy?: string; }

export default function FeatureFlagsSection() {
    const { toast } = useToast();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        api.get("/admin/settings/flags")
            .then(res => setFlags(res.data.flags))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = async (key: string, newValue: boolean) => {
        // Optimistic update
        setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: newValue } : f));
        setToggling(key);
        try {
            await api.put(`/admin/settings/flags/${key}`, { enabled: newValue });
        } catch {
            // Rollback
            setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !newValue } : f));
            toast({ title: "Error", description: "Failed to update feature flag.", variant: "destructive" });
        } finally {
            setToggling(null);
        }
    };

    if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading feature flags...</div>;
    if (flags.length === 0) return <div className="py-8 text-center text-muted-foreground text-sm">No feature flags configured.</div>;

    return (
        <div className="space-y-3">
            {flags.map(flag => (
                <div key={flag.key} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{flag.key}</p>
                            <Badge
                                variant="outline"
                                className={flag.enabled
                                    ? "text-[10px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/20"
                                    : "text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20"
                                }
                            >
                                {flag.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        {flag.updatedAt && (
                            <p className="text-xs text-muted-foreground/50 mt-1">
                                Updated {formatDistanceToNow(new Date(flag.updatedAt), { addSuffix: true })}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {toggling === flag.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        <Switch
                            checked={flag.enabled}
                            onCheckedChange={val => handleToggle(flag.key, val)}
                            disabled={toggling === flag.key}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
