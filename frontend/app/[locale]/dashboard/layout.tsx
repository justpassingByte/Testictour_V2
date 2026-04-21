"use client";

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useUserStore } from '@/app/stores/userStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentUser: user, isLoading: loading, fetchUser } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (user === null && loading) {
      fetchUser();
    }
  }, [user, loading, fetchUser]);

  useEffect(() => {
    if (user === null && !loading) {

      router.push('/?auth=login');
    } else if (user && !['admin', 'partner', 'user'].includes(user.role)) {

      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-2xl">Loading dashboard...</div>;
  }

  if (user === null) {
    return null;
  }

  // SocketProvider and NotificationProvider are now provided by GlobalProviders
  // in the root layout, so we don't need them here anymore.
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}