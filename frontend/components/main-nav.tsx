"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, Gift, Menu, X, BarChart3, Gamepad2, LayoutDashboard, UserCircle } from "lucide-react"
import { useEffect } from "react"

import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslations, useLocale } from 'next-intl'
import { useAuthModalStore } from '@/app/stores/authModalStore'
import { AuthModal } from '@/components/auth/AuthModal'
import { useUserStore } from '@/app/stores/userStore';
import { NotificationBell } from '@/components/NotificationBell';

interface NavItem {
  label: string
  href: string
  disabled?: boolean
  icon: React.ReactNode;
}

interface MainNavProps {
  items?: NavItem[]
}

export function MainNav({
}: MainNavProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()
  const locale = useLocale();
  const t = useTranslations('common');
  const { openModal } = useAuthModalStore()
  const { currentUser, clearUser } = useUserStore();



  const toggleMenu = () => setIsOpen(!isOpen)

  // Fetch user data on component mount
  useEffect(() => {
    // Only fetch if user is not already set and not loading
    if (!currentUser) {
      useUserStore.getState().initializeUser();
    }
  }, [currentUser]); // Re-run if user state changes

  const navItems: NavItem[] = [
    {
      href: "/",
      label: t("home"),
      icon: <Home className="h-5 w-5" />,
    },
    {
      href: "/tournaments",
      label: t("tournaments"),
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      href: "/minitour",
      label: t("Mini Tour"),
      icon: <Gamepad2 className="h-5 w-5" />,
    },
    {
      href: "/loyalty",
      label: t("loyalty", { defaultValue: 'Rewards' }),
      icon: <Gift className="h-5 w-5" />,
    },
    {
      href: "/leaderboard",
      label: t("leaderboard"),
      icon: <BarChart3 className="h-5 w-5" />,
    },
    ...(currentUser ? [
      ...(currentUser.role === 'admin' || currentUser.role === 'partner' ? [{
        href: "/dashboard",
        label: t("Dashboard"),
        icon: <LayoutDashboard className="h-5 w-5" />,
      }] : []),
      ...(currentUser.role === 'user' ? [{
        href: `/players/${currentUser.id}`,
        label: t("profile", { defaultValue: 'Profile' }),
        icon: <UserCircle className="h-5 w-5" />,
      }] : []),
    ] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-transparent backdrop-blur supports-[backdrop-filter]:bg-transparent">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center mr-6 gap-2">
            <img src="/logo.png" alt="TesTicTour Logo" className="h-8 w-8 object-contain rounded-md" />
            <span className="text-2xl font-bold tracking-tighter gradient-text">TesTicTour</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <TooltipProvider key={item.href} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{item.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-2">
          <LanguageToggle />
          <ModeToggle />

          {/* Notification bell — only for logged-in users */}
          {currentUser && <NotificationBell />}

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
            {isOpen ? <X /> : <Menu />}
          </Button>

          {currentUser ? (
            <Button
              variant="ghost"
              className="text-sm md:text-base font-bold mr-2 md:mr-4 hidden md:flex"
              onClick={async () => await clearUser()}
            >
              {t("header.logout")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-sm md:text-base font-bold mr-2 md:mr-4 hidden md:flex"
              onClick={() => openModal('login')}
            >
              {t("header.login")}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? "block" : "hidden"} py-4 px-6 space-y-2 bg-transparent border-b`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 py-2 text-base font-medium transition-colors hover:text-primary",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              onClick={() => setIsOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
        <div className="pt-4 mt-2 border-t border-border">
          {currentUser ? (
            <Button
              variant="outline"
              className="w-full font-bold justify-center"
              onClick={async () => {
                setIsOpen(false);
                await clearUser();
              }}
            >
              {t("header.logout")}
            </Button>
          ) : (
            <Button
              variant="default"
              className="w-full font-bold justify-center"
              onClick={() => {
                setIsOpen(false);
                openModal('login');
              }}
            >
              {t("header.login")}
            </Button>
          )}
        </div>
      </div>

      <AuthModal />
    </header>
  )
}
