"use client";
import { Bell, Settings, Flag, AlertTriangle, Crown, ShieldCheck, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import dynamic from "next/dynamic";

const LoadingSection = () => <div className="py-8 text-center text-muted-foreground">Loading…</div>;

const PushNotificationsSection = dynamic(() => import("./PushNotificationsSection"), { loading: LoadingSection });
const PlatformSettingsSection = dynamic(() => import("./PlatformSettingsSection"), { loading: LoadingSection });
const FeatureFlagsSection = dynamic(() => import("./FeatureFlagsSection"), { loading: LoadingSection });
const MaintenanceModeSection = dynamic(() => import("./MaintenanceModeSection"), { loading: LoadingSection });
const SubscriptionPlanConfigSection = dynamic(() => import("./SubscriptionPlanConfigSection"), { loading: LoadingSection });
const EscrowSettingsSection = dynamic(() => import("./EscrowSettingsSection"), { loading: LoadingSection });
const GatewaysSettingsSection = dynamic(() => import("./GatewaysSettingsSection"), { loading: LoadingSection });

export default function SettingsTab() {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
      <CardHeader>
        <CardTitle>Platform Settings</CardTitle>
        <CardDescription>
          Configure notifications, platform defaults, feature flags, maintenance mode, subscription plans, and escrow policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent h-auto p-0 overflow-x-auto no-scrollbar">
            <TabsTrigger value="system" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Settings className="mr-2 h-4 w-4" /> System
            </TabsTrigger>
            <TabsTrigger value="escrow" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" /> Escrow
            </TabsTrigger>
            <TabsTrigger value="gateways" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <CreditCard className="mr-2 h-4 w-4 text-blue-400" /> Gateways
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="system" className="mt-0 space-y-12">
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Platform Configuration</h3>
                  <SectionErrorBoundary fallbackTitle="Failed to load Platform Settings"><PlatformSettingsSection /></SectionErrorBoundary>
              </div>
              <div className="border-t border-white/10 pt-8 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Flag className="h-5 w-5" /> Global Feature Flags</h3>
                  <SectionErrorBoundary fallbackTitle="Failed to load Feature Flags"><FeatureFlagsSection /></SectionErrorBoundary>
              </div>
              <div className="border-t border-white/10 pt-8 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications & Maintenance</h3>
                  <SectionErrorBoundary fallbackTitle="Failed to load Notifications section"><PushNotificationsSection /></SectionErrorBoundary>
              </div>
            </TabsContent>
            <TabsContent value="escrow" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Escrow Settings"><EscrowSettingsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="gateways" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Gateway Settings"><GatewaysSettingsSection /></SectionErrorBoundary>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}