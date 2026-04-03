'use client';
import { formatDistanceToNow } from 'date-fns';
import { BellOff, CheckCheck, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, AppNotification } from './NotificationProvider';
import { cn } from '@/lib/utils';

interface NotificationDrawerProps {
    open: boolean;
    onClose: () => void;
}

export function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
    const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotifications();

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                    {unreadCount} new
                                </Badge>
                            )}
                        </SheetTitle>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-muted-foreground h-7 px-2">
                                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                    Mark all read
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 h-7 px-2">
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                            <BellOff className="h-10 w-10 opacity-30" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((n) => (
                                <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

function NotificationItem({
    notification: n,
    onRead,
}: {
    notification: AppNotification;
    onRead: (id: string) => void;
}) {
    return (
        <div
            className={cn(
                'flex gap-3 px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors',
                !n.read && 'bg-blue-500/5 border-l-2 border-l-blue-500'
            )}
            onClick={() => onRead(n.id)}
        >
            <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium leading-tight', !n.read && 'text-white')}>
                    {n.title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-xs text-muted-foreground/60 mt-1.5">
                    {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
                </p>
            </div>
            {!n.read && (
                <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
        </div>
    );
}
