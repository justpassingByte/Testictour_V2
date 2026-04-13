"use client";

import { useState, useEffect } from "react";
import { CreditCard, Save, RefreshCw, AlertTriangle, Key, Globe, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/app/lib/apiConfig";

interface GatewaySettings {
  paymentEnv: string;
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  momoPartnerCode: string;
  momoAccessKey: string;
  momoSecretKey: string;
}

export default function GatewaysSettingsSection() {
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      // Backend /admin/settings returns ALL settings grouped by group. We will just use the general settings endpoint to get them individually
      const res = await api.get("/admin/settings");
      const st = res.data.settings;
      if (st && st.gateways) {
        const gwVals: any = {};
        st.gateways.forEach((s: any) => {
          gwVals[s.key] = s.value;
        });
        setSettings(gwVals as GatewaySettings);
      }
    } catch {
      setError("Failed to load gateway settings.");
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
      // Send updates for each key individually since no dedicated endpoint exists yet
      await Promise.all(
        Object.entries(settings).map(([key, value]) => 
          api.put(`/admin/settings/${key}`, { value })
        )
      );
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
        {[1,2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-semibold">Payment Gateways Configuration</h3>
            <p className="text-xs text-muted-foreground">Manage your payment provider API keys and environment modes.</p>
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

      {/* Global Environment Toggle */}
      <Card className="bg-zinc-900/50 border-zinc-500/20">
        <CardHeader className="pb-4">
           <div className="flex flex-row justify-between items-center">
             <CardTitle className="text-sm flex items-center gap-2">
               Gateway Environment
             </CardTitle>
             <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                {["sandbox", "production"].map(env => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setSettings(prev => prev ? { ...prev, paymentEnv: env } : prev)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                      settings?.paymentEnv === env
                        ? env === 'production' 
                          ? "bg-red-500 text-white shadow-sm" 
                          : "bg-amber-500 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {env}
                  </button>
                ))}
             </div>
          </div>
          <CardDescription className="text-xs pt-1">
             Globally switches ALL payment integrations between testing (Sandbox) and live money processing (Production).
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stripe */}
      <Card className="bg-blue-500/5 border-blue-500/15">
        <CardHeader className="pb-3 border-b border-blue-500/10">
          <div className="flex flex-row justify-between items-center">
             <CardTitle className="text-sm flex items-center gap-2">
               <Globe className="h-4 w-4 text-blue-400" />
               Stripe Connect (International)
             </CardTitle>
          </div>
          <CardDescription className="text-xs pt-1">
             Stripe API keys for Escrow funding and Subscription upgrades.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Public Key</Label>
              <Input
                type="text"
                value={settings?.stripePublicKey || ''}
                onChange={e => setSettings(p => p ? { ...p, stripePublicKey: e.target.value } : p)}
                className="bg-zinc-900/80 border-blue-500/20 focus:border-blue-400 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Secret Key</Label>
              <Input
                type="password"
                value={settings?.stripeSecretKey || ''}
                onChange={e => setSettings(p => p ? { ...p, stripeSecretKey: e.target.value } : p)}
                className="bg-zinc-900/80 border-blue-500/20 focus:border-blue-400 font-mono text-xs"
              />
            </div>
          </div>
          <div className="pt-2">
             <Label className="text-xs text-muted-foreground mb-1 block">Webhook Secret</Label>
             <Input
               type="password"
               value={settings?.stripeWebhookSecret || ''}
               onChange={e => setSettings(p => p ? { ...p, stripeWebhookSecret: e.target.value } : p)}
               className="bg-zinc-900/80 border-blue-500/20 focus:border-blue-400 font-mono text-xs"
             />
             <p className="text-[10px] text-muted-foreground mt-1">Used to automatically verify Stripe signature hooks locally. e.g. whsec_...</p>
          </div>
        </CardContent>
      </Card>

      {/* MoMo */}
      <Card className="bg-pink-500/5 border-pink-500/15">
        <CardHeader className="pb-3 border-b border-pink-500/10">
           <div className="flex flex-row justify-between items-center">
             <CardTitle className="text-sm flex items-center gap-2">
               <Wallet className="h-4 w-4 text-pink-400" />
               MoMo E-Wallet (Vietnam)
             </CardTitle>
          </div>
          <CardDescription className="text-xs pt-1">
             MoMo business integration API keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Partner Code</Label>
            <Input
              type="text"
              value={settings?.momoPartnerCode || ''}
              onChange={e => setSettings(p => p ? { ...p, momoPartnerCode: e.target.value } : p)}
              className="bg-zinc-900/80 border-pink-500/20 focus:border-pink-400 font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Access Key</Label>
              <Input
                type="password"
                value={settings?.momoAccessKey || ''}
                onChange={e => setSettings(p => p ? { ...p, momoAccessKey: e.target.value } : p)}
                className="bg-zinc-900/80 border-pink-500/20 focus:border-pink-400 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Secret Key</Label>
              <Input
                type="password"
                value={settings?.momoSecretKey || ''}
                onChange={e => setSettings(p => p ? { ...p, momoSecretKey: e.target.value } : p)}
                className="bg-zinc-900/80 border-pink-500/20 focus:border-pink-400 font-mono text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Gateway Keys"}
        </Button>
        <Button type="button" variant="outline" onClick={fetchSettings} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Reset
        </Button>
      </div>
    </form>
  );
}
