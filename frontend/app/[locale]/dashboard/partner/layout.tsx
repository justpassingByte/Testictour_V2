"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Settings, DollarSign, Users, Trophy, BarChart3, Crown, Menu, PanelLeftClose, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // If we are on the main partner page, the SPA handles its own sidebar via Tabs.
  // We don't render a double layout here to avoid breaking the existing SPA state.
  if (pathname.endsWith("/dashboard/partner")) {
    return <>{children}</>;
  }

  // If we are deep inside a separate page (like tournament detail), we render a standalone 
  // Sidebar that looks structurally identical and acts as navigation back to the SPA.
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      {/* Standalone Sidebar */}
      <div className={`transition-all duration-300 border-r border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-lg flex flex-col ${isSidebarOpen ? 'w-64' : 'w-16'} shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          {isSidebarOpen && <span className="font-bold tracking-tight">Partner Panel</span>}
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={!isSidebarOpen ? "mx-auto" : ""}>
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex flex-col h-full bg-transparent border-0 p-2 justify-start items-start gap-2 w-full">
          {[
            { id: 'overview', icon: BarChart3, label: 'Overview' },
            { id: 'tournaments', icon: Trophy, label: 'Tournaments' },
            { id: 'lobbies', icon: Users, label: 'Lobbies' },
            { id: 'team', icon: Plus, label: 'Players' },
            { id: 'revenue', icon: HandCoins, label: 'Revenue' },
            { id: 'analytics', icon: DollarSign, label: 'Analytics' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(tab => {
            const Icon = tab.icon;
            // Highlight 'tournaments' randomly as active if we are in tournament detail
            const isActive = pathname.includes('/tournaments') && tab.id === 'tournaments';
            return (
              <Button 
                key={tab.id}
                variant="ghost" 
                className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 px-3 py-1.5 h-auto ${isActive ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'hover:bg-white/10'} font-normal`}
                onClick={() => router.push(`/dashboard/partner?tab=${tab.id}`)}
              >
                <Icon className="h-4 w-4 shrink-0" /> {isSidebarOpen && tab.label}
              </Button>
            )
          })}

          <div className="my-2 h-px bg-white/10 w-full" />

          <Button 
            variant="ghost"
            className={`w-full ${isSidebarOpen ? "justify-start" : "justify-center"} gap-3 px-3 py-1.5 h-auto text-yellow-500 hover:bg-yellow-500/10 font-normal`}
            onClick={() => router.push(`/dashboard/partner?tab=plans`)}
          >
            <Crown className="h-4 w-4 shrink-0" /> {isSidebarOpen && "Plans & Billing"}
          </Button>
        </div>
      </div>
      
      {/* Main content for nested routes */}
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
