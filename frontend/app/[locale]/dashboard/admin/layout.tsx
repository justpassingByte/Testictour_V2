"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Trophy, Handshake, Users, Gamepad2,
  DollarSign, Settings, Menu, X, Star, Gift,
  ChevronLeft, ChevronRight, Database, ShieldAlert, Receipt, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const sidebarItems = useMemo(() => [
    { type: 'group', label: 'Dashboard' },
    { label: "Overview",      href: "/dashboard/admin",              icon: LayoutDashboard, exact: true },
    
    { type: 'group', label: 'Management' },
    { label: "Tournaments",   href: "/dashboard/admin/tournaments",  icon: Trophy },
    { label: "Partners",      href: "/dashboard/admin/partners",     icon: Handshake },
    { label: "Players",       href: "/dashboard/admin/players",      icon: Users },
    { label: "Lobbies",       href: "/dashboard/admin/lobbies",      icon: Gamepad2 },
    
    { type: 'group', label: 'Finance & Ops' },
    { label: "Revenue",       href: "/dashboard/admin/revenue",      icon: DollarSign },
    { label: "Transactions",  href: "/dashboard/admin/transactions", icon: Receipt },
    { label: "Escrow Ops",    href: "/dashboard/admin/escrow",       icon: ShieldAlert },
    { label: "Plans",         href: "/dashboard/admin/plans",        icon: Crown },
    
    { type: 'group', label: 'Engagement' },
    { label: "Achievements",  href: "/dashboard/admin/achievements", icon: Star },
    { label: "Loyalty",       href: "/dashboard/admin/loyalty",      icon: Gift },
    
    { type: 'group', label: 'System' },
    { label: "Dev Tools",     href: "/dashboard/admin/dev-tools",    icon: Database },
    { label: "Settings",      href: "/dashboard/admin/settings",     icon: Settings },
  ], []);

  const normalizedPath = pathname.replace(/^\/[a-z]{2}(?=\/)/, "");

  const isActive = (item: any) => {
    if (!item.href) return false;
    if (item.exact) return normalizedPath === item.href;
    return normalizedPath.startsWith(item.href);
  };

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <nav className="flex flex-col px-3 py-4 flex-1 overflow-x-hidden overflow-y-auto no-scrollbar">
      <div className={cn("px-3 mb-6 transition-all duration-300", isCollapsed && "opacity-0 invisible h-0 mb-0")}>
        <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent truncate">
          Admin Panel
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Manage your platform</p>
      </div>
      <div className="space-y-1">
        {sidebarItems.map((item, idx) => {
          if (item.type === 'group') {
            return (
              <div key={idx} className={cn("flex flex-row items-center gap-2 mt-6 mb-2 px-3 w-full", isCollapsed && "hidden")}>
                 <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-500/80 shadow-[0_0_5px_rgba(139,92,246,0.5)]"></div>
                 <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-slate-400 shrink-0">
                    {item.label}
                 </span>
                 <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
            );
          }
          
          if (item.label === "---") return <div key={idx} className="my-2 h-px bg-white/10 mx-3" />;
          
          const active = isActive(item);
          return (
            <Link
              key={item.href || idx}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-lg transition-all duration-200",
                isCollapsed ? "px-0 py-2.5 justify-center w-10 mx-auto" : "px-3 py-2.5 gap-3",
                active
                  ? "bg-gradient-to-r from-violet-500/15 to-cyan-500/10 text-violet-300 shadow-sm shadow-violet-500/5 border border-violet-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {item.icon && (
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    item.label === "Escrow Ops" && active ? "text-orange-400" : "",
                    active ? "text-violet-400" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
              )}
              <span className={cn("transition-all duration-300 whitespace-nowrap text-sm font-medium", isCollapsed && "opacity-0 w-0 hidden")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-white/10 bg-card/95 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300",
        isExpanded ? "w-[240px]" : "w-[64px]"
      )}>
        <div className={cn("flex items-center p-3 border-b border-white/10 shrink-0", isExpanded ? "justify-end" : "justify-center")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarContent isCollapsed={!isExpanded} />
      </aside>

      {/* Mobile toggle - moved to header below */}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-card/95 backdrop-blur-xl border-r border-white/10 animate-in slide-in-from-left duration-200 flex flex-col">
            <SidebarContent isCollapsed={false} />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-card/95 backdrop-blur-xl shrink-0 sticky top-0 z-30">
          <span className="font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Admin Panel</span>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
