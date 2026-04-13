"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Save, RefreshCw, AlertTriangle, DollarSign, Percent, CreditCard, Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import api from "@/app/lib/apiConfig";

interface EscrowSettings {
  escrowCommunityThresholdUsd: number;
  escrowDefaultProvider: string;
  escrowPlatformFeePercent: number;
  escrowManualProofEnabled: boolean;
  escrowWebhookSecret: string;
}

export default function EscrowSettingsSection() {
  const [settings, setSettings] = useState<EscrowSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/settings/escrow");
      setSettings(res.data.settings || res.data.data || res.data);
    } catch {
      setError("Failed to load escrow settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      await api.put("/admin/settings/escrow", settings);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold">Escrow & Payment Settings</h3>
            <p className="text-xs text-muted-foreground">Control how tournament escrow behaves platform-wide.</p>
          </div>
        </div>
        {savedAt && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
            Saved at {savedAt}
          </Badge>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Community Threshold */}
      <Card className="bg-orange-500/5 border-orange-500/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Community Mode Threshold
          </CardTitle>
          <CardDescription className="text-xs">
            Tournaments with a total prize pool <strong>below this value</strong> are classified as &ldquo;Community Mode&rdquo; — they bypass escrow and players are warned that payouts are not platform-secured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-orange-400 shrink-0" />
            <div className="flex-1">
              <Label htmlFor="threshold" className="text-xs text-muted-foreground mb-1 block">Threshold (USD)</Label>
              <Input
                id="threshold"
                type="number"
                min={0}
                step={10}
                value={settings?.escrowCommunityThresholdUsd ?? 100}
                onChange={e => setSettings(prev => prev ? { ...prev, escrowCommunityThresholdUsd: parseFloat(e.target.value) } : prev)}
                className="bg-zinc-900/80 border-orange-500/30 focus:border-orange-400 max-w-[200px]"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Currently: <span className="font-mono font-bold text-orange-400">${settings?.escrowCommunityThresholdUsd ?? 100}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Fee */}
      <Card className="bg-purple-500/5 border-purple-500/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="h-4 w-4 text-purple-400" />
            Platform Fee Rate
          </CardTitle>
          <CardDescription className="text-xs">
            Percentage of participant entry fees retained as platform service fee, applied in settlement calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Percent className="h-4 w-4 text-purple-400 shrink-0" />
            <div className="flex-1">
              <Label htmlFor="feePercent" className="text-xs text-muted-foreground mb-1 block">Fee % (0.00 – 1.00)</Label>
              <Input
                id="feePercent"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={settings?.escrowPlatformFeePercent ?? 0.1}
                onChange={e => setSettings(prev => prev ? { ...prev, escrowPlatformFeePercent: parseFloat(e.target.value) } : prev)}
                className="bg-zinc-900/80 border-purple-500/30 focus:border-purple-400 max-w-[200px]"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Effective rate: <span className="font-mono font-bold text-purple-400">{((settings?.escrowPlatformFeePercent ?? 0.1) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Provider */}
      <Card className="bg-blue-500/5 border-blue-500/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-400" />
            Default Payment Provider
          </CardTitle>
          <CardDescription className="text-xs">
            The payment method organizers see by default when funding escrow. Partners can choose at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {["stripe", "momo"].map(provider => (
              <button
                key={provider}
                type="button"
                onClick={() => setSettings(prev => prev ? { ...prev, escrowDefaultProvider: provider } : prev)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize ${
                  settings?.escrowDefaultProvider === provider
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                    : "bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {provider === "stripe" ? "🌐 Stripe (International)" : "🇻🇳 MoMo (Vietnam)"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Proof Review */}
      <Card className="bg-zinc-500/5 border-zinc-500/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              Manual Proof Review
            </div>
            <Switch
              checked={settings?.escrowManualProofEnabled ?? true}
              onCheckedChange={val => setSettings(prev => prev ? { ...prev, escrowManualProofEnabled: val } : prev)}
            />
          </CardTitle>
          <CardDescription className="text-xs">
            Allow partners to upload screenshots of bank transfers for manual admin review if a payment gateway fails or is unavailable.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Webhook Secret */}
      <Card className="bg-red-500/5 border-red-500/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-400" />
            Internal Escrow Webhook Secret
          </CardTitle>
          <CardDescription className="text-xs">
            Shared secret key that secures webhook callbacks between the backend transaction processor and escrow state manager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Input
                type={showSecret ? "text" : "password"}
                value={settings?.escrowWebhookSecret || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, escrowWebhookSecret: e.target.value } : prev)}
                className="bg-zinc-900/80 border-red-500/30 focus:border-red-400 font-mono text-xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Escrow Settings"}
        </Button>
        <Button type="button" variant="outline" onClick={fetchSettings} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Reset
        </Button>
      </div>
    </form>
  );
}
