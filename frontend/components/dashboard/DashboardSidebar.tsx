import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Trophy, Gamepad2, Settings, Gift, DoorClosed, User, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/app/stores/userStore";
import { useTranslations } from 'next-intl';
interface DashboardSidebarProps {
  userRole: string;
}

const getNavItems = (t: any) => ({
  admin: [
    { href: "/dashboard/admin", label: t("dashboard.admin.overview") || "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/dashboard/admin/users", label: t("dashboard.admin.users") || "Users", icon: <Users className="h-5 w-5" /> },
    { href: "/dashboard/admin/tournaments", label: t("dashboard.admin.tournaments") || "Tournaments", icon: <Trophy className="h-5 w-5" /> },
    { href: "/dashboard/admin/minitours", label: t("dashboard.admin.minitours") || "Mini Tours", icon: <Gamepad2 className="h-5 w-5" /> },
    { href: "/dashboard/admin/analytics", label: t("dashboard.admin.analytics") || "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/dashboard/admin/settings", label: t("dashboard.admin.settings") || "Settings", icon: <Settings className="h-5 w-5" /> },
  ],
  partner: [
    { href: "/dashboard/partner", label: t("dashboard.partner.overview") || "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/dashboard/partner/tournaments", label: t("dashboard.partner.tournaments") || "Tournaments", icon: <Trophy className="h-5 w-5" /> },
    { href: "/dashboard/partner/minitours", label: t("dashboard.partner.minitours") || "Mini Tours", icon: <Gamepad2 className="h-5 w-5" /> },
    { href: "/dashboard/partner/rewards", label: t("dashboard.partner.rewards") || "Rewards", icon: <Gift className="h-5 w-5" /> },
    { href: "/dashboard/partner/profile", label: t("dashboard.partner.profile") || "Profile", icon: <User className="h-5 w-5" /> },
    { href: "/dashboard/partner/analytics", label: t("dashboard.partner.analytics") || "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/dashboard/partner/settings", label: t("dashboard.partner.settings") || "Settings", icon: <Settings className="h-5 w-5" /> },
  ],
  player: [
    { href: "/dashboard/player", label: t("dashboard.player.overview") || "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/dashboard/player/tournaments", label: t("dashboard.player.tournaments") || "Tournaments", icon: <Trophy className="h-5 w-5" /> },
    { href: "/dashboard/player/profile", label: t("dashboard.player.profile") || "Profile", icon: <User className="h-5 w-5" /> },
    { href: "/dashboard/player/rewards", label: t("dashboard.player.rewards") || "Rewards", icon: <Gift className="h-5 w-5" /> },
  ],
  user: [
    { href: "/dashboard/player", label: t("dashboard.player.overview") || "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/dashboard/player/tournaments", label: t("dashboard.player.tournaments") || "Tournaments", icon: <Trophy className="h-5 w-5" /> },
    { href: "/dashboard/player/profile", label: t("dashboard.player.profile") || "Profile", icon: <User className="h-5 w-5" /> },
    { href: "/dashboard/player/rewards", label: t("dashboard.player.rewards") || "Rewards", icon: <Gift className="h-5 w-5" /> },
  ],
});

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('common');
  const { clearUser } = useUserStore();

  const navItems = getNavItems(t);

  const validRoles = Object.keys(navItems);
  const effectiveUserRole = validRoles.includes(userRole) ? userRole : 'player';

  const filteredNavItems = navItems[effectiveUserRole as keyof typeof navItems] || [];

  return (
    <aside className="w-64 bg-background border-r p-4 flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("dashboard.title") || "Dashboard"}</h2>
      </div>
      <nav className="flex-1 space-y-2">
        {filteredNavItems.map((item) => {
          const isOverviewLink = item.href === `/dashboard/${effectiveUserRole}`;
          const isActive = isOverviewLink
            ? pathname === item.href // Đối với link Overview, chỉ active khi match chính xác
            : pathname.startsWith(item.href); // Đối với các link khác, active khi bắt đầu bằng item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary pl-[10px] font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Button variant="ghost" className="w-full justify-start" onClick={async () => await clearUser()}>
          <DoorClosed className="mr-3 h-5 w-5" />
          {t("dashboard.logout") || "Logout"}
        </Button>
      </div>
    </aside>
  );
} 