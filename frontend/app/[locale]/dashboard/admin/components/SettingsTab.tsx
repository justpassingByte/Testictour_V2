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
import { useTranslations } from "next-intl"

export default function SettingsTab() {
  const t = useTranslations("common")
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
      <CardHeader>
        <CardTitle>{t("platform_settings", { defaultValue: "Platform Settings" })}</CardTitle>
        <CardDescription>
          {t("platform_settings_desc", { defaultValue: "Configure notifications, platform defaults, feature flags, maintenance mode, and subscription plans." })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent h-auto p-0 overflow-x-auto no-scrollbar">
            <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Bell className="mr-2 h-4 w-4" /> {t("notifications", { defaultValue: "Notifications" })}
            </TabsTrigger>
            <TabsTrigger value="platform" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Settings className="mr-2 h-4 w-4" /> {t("platform", { defaultValue: "Platform" })}
            </TabsTrigger>
            <TabsTrigger value="flags" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Flag className="mr-2 h-4 w-4" /> {t("feature_flags", { defaultValue: "Feature Flags" })}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <AlertTriangle className="mr-2 h-4 w-4" /> {t("maintenance", { defaultValue: "Maintenance" })}
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              <Crown className="mr-2 h-4 w-4" /> {t("plans", { defaultValue: "Plans" })}
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="notifications" className="mt-0">
              <SectionErrorBoundary fallbackTitle={t("failed_to_load_notifications", { defaultValue: "Failed to load Notifications section" })}><PushNotificationsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="platform" className="mt-0">
              <SectionErrorBoundary fallbackTitle={t("failed_to_load_platform", { defaultValue: "Failed to load Platform Settings" })}><PlatformSettingsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="flags" className="mt-0">
              <SectionErrorBoundary fallbackTitle={t("failed_to_load_flags", { defaultValue: "Failed to load Feature Flags" })}><FeatureFlagsSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="maintenance" className="mt-0">
              <SectionErrorBoundary fallbackTitle={t("failed_to_load_maintenance", { defaultValue: "Failed to load Maintenance Mode" })}><MaintenanceModeSection /></SectionErrorBoundary>
            </TabsContent>
            <TabsContent value="plans" className="mt-0">
              <SectionErrorBoundary fallbackTitle={t("failed_to_load_plans", { defaultValue: "Failed to load Subscription Plans" })}><SubscriptionPlanConfigSection /></SectionErrorBoundary>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}