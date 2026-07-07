"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// import PlayerDashboardClient from "./components/PlayerDashboardClient"
import { useUserStore } from "@/app/stores/userStore";

export default function DashboardPage() {
  const { currentUser, isLoading, initializeUser } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    // Ensure user data is fetched
    if (!currentUser && !isLoading) {
      initializeUser();
    }

    if (!isLoading && currentUser) {
      // User data is available, redirect based on role
      switch (currentUser.role) {
        case 'admin':
          router.push('/dashboard/admin');
          break;
        case 'partner':
          router.push('/dashboard/partner');
          break;
        case 'user':
          router.push('/dashboard/player');
          break;
        default:
          router.push('/');
          break;
      }
    } else if (!isLoading && currentUser === null) {
      // User is not authenticated, redirect to home/login
      router.push('/?auth=login');
    }
  }, [currentUser, isLoading, initializeUser, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-2xl">Loading dashboard...</div>;
  }

  if (!currentUser) {
    // If not loading and no user, it means they were redirected by useEffect
    return null; // Or a simple spinner to prevent flickering
  }

  if (currentUser.role === 'user') {
    router.push('/dashboard/player'); // Explicitly redirect to the player dashboard page
    return null; // Stop rendering this page
  }

  // If user is not 'user' role, they would have been redirected by useEffect
  // This case should ideally not be reached if redirects work as expected.
  return null;
}
