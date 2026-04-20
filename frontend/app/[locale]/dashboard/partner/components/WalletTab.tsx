"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/app/lib/apiConfig";
import { toast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, XCircle, CreditCard, RefreshCw, AlertCircle, Copy } from "lucide-react";
import { useUserStore } from "@/app/stores/userStore";

export default function WalletTab() {
  const t = useTranslations("common.PartnerDashboard");
  const { currentUser } = useUserStore();
  const [config, setConfig] = useState({ plan: "STARTER", sepayApiKey: "", merchantId: "", secretKey: "", env: "sandbox", walletStatus: "UNCONNECTED", lastSyncAt: null as Date | null, lastError: null as string | null });
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, ledgerRes] = await Promise.all([
        api.get("/partner/wallet/config").catch(() => ({ data: {} })),
        api.get("/partner/wallet/ledger").catch(() => ({ data: null }))
      ]);
      
      let parsedConfig = { merchantId: "", secretKey: "", env: "sandbox" };
      try {
          if (configRes.data?.sepayApiKey?.startsWith("{")) {
              parsedConfig = JSON.parse(configRes.data.sepayApiKey);
          } else {
              parsedConfig.secretKey = configRes.data?.sepayApiKey || "";
          }
      } catch (e) {}

      setConfig({
          plan: configRes.data?.plan || "STARTER",
          sepayApiKey: "",
          merchantId: parsedConfig.merchantId || "",
          secretKey: parsedConfig.secretKey || "",
          env: parsedConfig.env || "sandbox",
          walletStatus: configRes.data?.walletStatus || "UNCONNECTED",
          lastSyncAt: configRes.data?.lastSyncAt || null,
          lastError: configRes.data?.lastError || null
      });
      setLedger(ledgerRes.data);
    } catch (err: any) {
      toast({ title: t("error", { defaultValue: "Error" }), description: err.response?.data?.error || t("load_wallet_error", { defaultValue: "Error loading wallet data" }), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const payload = JSON.stringify({
        merchantId: config.merchantId,
        secretKey: config.secretKey,
        env: config.env
      });
      const res = await api.post("/partner/wallet/config", { sepayApiKey: payload });
      toast({ title: t("success", { defaultValue: "Success" }), description: t("wallet_config_saved", { defaultValue: "Sepay configuration saved successfully." }) });
    } catch (err: any) {
      toast({ title: t("error", { defaultValue: "Error" }), description: err.response?.data?.error || t("save_config_error", { defaultValue: "Failed to save configuration" }), variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-black/40 border-orange-500/20">
          <div className="text-sm text-gray-400">{t("net_wallet_balance", { defaultValue: "Net Wallet Balance" })}</div>
          <div className="text-2xl font-bold text-white mt-1">
             {(ledger?.totals?.netPartnerBalance || 0).toLocaleString()} USD
          </div>
          <div className="text-xs text-orange-400/80 mt-1">{t("net_wallet_desc")}</div>
        </Card>
        <Card className="p-4 bg-black/40 border-green-500/20">
          <div className="text-sm text-gray-400">{t("collected_revenue", { defaultValue: "Collected Revenue" })}</div>
          <div className="text-2xl font-bold text-white mt-1">
             {((ledger?.totals?.incomingPlayers || 0) + (ledger?.totals?.incomingSponsors || 0)).toLocaleString()} USD
          </div>
          <div className="text-xs text-green-400/80 mt-1">{t("collected_revenue_desc")}</div>
        </Card>
        <Card className="p-4 bg-black/40 border-purple-500/20">
          <div className="text-sm text-gray-400">{t("paid_out", { defaultValue: "Paid Out" })}</div>
          <div className="text-2xl font-bold text-white mt-1">
             {((ledger?.totals?.outgoingPayouts || 0) + (ledger?.totals?.outgoingRefunds || 0)).toLocaleString()} USD
          </div>
          <div className="text-xs text-purple-400/80 mt-1">{t("paid_out_desc")}</div>
        </Card>
        <Card className={`p-4 bg-black/40 border-${['STARTER'].includes(config.plan) ? 'violet' : 'red'}-500/20`}>
          <div className="text-sm text-gray-400">{['STARTER'].includes(config.plan) ? 'Platform Fees (Escrowed)' : t("platform_fees", { defaultValue: "Pending Platform Fees" })}</div>
          <div className={`text-2xl font-bold text-${['STARTER'].includes(config.plan) ? 'violet' : 'red'}-500 mt-1`}>
             {(ledger?.totals?.totalPlatformFee || 0).toLocaleString()} USD
          </div>
          <div className={`text-xs text-${['STARTER'].includes(config.plan) ? 'violet' : 'red'}-400/80 mt-1`}>
            {['STARTER'].includes(config.plan) ? 'Automatically deducted via Escrow at Payout.' : t("platform_fees_desc")}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
        {/* Left Col: Config */}
        <div className="space-y-6 lg:col-span-1">
          {['STARTER'].includes(config.plan) ? (
            <Card className="p-6 bg-[#1a1a1a] border-white/5 space-y-4">
               <div className="flex items-center gap-2 text-white font-semibold text-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Managed by Escrow
                </div>
                <p className="text-sm text-gray-400">
                    Your ({config.plan}) subscription requires using the platform's native Escrow gateway to guarantee prize pools. Sepay integration is only available for PRO and ENTERPRISE plans.
                </p>
            </Card>
          ) : (
            <Card className="p-6 bg-[#1a1a1a] border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold text-lg">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    {t("sepay_integration", { defaultValue: "Sepay Integration" })}
                </div>
                <p className="text-sm text-gray-400">
                    Connect your Sepay webhook to automatically confirm incoming bank transfers for tournament entries.
                </p>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Environment</label>
                        <select 
                            className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-sm text-white"
                            value={config.env}
                            onChange={(e) => setConfig({ ...config, env: e.target.value })}
                        >
                            <option value="sandbox">Sandbox</option>
                            <option value="live">Live</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Merchant ID</label>
                        <Input 
                            placeholder="Your Sepay Merchant ID"
                            value={config.merchantId}
                            onChange={(e) => setConfig({ ...config, merchantId: e.target.value })}
                            className="bg-black/50 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Secret Key</label>
                        <Input 
                            type="password"
                            placeholder="Your Sepay Secret Key"
                            value={config.secretKey}
                            onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
                            className="bg-black/50 border-white/10"
                        />
                    </div>
                </div>

                <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-none"
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                >
                    {savingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t("save_configuration", { defaultValue: "Save Configuration" })}
                </Button>

                <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Status</span>
                        {config.walletStatus === "CONNECTED" ? (
                            <span className="flex items-center text-green-500"><CheckCircle className="w-4 h-4 mr-1"/> Connected</span>
                        ) : config.walletStatus === "ERROR" ? (
                            <span className="flex items-center text-red-500"><XCircle className="w-4 h-4 mr-1"/> Error</span>
                        ) : (
                            <span className="text-gray-500">Unconnected</span>
                        )}
                    </div>
                    {config.lastSyncAt && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Last Sync</span>
                            <span className="text-white">{new Date(config.lastSyncAt).toLocaleString()}</span>
                        </div>
                    )}
                    {config.lastError && (
                        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{config.lastError}</span>
                        </div>
                    )}
                </div>
            </Card>
          )}
            
            <Card className="p-6 bg-[#1a1a1a] border-white/5">
                 <h3 className="text-white font-semibold text-lg mb-2">{t("webhook_url_setup", { defaultValue: "Webhook URL Setup" })}</h3>
                 <div className="space-y-4">
                     <p className="text-sm text-gray-400">
                         {t("webhook_desc", { defaultValue: "Each partner has a completely unique Webhook URL. Copy the exact URL below and add it to the Webhook Integration section in Sepay." })}
                     </p>
                     
                     <div className="bg-black p-3 rounded text-orange-400 font-mono text-xs sm:text-sm break-all relative group cursor-pointer" onClick={() => {
                        const url = `https://api.testictour.com/api/webhooks/sepay/${currentUser?.id || 'YOUR_PARTNER_ID'}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: t("copied", { defaultValue: "Copied URL" }), description: t("copied_desc", { defaultValue: "Use this URL to paste into Sepay." }) });
                     }}>
                         https://api.testictour.com/api/webhooks/sepay/{currentUser?.id || 'YOUR_PARTNER_ID'}
                         <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-gray-400">
                             <Copy className="h-4 w-4" />
                         </div>
                     </div>
                     
                     <div className="text-xs text-gray-500 bg-white/5 p-3 rounded border border-white/10 space-y-2">
			             <p><span className="text-green-400 font-bold">{t("note_1", { defaultValue: "Note 1:" })}</span> {t("note_1_desc", { defaultValue: "Ensure your Secret Key is correct. Sepay uses this Webhook to automatically update funding and entry payments 24/7." })}</p>
                         <p><span className="text-orange-400 font-bold">{t("note_2", { defaultValue: "Note 2:" })}</span> {t("note_2_desc", { defaultValue: "You must configure this URL in Sepay. Never share your Webhook URL or Secret Key." })}</p>
                     </div>
                 </div>
            </Card>
        </div>

        {/* Right Col: Ledger */}
        <div className="lg:col-span-2">
            <Card className="p-1 bg-[#1a1a1a] border-white/5 h-full">
                <Tabs defaultValue="ledger" className="w-full">
                    <div className="flex justify-between items-center p-4 border-b border-white/10">
                        <TabsList className="bg-black">
                            <TabsTrigger value="ledger">{t("ledger_timeline")}</TabsTrigger>
                            <TabsTrigger value="payouts">{t("payouts_tab")}</TabsTrigger>
                        </TabsList>
                        <Button variant="ghost" size="icon" onClick={fetchData} className="text-gray-400 hover:text-white">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>

                    <TabsContent value="ledger" className="p-4 m-0 space-y-2 max-h-[600px] overflow-y-auto">
                        {ledger?.history?.length > 0 ? (
                            ledger.history.map((tx: any) => (
                                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-lg border border-white/5 shadow-sm transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${tx.type === 'entry_fee' || tx.type === 'escrow_deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {tx.type === 'entry_fee' || tx.type === 'escrow_deposit' ? '↓' : '↑'}
                                        </div>
                                        <div>
                                            <div className="text-sm text-white font-medium capitalize">{tx.type.replace('_', ' ')}</div>
                                            <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()} • {tx.externalRefId || 'No Ref'}</div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold ${tx.type === 'entry_fee' || tx.type === 'escrow_deposit' ? 'text-green-500' : 'text-red-500'}`}>
                                        {tx.type === 'entry_fee' || tx.type === 'escrow_deposit' ? '+' : '-'}{tx.amount.toLocaleString()} USD
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                {t("no_tx")}
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="payouts" className="p-4 m-0">
                         <div className="text-center py-10 text-gray-400 text-sm">
                                {t("no_payouts")}
                         </div>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>

      </div>
    </div>
  );
}
