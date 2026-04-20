"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Settings, DollarSign, Users, Trophy, BarChart3, Crown, Menu, PanelLeftClose, HandCoins, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const t = useTranslations("common");

  // If we are on the main partner page, the SPA handles its own sidebar via Tabs.
  // We don't render a double layout here to avoid breaking the existing SPA state.
  if (pathname.endsWith("/dashboard/partner")) {
    return <>{children}</>;
  }

  const navigateToTab = (tabId: string) => {
    const locale = pathname.split('/')[1] || 'en';
    router.push(`/${locale}/dashboard/partner?tab=${tabId}`);
  };

  const isActive = (tabId: string) => {
    if (tabId === 'tournaments' && pathname.includes('/tournaments')) return true;
    if (tabId === 'lobbies' && pathname.includes('/lobbies')) return true;
    return false;
  };

  // If we are deep inside a separate page (like tournament detail), we render a standalone 
  // Sidebar that looks structurally identical and acts as navigation back to the SPA.
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      {/* Standalone Sidebar */}
      <div className={`transition-all duration-300 border-r border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-lg flex flex-col ${isSidebarOpen ? 'w-64' : 'w-16'} shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          {isSidebarOpen && <span className="font-bold tracking-tight">{t("partner_panel")}</span>}
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={!isSidebarOpen ? "mx-auto" : ""}>
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex flex-col h-full bg-transparent border-0 p-2 justify-start items-start gap-1 w-full overflow-y-auto">
          {isSidebarOpen && (
            <div className="flex flex-row items-center gap-2 mt-4 mb-1 px-3 w-full">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500/80 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
              <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">{t("manage")}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
          )}
          {[
            { id: 'overview', icon: BarChart3, label: t("overview") },
            { id: 'tournaments', icon: Trophy, label: t("tournaments") },
            { id: 'lobbies', icon: Users, label: t("lobbies") },
            { id: 'team', icon: Plus, label: t("players") }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <Button 
                key={tab.id}
                variant="ghost" 
                className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 px-3 py-1.5 h-auto ${isActive(tab.id) ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'hover:bg-white/10'} font-normal`}
                onClick={() => navigateToTab(tab.id)}
              >
                <Icon className="h-4 w-4 shrink-0" /> {isSidebarOpen && tab.label}
              </Button>
            )
          })}

          {isSidebarOpen && (
            <div className="flex flex-row items-center gap-2 mt-4 mb-1 px-3 w-full">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">{t("finance_analytics")}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
          )}
          {[
            { id: 'revenue', icon: HandCoins, label: t("revenue") },
            { id: 'wallet', icon: DollarSign, label: t("wallet") },
            { id: 'analytics', icon: BarChart3, label: t("analytics") },
            { id: 'plans', icon: Crown, label: t("plans") }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <Button 
                key={tab.id}
                variant="ghost" 
                className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 px-3 py-1.5 h-auto ${isActive(tab.id) ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'hover:bg-white/10'} font-normal`}
                onClick={() => navigateToTab(tab.id)}
              >
                <Icon className="h-4 w-4 shrink-0" /> {isSidebarOpen && tab.label}
              </Button>
            )
          })}

          {isSidebarOpen && (
            <div className="flex flex-row items-center gap-2 mt-4 mb-1 px-3 w-full">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-500/80 shadow-[0_0_5px_rgba(6,182,212,0.5)]"></div>
              <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">{t("engagement_settings")}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
          )}
          {[
            { id: 'rewards', icon: Gift, label: t("rewards") },
            { id: 'achievements', icon: Star, label: t("achievements") },
            { id: 'settings', icon: Settings, label: t("settings") }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <Button 
                key={tab.id}
                variant="ghost" 
                className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 px-3 py-1.5 h-auto ${isActive(tab.id) ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'hover:bg-white/10'} font-normal`}
                onClick={() => navigateToTab(tab.id)}
              >
                <Icon className="h-4 w-4 shrink-0" /> {isSidebarOpen && tab.label}
              </Button>
            )
          })}
        </div>
      </div>
      
      {/* Main content for nested routes */}
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
