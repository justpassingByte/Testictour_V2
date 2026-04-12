'use client';
import {
    createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import { useSocket } from './SocketProvider';
import { useToast } from '@/components/ui/use-toast';

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    sentAt: string;
    read: boolean;
    link?: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllRead: () => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);
export const useNotifications = () => useContext(NotificationContext)!;

const STORAGE_KEY = 'testictour_notifications';
const MAX_STORED = 50;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const socket = useSocket();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Restore from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setNotifications(JSON.parse(stored));
        } catch {
            // ignore parse errors
        }
    }, []);

    // Persist to localStorage on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
    }, [notifications]);

    // Listen for incoming socket events
    useEffect(() => {
        if (!socket) return;

        const handler = (data: { id: string; title: string; body: string; sentAt: string; link?: string }) => {
            const newNotif: AppNotification = { ...data, read: false };
            setNotifications(prev => [newNotif, ...prev].slice(0, MAX_STORED));
            toast({ 
                title: data.title, 
                description: data.body,
                onClick: () => {
                    if (data.link) {
                        window.location.href = data.link; // simple navigation from outside setup
                    }
                }
            });
        };

        socket.on('admin_notification', handler);
        return () => { socket.off('admin_notification', handler); };
    }, [socket, toast]);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}
