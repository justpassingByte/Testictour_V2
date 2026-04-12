'use client';
import { SocketProvider } from '@/components/SocketProvider';
import { NotificationProvider } from '@/components/NotificationProvider';
import { useUserStore } from '@/app/stores/userStore';

/**
 * GlobalProviders - wraps the entire app with notification context.
 * This ensures NotificationBell works in MainNav across ALL pages,
 * not just dashboard pages.
 *
 * SocketProvider connects only when a user is logged in (role is defined).
 * When role is undefined the socket won't join any room, which is fine.
 */
export function GlobalProviders({ children }: { children: React.ReactNode }) {
    const { currentUser } = useUserStore();

    return (
        <SocketProvider
            role={currentUser?.role}
            tier={(currentUser as any)?.subscriptionPlan}
            userId={currentUser?.id}
        >
            <NotificationProvider>
                {children}
            </NotificationProvider>
        </SocketProvider>
    );
}
