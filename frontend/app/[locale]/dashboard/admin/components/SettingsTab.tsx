"use client";
import { Bell, Settings, Flag, AlertTriangle, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import dynamic from "next/dynamic";

const LoadingSection = () => <div className="py-8 text-center text-muted-foreground">Loading...</div>;

const PushNotificationsSection = dynamic(() => import("./PushNotificationsSection"), { loading: LoadingSection });
const PlatformSettingsSection = dynamic(() => import("./PlatformSettingsSection"), { loading: LoadingSection });
const FeatureFlagsSection = dynamic(() => import("./FeatureFlagsSection"), { loading: LoadingSection });
const MaintenanceModeSection = dynamic(() => import("./MaintenanceModeSection"), { loading: LoadingSection });
const SubscriptionPlanConfigSection = dynamic(() => import("./SubscriptionPlanConfigSection"), { loading: LoadingSection });

export default function SettingsTab() {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
      <CardHeader>
        <CardTitle>Platform Settings</CardTitle>
        <CardDescription>
          Configure notifications, platform defaults, feature flags, maintenance mode, and subscription plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent h-auto p-0 overflow-x-auto no-scrollbar">
            <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Bell className="mr-2 h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="platform" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Settings className="mr-2 h-4 w-4" /> Platform
            </TabsTrigger>
            <TabsTrigger value="flags" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Flag className="mr-2 h-4 w-4" /> Feature Flags
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <AlertTriangle className="mr-2 h-4 w-4" /> Maintenance
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Crown className="mr-2 h-4 w-4" /> Plans
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="notifications" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Notifications section"><PushNotificationsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="platform" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Platform Settings"><PlatformSettingsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="flags" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Feature Flags"><FeatureFlagsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="maintenance" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Maintenance Mode"><MaintenanceModeSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="plans" className="mt-0">
              <SectionErrorBoundary fallbackTitle="Failed to load Subscription Plans"><SubscriptionPlanConfigSection /></SectionErrorBoundary>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}