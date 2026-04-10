"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Handshake,
  Users,
  Gamepad2,
  DollarSign,
  Settings,
  Menu,
  X,
  Star,
  Gift,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const sidebarItems = useMemo(() => [
    { label: t("overview", { defaultValue: "Overview" }),     href: "/dashboard/admin",              icon: LayoutDashboard, exact: true },
    { label: t("tournaments", { defaultValue: "Tournaments" }),  href: "/dashboard/admin/tournaments",  icon: Trophy },
    { label: t("partners", { defaultValue: "Partners" }),     href: "/dashboard/admin/partners",     icon: Handshake },
    { label: t("players", { defaultValue: "Players" }),      href: "/dashboard/admin/players",      icon: Users },
    { label: t("lobbies", { defaultValue: "Lobbies" }),      href: "/dashboard/admin/lobbies",      icon: Gamepad2 },
    { label: "---" },
    { label: t("revenue", { defaultValue: "Revenue" }),      href: "/dashboard/admin/revenue",      icon: DollarSign },
    { label: t("achievements_tab", { defaultValue: "Achievements" }), href: "/dashboard/admin/achievements", icon: Star },
    { label: t("loyalty_program", { defaultValue: "Loyalty" }),      href: "/dashboard/admin/loyalty",      icon: Gift },
    { label: "---" },
    { label: t("dev_tools", { defaultValue: "Dev Tools" }),          href: "/dashboard/admin/dev-tools",    icon: Database },
    { label: t("settings", { defaultValue: "Settings" }),     href: "/dashboard/admin/settings",     icon: Settings },
  ], [t]);

  // Strip locale prefix for matching (e.g. /en/dashboard/admin → /dashboard/admin)
  const normalizedPath = pathname.replace(/^\/[a-z]{2}(?=\/)/, "");

  const isActive = (item: typeof sidebarItems[0]) => {
    if (!item.href) return false;
    if (item.exact) return normalizedPath === item.href;
    return normalizedPath.startsWith(item.href);
  };

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-hidden">
      <div className={cn("px-3 mb-6 transition-all duration-300", isCollapsed && "opacity-0 invisible h-0 mb-0")}>
        <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent truncate">
          {t("admin_panel", { defaultValue: "Admin Panel" })}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t("manage_your_platform", { defaultValue: "Manage your platform" })}</p>
      </div>
      {sidebarItems.map((item, idx) => {
        if (item.label === "---") return <div key={idx} className="my-2 h-px bg-white/10 mx-3" />;
        const active = isActive(item as typeof sidebarItems[0]);
        return (
          <Link
            key={item.href}
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
    </nav>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-white/10 bg-card/95 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300",
        isExpanded ? "w-[240px]" : "w-[64px]"
      )}>
        {/* Expand/Collapse Toggle */}
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

      {/* Mobile menu toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Button
          size="icon"
          variant="default"
          className="rounded-full h-12 w-12 shadow-xl bg-violet-600 hover:bg-violet-700"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-card/95 backdrop-blur-xl border-r border-white/10 animate-in slide-in-from-left duration-200 flex flex-col">
            <SidebarContent isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
